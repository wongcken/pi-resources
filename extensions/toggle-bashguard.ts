import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";

// ANSI color codes for terminal output
const colors = {
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  white: (s: string) => `\x1b[37m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
};

// State entry type for persistence
const GUARDRAIL_STATE_TYPE = "toggle-bashguard-state";

export default function (pi: ExtensionAPI) {
  // Track approved dangerous commands by their toolCallId
  const approvedCommands = new Map<string, { command: string; patterns: string }>();

  // Guardrail enabled state - defaults to true, loaded from session
  let isEnabled = true;

  // BLOCKING_PATTERNS: Require user confirmation before execution
  const BLOCKING_PATTERNS = [
    { pattern: /rm\s+-[a-zA-Z]*[rf]/i, name: "rm -rf (recursive delete)" },
    { pattern: /sudo\s/i, name: "sudo command" },
    { pattern: /dd\s+if=/i, name: "dd (disk write)" },
    { pattern: /mkfs\./i, name: "mkfs (filesystem format)" },
    { pattern: /:\(\)\{\s*:\|:&\s*\};/, name: "fork bomb" },
    { pattern: /chmod\s.*7{3}/i, name: "chmod 777 (world-writable)" },
    { pattern: /chmod\s.*[0-9]*[2367][0-9]{2}/i, name: "chmod with world-writable bits" },
    { pattern: /chown\s/i, name: "chown (ownership change)" },
    { pattern: /curl\s.*\|\s*(ba)?sh/i, name: "curl | sh (remote code execution)" },
    { pattern: /wget\s.*\|\s*(ba)?sh/i, name: "wget | sh (remote code execution)" },
    { pattern: /kill\s+-9/i, name: "kill -9 (force kill)" },
    { pattern: /killall/i, name: "killall (mass process termination)" },
    { pattern: /shred\s/i, name: "shred (secure deletion)" },
    { pattern: /truncate\s/i, name: "truncate (file resizing)" },
    { pattern: />\s*\/etc\//i, name: "redirect write to /etc/" },
    { pattern: />\s*\/boot\//i, name: "redirect write to /boot/" },
    { pattern: /mv\s+[^\s]+\s+\//i, name: "mv to root-level path" },
  ];

  // NOTIFY_PATTERNS: Warn but do not block execution
  const NOTIFY_PATTERNS = [
    { pattern: />\s*\/dev\/null/, name: "output redirect to /dev/null" },
  ];

  // Restore state from session entries
  pi.on("session_start", async (_event, ctx) => {
    // Look for persisted state in session entries
    const entries = ctx.sessionManager.getEntries();
    for (const entry of entries) {
      if (entry.type === "custom" && entry.customType === GUARDRAIL_STATE_TYPE) {
        const state = entry.data as { enabled: boolean } | undefined;
        if (state && typeof state.enabled === "boolean") {
          isEnabled = state.enabled;
        }
      }
    }

    // Notify user of current state
    const statusText = isEnabled
      ? colors.green("ENABLED") + colors.gray(" (use /guard to disable)")
      : colors.red("DISABLED") + colors.gray(" (use /guard to enable)");

    ctx.ui.notify(
      colors.cyan("🛡️  Bash guardrail loaded") + " - " + statusText,
      "info"
    );
  });

  // Register /guard toggle command
  pi.registerCommand("guard", {
    description: "Toggle bash guardrail protection on/off",
    handler: async (_args, ctx) => {
      // Toggle the state
      isEnabled = !isEnabled;

      // Persist state to session
      pi.appendEntry(GUARDRAIL_STATE_TYPE, { enabled: isEnabled });

      // Show confirmation
      if (isEnabled) {
        ctx.ui.notify(
          colors.green("🛡️  Guardrail ENABLED") +
            "\n" +
            colors.white("Dangerous commands will now prompt for approval"),
          "success"
        );
      } else {
        ctx.ui.notify(
          colors.red("⚠️  Guardrail DISABLED") +
            "\n" +
            colors.yellow("Dangerous commands will execute without confirmation"),
          "warning"
        );
      }
    },
  });

  pi.on("tool_call", async (event, ctx) => {
    // Only intercept bash tool calls
    if (!isToolCallEventType("bash", event)) {
      return;
    }

    // If guardrail is disabled, skip all checks
    if (!isEnabled) {
      return;
    }

    const command = event.input.command;
    const cwd = ctx.cwd;

    // Check NOTIFY_PATTERNS first - warn but do not block
    const notifyMatches = NOTIFY_PATTERNS.filter((p) => p.pattern.test(command));
    if (notifyMatches.length > 0) {
      const patternNames = notifyMatches.map((p) => p.name).join(", ");
      const notifyMessage =
        colors.yellow("⚠️ ") + " " +
        colors.white("Command ") +
        colors.cyan(`"${command}"`) +
        " " +
        colors.white("matches pattern: ") +
        colors.yellow(patternNames);
      ctx.ui.notify(notifyMessage, "info");
      // Allow execution to proceed
      return;
    }

    // Check BLOCKING_PATTERNS - require user confirmation
    const matchedPatterns = BLOCKING_PATTERNS.filter((p) => p.pattern.test(command));

    if (matchedPatterns.length === 0) {
      // Command is safe, allow it to proceed
      return;
    }

    // Command is dangerous - prompt for confirmation with colored details
    const patternNames = matchedPatterns.map((p) => p.name).join(", ");

    const approved = await ctx.ui.confirm(
      colors.yellow("⚠️  Dangerous Command Detected"),
      colors.white("The following command requires approval:\n\n") +
        colors.white("Directory: ") +
        colors.cyan(cwd) +
        "\n" +
        colors.white("Command: ") +
        colors.bold(colors.red(command)) +
        "\n\n" +
        colors.white("Detected patterns: ") +
        colors.yellow(patternNames) +
        "\n\n" +
        colors.white("Allow this command to execute?")
    );

    if (!approved) {
      // User denied - block the command with colored output
      const rejectionMessage =
        colors.red("❌ BLOCKED:") +
        " " +
        colors.white("User rejected dangerous command ") +
        colors.yellow(`"${command}"`) +
        " " +
        colors.cyan(`(${patternNames})`);

      ctx.ui.notify("Command rejected by user", "error");

      return {
        block: true,
        reason: rejectionMessage,
      };
    }

    // User approved - show approval and let it proceed
    const approvalNotifyMessage =
      colors.green("✅ APPROVED:") +
      " " +
      colors.white("User allowed dangerous command ") +
      colors.yellow(`"${command}"`) +
      " " +
      colors.cyan(`(${patternNames})`);
    ctx.ui.notify(approvalNotifyMessage, "success");

    // Store approval info for the tool_result handler using toolCallId
    approvedCommands.set(event.toolCallId, { command, patterns: patternNames });
  });

  // Add approval info to successful tool results
  pi.on("tool_result", async (event, ctx) => {
    if (event.toolName !== "bash") {
      return;
    }

    // Check if this was an approved dangerous command
    const approvalInfo = approvedCommands.get(event.toolCallId);
    if (approvalInfo) {
      // Clean up the tracking
      approvedCommands.delete(event.toolCallId);

      // Build the guardrail notice with colors
      const guardrailNotice =
        colors.bold(colors.green("🛡️ GUARDRAIL:")) +
        " " +
        colors.white("Command ") +
        colors.yellow(`"${approvalInfo.command}"`) +
        " " +
        colors.white("approved by user") +
        " " +
        colors.cyan(`(${approvalInfo.patterns})`);

      // Get existing text or use empty string
      const existingText = event.content?.find((c) => c.type === "text")?.text || "";

      // Combine guardrail notice with existing output
      const newText = existingText
        ? `${guardrailNotice}\n${colors.white("---")}\n${existingText}`
        : guardrailNotice;

      return {
        content: [{ type: "text", text: newText }],
        details: {
          ...event.details,
          guardrail: {
            approved: true,
            patterns: approvalInfo.patterns,
            command: approvalInfo.command,
          },
        },
      };
    }
  });

  // Clean up tracking on session end
  pi.on("session_shutdown", async () => {
    approvedCommands.clear();
  });
}

/**
 * Autoprompt UV Extension - Single Reminder Per Session
 *
 * Detects pip/poetry/conda/pipenv/venv/pyenv commands ONCE per session and reminds about uv-python skill.
 * Non-blocking, non-repeating: triggers at most one time per conversation.
 * Only activates if uv-python skill is available.
 *
 * Install to ~/.pi/agent/extensions/autoprompt-uv.ts
 */

import type { ExtensionAPI, ToolCallEvent, ExtensionContext } from "@mariozechner/pi-coding-agent";

// Detect ANY non-uv Python toolchain usage
function detectPythonTool(command: string): { tool: string; uv: string } | null {
  // Skip if using legitimate uv commands (uv pip, uv run, uv add, etc. are valid uv subcommands)
  if (/^uv\s+/.test(command) || command.includes(" uv ")) {
    // These are uv's own subcommands, not legacy tools being invoked
    const uvSubcommands = ['pip', 'run', 'add', 'remove', 'sync', 'lock', 'venv', 'init', 'build', 'publish', 'tool', 'python'];
    const isUvSubcommand = uvSubcommands.some(sub => 
      new RegExp(`uv\\s+${sub}\\b`).test(command)
    );
    if (isUvSubcommand) return null;
  }

  // Skip if already using uv (and not mixing with others)
  if (command.includes("uv ") && !command.match(/\b(pip|poetry|conda|pipenv|venv|virtualenv|pyenv|python -m venv)\b/)) return null;

  // Match ANY alternative Python tool commands (including "python -m pip" patterns)
  if (/\bpip\s+/.test(command) || /\bpython3?\s+-m\s+pip\b/.test(command)) return { tool: "pip", uv: "uv" };
  if (/\bpoetry\s+/.test(command)) return { tool: "poetry", uv: "uv" };
  if (/\bconda\s+/.test(command)) return { tool: "conda", uv: "uv" };
  if (/\bpipenv\s+/.test(command)) return { tool: "pipenv", uv: "uv" };
  if (/\bpython3?\s+-m\s+venv\b/.test(command)) return { tool: "python -m venv", uv: "uv venv" };
  if (/\bvirtualenv\s+/.test(command)) return { tool: "virtualenv", uv: "uv venv" };
  if (/\bpyenv\s+/.test(command)) return { tool: "pyenv", uv: "uv" };

  return null;
}

export default function (pi: ExtensionAPI) {
  // Track if skill is available (checked in session_start when runtime is ready)
  let skillAvailable = false;
  // Track if we've already triggered the reminder this session
  let hasReminded = false;

  pi.on("session_start", async (_event, ctx) => {
    // Check if skill is available - must do this here when runtime is initialized
    skillAvailable = pi.getCommands().some(c => c.name === "skill:uv-python");
    // Reset reminder state for new session
    hasReminded = false;
  });

  pi.on("tool_call", async (event: ToolCallEvent, ctx: ExtensionContext) => {
    // Skip if skill not available or already reminded
    if (!skillAvailable || hasReminded) return;

    // Only check bash tool calls
    if (event.toolName !== "bash" || !event.input.command) return;

    const detected = detectPythonTool(event.input.command);
    if (!detected) return;

    // Mark as reminded - this is the ONE time we trigger
    hasReminded = true;

    // Notification message (user only)
    ctx.ui.notify(`Detected "${detected.tool}". Triggered autoprompt-uv.`, "info");

    // Queue a single follow-up message for the LLM to see after current turn
    pi.sendUserMessage(
      `Detected "${detected.tool}". Please trigger \`/skill:uv-python\`.`,
      { deliverAs: "steer" }
    );
  });
}

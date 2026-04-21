/**
 * Autoprompt Pnpm Extension - Single Reminder Per Session
 *
 * Detects npm/yarn/bun/npx/nvm/fnm/volta commands ONCE per session and reminds about pnpm-js skill.
 * Non-blocking, non-repeating: triggers at most one time per conversation.
 * Only activates if pnpm-js skill is available.
 *
 * Install to ~/.pi/agent/extensions/autoprompt-pnpm.ts
 */

import type { ExtensionAPI, ToolCallEvent, ExtensionContext } from "@mariozechner/pi-coding-agent";

// Detect ANY non-pnpm JS toolchain usage (package managers + Node version managers)
function detectJsTool(command: string): { tool: string; pnpm: string } | null {
  // Skip if already using pnpm (and not mixing with others)
  if (command.includes("pnpm ") && !command.match(/\b(npm|yarn|bun|npx|nvm|fnm|volta)\b/)) return null;

  // Match ANY npm command (install, list, config, view, outdated, etc.)
  if (/\bnpm\s+/.test(command)) return { tool: "npm", pnpm: "pnpm" };
  if (/\bnpx\s+/.test(command)) return { tool: "npx", pnpm: "pnpm" };
  if (/\byarn\s+/.test(command)) return { tool: "yarn", pnpm: "pnpm" };
  if (/\bbun\s+/.test(command)) return { tool: "bun", pnpm: "pnpm" };

  // Match Node version managers (nvm, fnm, volta)
  if (/\bnvm\s+/.test(command)) return { tool: "nvm", pnpm: "pnpm env" };
  if (/\bfnm\s+/.test(command)) return { tool: "fnm", pnpm: "pnpm env" };
  if (/\bvolta\s+/.test(command)) return { tool: "volta", pnpm: "pnpm env" };

  return null;
}

export default function (pi: ExtensionAPI) {
  // Track if skill is available (checked in session_start when runtime is ready)
  let skillAvailable = false;
  // Track if we've already triggered the reminder this session
  let hasReminded = false;

  pi.on("session_start", async (_event, ctx) => {
    // Check if skill is available - must do this here when runtime is initialized
    skillAvailable = pi.getCommands().some(c => c.name === "skill:pnpm-js");
    // Reset reminder state for new session
    hasReminded = false;
  });

  pi.on("tool_call", async (event: ToolCallEvent, ctx: ExtensionContext) => {
    // Skip if skill not available or already reminded
    if (!skillAvailable || hasReminded) return;

    // Only check bash tool calls
    if (event.toolName !== "bash" || !event.input.command) return;

    const detected = detectJsTool(event.input.command);
    if (!detected) return;

    // Mark as reminded - this is the ONE time we trigger
    hasReminded = true;

    // Notification message (user only)
    ctx.ui.notify(`Detected "${detected.tool}". Triggered autoprompt-pnpm.`, "info");

    // Queue a single follow-up message for the LLM to see after current turn
    pi.sendUserMessage(
      `Detected "${detected.tool}". Please trigger \`/skill:pnpm-js\`.`,
      { deliverAs: "steer" }
    );
  });
}

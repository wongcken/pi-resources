/**
 * Read-Only Mode Extension
 *
 * Adds a /ro command to toggle read-only mode.
 * In read-only mode, only safe tools (read, grep, find, ls) are available.
 * This prevents accidental file modifications during code review or exploration.
 *
 * When toggling modes, a system message is injected into chat history to inform
 * both the user and the LLM about the current tool restrictions.
 *
 * Usage:
 *   /ro              - Toggle read-only mode on/off
 *   /ro status       - Show current mode and available tools
 *
 * The mode persists across session reloads and is stored in the session file.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { createReadOnlyTools, createCodingTools } from "@mariozechner/pi-coding-agent";

// Get current working directory for tool creation
const cwd = process.cwd();

// Tools allowed in read-only mode (derived from pi coding agent package)
const READONLY_TOOLS = createReadOnlyTools(cwd).map((t) => t.name);
// Coding tools set when not in read-only mode (derived from pi coding agent package)
const CODING_TOOLS = createCodingTools(cwd).map((t) => t.name);
const CUSTOM_TYPE = "toggle-readonly";
const STATUS_ID = "toggle-readonly";

// State (reconstructed from session on load)
let isReadOnlyMode = false;
let originalTools: string[] | null = null;

export default function toggleReadonlyExtension(pi: ExtensionAPI) {
	// Restore state from current branch only (faster than getEntries)
	function restoreFromBranch(ctx: ExtensionContext) {
		const branchEntries = ctx.sessionManager.getBranch();

		for (let i = branchEntries.length - 1; i >= 0; i--) {
			const entry = branchEntries[i];
			if (entry.type === "custom" && entry.customType === CUSTOM_TYPE) {
				isReadOnlyMode = entry.data?.enabled ?? false;
				originalTools = entry.data?.originalTools ?? null;
				break;
			}
		}

		if (isReadOnlyMode) {
			applyReadOnlyMode(ctx, false);
		} else {
			updateStatusIndicator(ctx);
		}
	}

	// Restore on session start and tree navigation
	pi.on("session_start", async (_event, ctx) => {
		restoreFromBranch(ctx);
	});

	pi.on("session_tree", async (_event, ctx) => {
		restoreFromBranch(ctx);
	});

	// Register the /ro command (toggle + status)
	pi.registerCommand("ro", {
		description: "Toggle read-only mode: /ro | Check status: /ro status",
		getArgumentCompletions: (prefix) => {
			const options = ["status"];
			const filtered = options.filter((opt) => opt.startsWith(prefix));
			return filtered.length > 0
				? filtered.map((opt) => ({ value: opt, label: opt }))
				: null;
		},
		handler: async (args, ctx) => {
			const arg = args.trim().toLowerCase();

			// Status check - show expected tools based on mode
			if (arg === "status") {
				const expectedTools = isReadOnlyMode ? READONLY_TOOLS : CODING_TOOLS;
				const status = isReadOnlyMode ? "ON 🔒" : "OFF";
				ctx.ui.notify(`Read-only: ${status} | Tools: ${expectedTools.join(", ")}`, "info");
				return;
			}

			// Toggle mode (no args or unrecognized args)
			if (isReadOnlyMode) {
				restoreFullMode(ctx, true);
			} else {
				applyReadOnlyMode(ctx, true);
			}
		},
	});

	function applyReadOnlyMode(ctx: ExtensionContext, notify: boolean) {
		// Save current tools if not already saved (must have tools AND not already be readonly-only)
		if (!originalTools || originalTools.length === 0) {
			const currentTools = pi.getActiveTools();
			// Only save if we have actual tools and not just the readonly set
			const hasWriteAccess = currentTools.some(t => ["write", "edit", "bash"].includes(t));
			if (currentTools.length > 0 && hasWriteAccess) {
				originalTools = currentTools;
			} else {
				// Use full default set if current tools are incomplete
				originalTools = CODING_TOOLS;
			}
		}

		// Apply read-only tool set (NO write, edit, or bash)
		pi.setActiveTools(READONLY_TOOLS);
		isReadOnlyMode = true;

		// Persist state
		pi.appendEntry(CUSTOM_TYPE, {
			enabled: true,
			originalTools,
			timestamp: Date.now(),
		});

		updateStatusIndicator(ctx);

		if (notify) {
			// Inject a persistent message to chat history (visible to both user and agent)
			pi.sendMessage({
				customType: CUSTOM_TYPE,
				content: `🔒 Read-only mode enabled. Available tools: ${READONLY_TOOLS.join(", ")}`,
				display: true, // Shown in TUI chat history
			});
		}
	}

	function restoreFullMode(ctx: ExtensionContext, notify: boolean) {
		// Validate originalTools - must be non-null, non-empty, and have write access
		const hasValidOriginal = originalTools && 
			originalTools.length > 0 && 
			originalTools.some(t => ["write", "edit", "bash"].includes(t));
		
		const toolsToRestore = hasValidOriginal
			? originalTools
			: CODING_TOOLS;

		pi.setActiveTools(toolsToRestore);
		isReadOnlyMode = false;

		// Persist state (preserve valid originalTools for future restores)
		pi.appendEntry(CUSTOM_TYPE, {
			enabled: false,
			originalTools: toolsToRestore, // Save the restored tools as the new baseline
			timestamp: Date.now(),
		});

		updateStatusIndicator(ctx);

		if (notify) {
			// Inject a persistent message to chat history (visible to both user and agent)
			pi.sendMessage({
				customType: CUSTOM_TYPE,
				content: `🔓 Coding mode restored. Available tools: ${toolsToRestore.join(", ")}`,
				display: true, // Shown in TUI chat history
			});
		}
	}

	function updateStatusIndicator(ctx: ExtensionContext) {
		if (isReadOnlyMode) {
			ctx.ui.setStatus(STATUS_ID, "🔒 Read-Only");
		} else {
			ctx.ui.setStatus(STATUS_ID, undefined);
		}
	}
}

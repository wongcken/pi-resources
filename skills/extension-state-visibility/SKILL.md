---
name: extension-state-visibility
description: Apply best practices when creating Pi extensions that modify tool availability, system behavior, or user permissions. Use when building extensions with read-only modes, tool toggles, guardrails, sandbox modes, or elevated access controls. Ensures state changes are visible to both user and agent.
---

# Extension State Visibility Best Practices

When your Pi extension modifies system state (tool availability, permissions, guardrails), you must make these changes **explicitly visible** to both the user and the LLM agent. Do not rely on implicit signals.

## The Problem

By default, when an extension restricts tools (e.g., enables read-only mode), the agent may not realize it. The agent only sees missing tools in the "Available tools" list and must infer the restriction. This leads to:
- Confusion about why tools are unavailable
- Wasted turns trying to use disabled tools
- Inconsistent behavior across sessions

## The Solution

**Inject a persistent message into chat history whenever state changes.**

This message must be:
- ✅ Visible in the TUI chat history (so users see mode changes)
- ✅ Sent to the LLM context (so the agent knows its constraints)
- ✅ Concise and clear
- ✅ Shown once per state change (not every turn)

## Implementation Pattern

Use `pi.sendMessage()` when state changes:

```typescript
// When enabling read-only mode
pi.sendMessage({
    customType: "my-extension",
    content: "🔒 Read-only mode enabled (no write/edit/bash)",
    display: true, // Visible in TUI
});

// When restoring full mode
pi.sendMessage({
    customType: "my-extension",
    content: "🔓 Full mode restored",
    display: true,
});
```

## Best Practices Checklist

### 1. Explicit Over Implicit
❌ **Don't:** Rely on the agent noticing missing tools
✅ **Do:** Explicitly state the restriction

### 2. Notify Once Per Change
❌ **Don't:** Use `before_agent_start` to inject on every turn
✅ **Do:** Use `pi.sendMessage()` once when toggling

### 3. Symmetric Notifications
❌ **Don't:** Only notify when entering restricted mode
✅ **Do:** Notify both when entering AND exiting modes

### 4. Consolidated Messaging
❌ **Don't:** Show `ui.notify()` popup + separate history message
✅ **Do:** Single `sendMessage()` visible to both parties

### 5. Concise Content
❌ **Don't:** "🔒 READ-ONLY MODE ACTIVE: You can only use safe tools..."
✅ **Do:** "🔒 Read-only mode enabled (no write/edit/bash)"

## Common Scenarios

| Scenario | Entry Message | Exit Message |
|----------|--------------|--------------|
| Read-only mode | 🔒 Read-only mode enabled (no write/edit/bash) | 🔓 Full mode restored |
| Tool guardrails | 🛡️ Guardrails enabled (confirming dangerous commands) | ⚠️ Guardrails disabled |
| Sandbox mode | 📦 Sandbox mode active (isolated filesystem) | 🌐 Sandbox exited |
| Elevated access | ⚡ Sudo mode active (30min timeout) | 🔒 Sudo mode expired |

## Anti-Patterns to Avoid

### Per-Turn Injection
```typescript
// ❌ DON'T: Injects on EVERY turn while in mode
pi.on("before_agent_start", async () => {
    if (isReadOnly) {
        return { message: { content: "🔒 Read-only..." } };
    }
});
```

This spams the context window with duplicate messages. The agent only needs to be told once.

### Silent State Changes
```typescript
// ❌ DON'T: No visibility at all
function applyReadOnly() {
    pi.setActiveTools(READONLY_TOOLS);
    // Nothing else!
}
```

The user sees no indication, and the agent doesn't know it's restricted.

### Asymmetric Notifications
```typescript
// ❌ DON'T: Only notify when entering
if (enable) {
    pi.sendMessage({ content: "🔒 Read-only on" });
}
// No message when disabling!
```

The agent may continue behaving cautiously even after full access is restored.

## Complete Example: Read-Only Toggle

```typescript
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

const READONLY_TOOLS = ["read", "grep", "find", "ls"];
const FULL_TOOLS = ["read", "bash", "edit", "write", "grep", "find", "ls"];

export default function (pi: ExtensionAPI) {
    let isReadOnly = false;
    let originalTools: string[] | null = null;

    pi.registerCommand("ro", {
        description: "Toggle read-only mode",
        handler: async (_args, ctx) => {
            if (isReadOnly) {
                // Restore full mode
                pi.setActiveTools(originalTools ?? FULL_TOOLS);
                isReadOnly = false;
                
                // ✅ Notify both user and agent (once)
                pi.sendMessage({
                    customType: "readonly-toggle",
                    content: "🔓 Full mode restored",
                    display: true,
                });
            } else {
                // Enable read-only
                originalTools = pi.getActiveTools().map(t => t.name);
                pi.setActiveTools(READONLY_TOOLS);
                isReadOnly = true;
                
                // ✅ Notify both user and agent (once)
                pi.sendMessage({
                    customType: "readonly-toggle",
                    content: "🔒 Read-only mode enabled (no write/edit/bash)",
                    display: true,
                });
            }
        },
    });
}
```

## Summary

When your extension modifies system state:

1. **Notify explicitly** — Don't rely on implicit signals
2. **Notify once** — When state changes, not per-turn
3. **Notify symmetrically** — Both entering and exiting
4. **Consolidate** — Single message for user and agent
5. **Be concise** — Clear, brief status messages

This ensures both the user and the LLM agent have clear, persistent awareness of the current system state.

---
name: surf-workflow
description: Always run `surf workflow.list` before using raw surf cli. And check this customised guide on how agents should create new surf workflow.
---

# Check Workflows First

**Use existing workflows when available.** Only build raw command sequences if no workflow fits.

**User workflows location:** `~/.surf/workflows/`

See the official `surf` skill for full CLI documentation and workflow syntax.

---

## Creating New Workflows

When creating surf workflows, follow **single responsibility** and **separation of concerns**:

- **One workflow = one purpose.** Don't combine unrelated tasks (e.g., don't mix "Gemini query" with "debug recovery").
- **Keep debugging separate.** Create standalone `debug-*` workflows for recovery/escalation patterns.
- **Keep query workflows pure.** A "query X" workflow should only query, not handle error recovery.
- **Compose at runtime.** Use `surf do debug-page-recovery` first, then retry the main workflow.

**Example structure:**
```
~/.surf/workflows/
├── gemini-fast-model-query.json    # Query only
├── debug-page-recovery.json        # Recovery only
└── my-app-login.json               # Login flow only
```

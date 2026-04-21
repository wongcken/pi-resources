---
name: surf-debug-chrome
description: Debug and recover surf CLI connection to Chrome browser. Use when surf commands fail with "Connection refused", "Native host not running", "No active tab", or any surf-related Chrome connectivity issues. Handles extension process crashes, profile mismatches, and native messaging host problems.
---

# Surf Debug Chrome

Diagnose and recover surf CLI connection issues with Chrome browser.

## When to Use

Trigger this skill when the user experiences:
- `Error: Connection refused. Native host not running.`
- `Error: No active tab found` (when Chrome is clearly running)
- Surf commands hang or timeout
- Surf was working before but suddenly stopped
- Any surf connectivity issues after Chrome has been running for a while (e.g., 1+ hours)

**Pattern to recognize:** Surf worked in a previous session, Chrome stayed open, now surf fails. This usually means the extension process crashed or was suspended while the browser kept running.

## Understanding the Problem

Surf uses a multi-component architecture:

```
Surf CLI → /tmp/surf.sock → host.cjs → Chrome Extension → Chrome Browser
```

Common failure modes:
1. **Extension process crashed** - Chrome extension runs in a separate renderer process that can crash while browser stays running
2. **Profile mismatch** - Native messaging host config in wrong Chrome profile
3. **Socket stale** - /tmp/surf.sock exists but extension not listening
4. **Chrome not started with surf extension** - Extension not installed or disabled

## Debug Process

### Step 1: Check Current State
Always start by checking what's actually happening:

```bash
# Check if surf socket exists
ls -la /tmp/surf.sock

# Check if Chrome is running
pgrep -x "Google Chrome"

# Check which profile has surf extension
find ~/Library/Application\ Support/Google/Chrome -name "Preferences" -exec grep -l "cmcmdnajppdfghcejohkojcgpdcednnn" {} \;
```

### Step 2: Determine Root Cause

**Case A: No /tmp/surf.sock and Chrome running**
→ Extension process dead, needs Chrome restart

**Case B: /tmp/surf.sock exists but connection refused**
→ Host running but extension not connected, needs Chrome restart

**Case C: Surf connects but "No active tab"**
→ Working! Just need to create a tab first

**Case D: Surf commands work but are slow**
→ Run the diagnose-connection surf workflow

### Step 3: Execute Recovery

Use the bundled recovery script:

```bash
bash /Users/cken/.pi/agent/skills/surf-debug-chrome/scripts/recover-chrome-connection.sh
```

This script will:
1. Detect which Chrome profile has the surf extension installed
2. Check if native messaging host is configured for that profile
3. Copy the host config if missing
4. Restart Chrome with the correct profile
5. Test the surf connection

### Step 4: Verify Fix

After recovery, verify surf is working:

```bash
surf tab.list
surf navigate "https://example.com"
```

## Surf Workflow Integration

There's a companion surf workflow for diagnosing healthy connections:

```bash
surf do diagnose-connection
```

Run this when surf IS connected but behaving strangely (slow, timing out).

## Prevention

If connection issues recur:
1. Add Chrome restart to session startup routine
2. Check Chrome Task Manager (Shift+Esc) for extension process status
3. Run `surf do diagnose-connection` periodically

## Chrome Profile Structure

MacOS Chrome profiles are stored at:
- `~/Library/Application Support/Google/Chrome/Default/`
- `~/Library/Application Support/Google/Chrome/Profile 2/`
- etc.

Each profile has its own:
- Extensions (in `Extensions/` subfolder)
- Native messaging hosts (in `NativeMessagingHosts/` subfolder)
- Extension settings (in `Local Extension Settings/`)

The surf extension data is in `Local Extension Settings/cmcmdnajppdfghcejohkojcgpdcednnn/`

## Key Files

- `/tmp/surf.sock` - Unix domain socket for CLI-to-host communication
- `/tmp/surf-host.log` - Host process log for debugging
- `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/surf.browser.host.json` - Chrome native messaging manifest
- `~/Library/Application Support/surf-cli/host-wrapper.sh` - Host launcher script

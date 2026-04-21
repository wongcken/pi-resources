---
name: sync-packages
description: Check third-party-packages.txt against settings.json and install any missing packages.
---

You are helping me keep my Pi third-party packages in sync.

## Your task

1. Read the file at `~/.pi/agent/git/github.com/wongcken/pi-resources/third-party-packages.txt`
2. Read the file at `~/.pi/agent/settings.json`
3. Parse the `packages` array from settings.json
4. For each line in third-party-packages.txt that is not blank and does not start with `#`:
   - Check whether an entry matching that package identifier already exists in the `packages` array
   - If it is missing, run: `pi install <identifier>`
5. After processing all lines, report:
   - How many packages were already installed (no action taken)
   - Which packages were newly installed
   - Whether any install commands failed and what the error was

Do not remove or modify any existing entries in settings.json.
Do not install the personal repo itself (git:github.com/wongcken/pi-resources) if it appears in the list; it is assumed to already be installed.

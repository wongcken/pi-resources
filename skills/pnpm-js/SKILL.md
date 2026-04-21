---
name: pnpm-js
description: INTERCEPT and REPLACE any npm, yarn, bun, npx, nvm, fnm, or volta commands with pnpm equivalents. When you see npm install, npm install -g, yarn add, npx, bun install, nvm install, fnm use, volta install, or any JavaScript package manager or Node version manager command mentioned in instructions, STOP and use pnpm instead.
---

# pnpm JavaScript Management

**Default to pnpm for all JavaScript/Node.js operations.**

## Priority

When managing JavaScript/TypeScript repositories, use **pnpm** as the primary tool:

- **Project initialization**: `pnpm init` (not `npm init` or `yarn init`)
- **Dependencies**: `pnpm add` / `pnpm remove` (not `npm install` or `yarn add`)
- **Running scripts**: `pnpm run` (not `npm run`)
- **Executing packages**: `pnpm exec` or `pnpm dlx` (not `npx`)
- **Global packages**: `pnpm add -g` (not `npm install -g`)
- **Lock files**: `pnpm-lock.yaml` (not `package-lock.json` or `yarn.lock`)
- **Workspaces**: `pnpm -r` / `pnpm --filter` (not `lerna` or `yarn workspaces`)

## Key Commands

```bash
# Project initialization
pnpm init                           # Initialize new project
pnpm init @vitejs/app              # Initialize from template

# Dependencies
pnpm add <package>                  # Add dependency
pnpm add -D <package>              # Add dev dependency
pnpm add -g <package>              # Add global package
pnpm remove <package>              # Remove dependency
pnpm update <package>              # Update package
pnpm install                        # Install all deps (frozen by default in CI)

# Running and executing
pnpm run dev                        # Run script
pnpm exec <command>                # Execute package binary (like npx but faster)
pnpm dlx <package>                 # Download and execute one-time
pnpm node                          # Run Node.js with pnpm's PATH

# Workspaces (monorepos)
pnpm -r install                    # Install all workspace packages
pnpm --filter <package> run build  # Run script in specific package
pnpm -r run build                  # Run in all packages (topological order)

# Advanced
pnpm why <package>                 # Show why package is installed
pnpm list                          # List installed packages
pnpm store prune                   # Clean unused packages from store
```

## Why pnpm

- **Fast**: Content-addressable store, hard links, no duplication
- **Disk efficient**: Shared dependencies across projects (saves 70%+ space)
- **Strict**: No phantom dependencies - only what's in package.json is accessible
- **Workspace-native**: Built-in monorepo support with filtering and topological execution
- **Deterministic**: `pnpm-lock.yaml` with content hashes ensures exact installs
- **Replacement for multiple tools**: Replaces npm, yarn, npx, and Node.js version managers (nvm, fnm, volta) via `pnpm env`

## Node.js Version Management

Use `pnpm env` instead of nvm, fnm, or volta for managing Node.js versions:

```bash
# Install and activate a specific version
pnpm env use --global 20
pnpm env use --global lts
pnpm env use --global latest

# Install without activating
pnpm env add --global 18 20 22

# List installed versions
pnpm env list

# List available versions
pnpm env list --remote

# Remove versions
pnpm env remove --global 18
```

**Always prefer `pnpm env` over other Node version managers** when pnpm is available in the environment.

## Replacements

| Instead of | Use |
|------------|-----|
| `npm install` | `pnpm install` |
| `npm i <pkg>` | `pnpm add <pkg>` |
| `npm run <script>` | `pnpm <script>` (no `run` needed for common scripts) |
| `npx <pkg>` | `pnpm exec <pkg>` or `pnpm dlx <pkg>` |
| `npm install -g <pkg>` | `pnpm add -g <pkg>` |
| `yarn add <pkg>` | `pnpm add <pkg>` |
| `lerna bootstrap` | `pnpm install` |
| `lerna run build` | `pnpm -r run build` |
| `nvm install 20` / `nvm use 20` | `pnpm env use --global 20` |
| `fnm install 20` / `fnm use 20` | `pnpm env use --global 20` |
| `volta install node@20` | `pnpm env use --global 20` |

## Fallbacks

Only use alternatives if:
- The project explicitly uses Yarn/npm with existing lock files
- The user specifically requests another tool
- pnpm is unavailable in the environment

## Monorepo Workflows

```bash
# Root commands
pnpm install                       # Install all workspace deps
pnpm -r publish                    # Publish all packages

# Targeted commands
pnpm --filter web-app run dev      # Dev server for specific app
pnpm --filter @scope/lib run build # Build specific library
pnpm --parallel run lint           # Run in all packages in parallel

# Dependencies between workspace packages
pnpm --filter web-app add @scope/ui # Add local workspace package
```

## Reminder

**Always check for `pnpm-lock.yaml` first. Use `pnpm exec` instead of `npx`.**
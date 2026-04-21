---
name: deepwiki-github
description: Fetch the latest documentation, architecture details, and AI-powered insights about any GitHub repository using the DeepWiki MCP server via mcp2cli. Use when the user asks about a GitHub repo's documentation, architecture, codebase structure, or wants to ask questions about how a specific repository works. Triggers on requests like "tell me about repo X", "how does Y work", "explain the architecture of Z", "fetch docs for GitHub repo", or when the user mentions a GitHub repository and needs current information about it.
---

# DeepWiki GitHub Repository Documentation Skill

This skill connects to the DeepWiki MCP server via `mcp2cli` to fetch comprehensive, AI-generated documentation about any GitHub repository.

## When to Use This Skill

Use this skill when the user:
- Asks about a GitHub repository's documentation, structure, or architecture
- Wants to understand how a specific codebase works
- Needs up-to-date information about a project's internals
- Wants to explore topics within a repository
- Asks questions like "how does X work in repo Y" or "explain the architecture of Z"

## Connection Details

- **MCP Server URL**: `https://mcp.deepwiki.com/mcp`
- **Tool**: `mcp2cli` (must be installed as `uv tool`)

## Available Tools

### 1. `read-wiki-structure`
Lists all documentation topics and sections available for a GitHub repository.

**Arguments:**
- `--repo-name`: GitHub repository in "owner/repo" format (e.g., `facebook/react`)

**Usage:**
```bash
mcp2cli --mcp https://mcp.deepwiki.com/mcp --pretty read-wiki-structure --repo-name "owner/repo"
```

### 2. `read-wiki-contents`
Views specific documentation sections from a repository's wiki.

**Arguments:**
- `--repo-name`: GitHub repository in "owner/repo" format
- `--page`: Page/topic number or path to read (optional)

**Usage:**
```bash
mcp2cli --mcp https://mcp.deepwiki.com/mcp --pretty read-wiki-contents --repo-name "owner/repo" [--page "1.2"]
```

### 3. `ask-question`
Ask any question about a GitHub repository and get an AI-powered, context-aware answer.

**Arguments:**
- `--repo-name`: GitHub repository in "owner/repo" format
- `--question`: The question to ask about the repository

**Usage:**
```bash
mcp2cli --mcp https://mcp.deepwiki.com/mcp --pretty ask-question --repo-name "owner/repo" --question "What is the architecture?"
```

## Workflow

### Step 1: Identify the Repository
Extract the GitHub repository name from the user's request. Common formats:
- `facebook/react`
- `https://github.com/owner/repo`
- "the react repo" → `facebook/react`
- "vercel/next.js" → `vercel/next.js`

If unclear, ask the user to confirm the exact repository name.

### Step 2: Determine the Best Tool
- If user wants a **topic overview** → Use `read-wiki-structure`
- If user wants to **read specific docs** → Use `read-wiki-contents`
- If user asks a **specific question** → Use `ask-question`

### Step 3: Execute and Present Results
Always use `--pretty` flag for readable output. Present the results in a clean, structured format.

## Examples

**Example 1: Get repository structure**
```bash
mcp2cli --mcp https://mcp.deepwiki.com/mcp --pretty read-wiki-structure --repo-name "facebook/react"
```

**Example 2: Ask about architecture**
```bash
mcp2cli --mcp https://mcp.deepwiki.com/mcp --pretty ask-question --repo-name "facebook/react" --question "How does the Fiber architecture work?"
```

**Example 3: Read specific section**
```bash
mcp2cli --mcp https://mcp.deepwiki.com/mcp --pretty read-wiki-contents --repo-name "facebook/react" --page "4.1"
```

## Notes

- The DeepWiki MCP server provides AI-generated documentation based on the repository's codebase
- All arguments use kebab-case (e.g., `--repo-name`, not `--repoName`)
- The `--pretty` flag ensures formatted, readable output
- Repository names must use the exact GitHub "owner/repo" format

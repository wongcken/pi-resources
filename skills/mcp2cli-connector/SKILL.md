---
name: mcp2cli-connector
description: Use when the user wants to connect to an MCP server, OpenAPI specification, GraphQL endpoint, or any API that exposes tools/endpoints. This skill guides the agent to use mcp2cli as the universal CLI bridge instead of direct SDK integration or custom code. Triggers on phrases like "connect to MCP", "use MCP server", "OpenAPI spec", "GraphQL API", "API tools", or when the user mentions tool discovery, API integration, or wants to expose API endpoints as CLI commands.
---

# mcp2cli Connector Skill

This skill directs the agent to use **mcp2cli** — the universal CLI bridge for MCP servers, OpenAPI specs, and GraphQL endpoints — instead of writing custom integration code or using direct SDK calls.

## When to Use mcp2cli

Use mcp2cli when:
- The user mentions an **MCP server** URL or wants to connect to one
- The user references an **OpenAPI/Swagger specification**
- The user mentions a **GraphQL endpoint** with tool/query exposure
- The user wants to **discover and call API tools/endpoints**
- The user wants to expose API functionality as **CLI commands**
- The user mentions **lazy tool discovery** or **token-efficient API usage**
- The task involves calling tools from an external service

Do NOT use mcp2cli when:
- The user explicitly asks for direct SDK usage (Python/JS SDK, etc.)
- The integration requires complex custom authentication flows mcp2cli doesn't support
- The user needs programmatic access within a larger codebase (mcp2cli is CLI-focused)

## Why mcp2cli

1. **Token Efficiency**: 95-99% token savings vs. native tool injection by using lazy discovery (`--list`, `--help`) instead of full schema embedding
2. **Zero Codegen**: Works at runtime — no code generation needed when APIs change
3. **Universal**: One tool for MCP, OpenAPI, and GraphQL sources
4. **Caching**: Built-in caching reduces network calls
5. **Sessions**: Persistent sessions for stateful MCP servers

## Repository Name Format

When using tools like `read-wiki-structure` or `ask-question` that require a `--repo-name` argument, **always use the full `owner/repo` format**:

```bash
# ✅ Correct: includes owner/organization
--repo-name "facebook/react"
--repo-name "microsoft/vscode"
--repo-name "knowsuchagency/mcp2cli"

# ❌ Incorrect: missing owner (will likely fail)
--repo-name "react"
--repo-name "vscode"
```

The `owner/repo` format is required for DeepWiki and similar MCP servers to identify the exact repository.

## Resolving Repository Names (When Owner is Unknown)

Often users mention repos without the owner prefix (e.g., "react" instead of "facebook/react"). Follow this resolution workflow:

### Step 1: Check Format
- If user provides `owner/repo` → Use it directly
- If user provides only `repo-name` → Continue to Step 2

### Step 2: Search GitHub for Candidates
```bash
gh search repos <repo-name> --sort stars --limit 5 --json fullName,stargazersCount
```

### Step 3: Apply Disambiguation Rules

**Case A: Clear Winner** (top result has 10x+ stars vs next)  
→ Auto-select the top result and proceed

Example: "react" returns `facebook/react` (218k★) vs `reactjs/react-devtools` (4k★)  
Action: Use `facebook/react`

**Case B: Ambiguous Results** (multiple viable options)  
→ Present top 3 options to user and ask them to specify

Example: "utils" returns `lodash/lodash` (59k★), `chalk/chalk` (21k★), `debug/debug` (11k★)  
Action: Ask "Did you mean lodash/lodash, chalk/chalk, or debug/debug?"

**Case C: No Results**  
→ Ask user for the full `owner/repo` path

Example: "my-private-tool" returns nothing  
Action: Ask "What's the full GitHub path (owner/repo)?"

### Step 4: Cache for Future Use
Remember the mapping (e.g., "react" → "facebook/react") within the session to avoid repeated searches.

### Example Resolution

User: "Check how mcp2cli works"
```bash
# Detected: "mcp2cli" without owner
gh search repos mcp2cli --sort stars --limit 5 --json fullName,stargazersCount
# Result: [{"fullName":"knowsuchagency/mcp2cli","stargazersCount":42}]
# Clear winner → Use knowsuchagency/mcp2cli

echo '{"repoName": "knowsuchagency/mcp2cli", "question": "How does mcp2cli work?"}' | \
  mcp2cli --mcp https://mcp.deepwiki.com/mcp --pretty ask-question --stdin
```

## Connection Patterns

### MCP Servers

```bash
# HTTP/SSE transport
mcp2cli --mcp https://server.example.com/mcp --list

# stdio transport (command-based)
mcp2cli --mcp-stdio "command-to-start-server" --list
```

### OpenAPI Specifications

```bash
# Remote spec
mcp2cli --spec https://api.example.com/openapi.json --list

# Local spec file
mcp2cli --spec ./api-spec.yaml --list
```

### GraphQL Endpoints

```bash
mcp2cli --graphql https://api.example.com/graphql --list
```

## The 4-Stage Workflow

Always follow this pattern when using mcp2cli:

1. **Discover** (`--list`): See available tools/commands
2. **Inspect** (`--help <tool>`): Get details on a specific tool
3. **Execute** (call the tool with args): Run the actual operation
4. **Cache/Save** (optional: `bake` for frequently used configs)

## Example Workflow

```bash
# Step 1: Connect and discover
mcp2cli --mcp https://mcp.deepwiki.com/mcp --pretty --list

# Step 2: Get help for a specific tool
echo '{"repoName": "owner/repo", "question": "How does X work?"}' | \
  mcp2cli --mcp https://mcp.deepwiki.com/mcp --pretty ask-question --stdin

# Step 3: Execute (using --stdin for complex args)
echo '{"repoName": "owner/repo", "question": "Explain the architecture"}' | \
  mcp2cli --mcp https://mcp.deepwiki.com/mcp --pretty ask-question --stdin

# Step 4: Save config for reuse
mcp2cli --mcp https://mcp.deepwiki.com/mcp bake --name deepwiki

# Later: Use baked config
mcp2cli @deepwiki --pretty ask-question --repo-name "owner/repo" --question "..."
```

## MCP Tool Calling with --stdin

Many MCP tools accept JSON arguments. Use `--stdin` to pass them:

```bash
echo '{"arg1": "value1", "arg2": "value2"}' | \
  mcp2cli --mcp https://server.example.com/mcp tool-name --stdin
```

## Authentication Options

| Method | Flag | Example |
|--------|------|---------|
| HTTP Header | `--auth-header` | `--auth-header "Authorization: Bearer token"` |
| OAuth | `--oauth` | `--oauth --oauth-client-id $CLIENT_ID` |
| Header from env | `--auth-header` | `--auth-header "Api-Key: env:API_KEY"` |

## Output Formats

| Flag | Purpose |
|------|---------|
| `--pretty` | Human-readable JSON (default for interactive) |
| `--toon` | Token-efficient format for LLM consumption |
| `--compact` | Space-separated tool names only (~2 tokens/tool) |
| `--raw` | Raw response body |

## Session Management

For stateful MCP servers:

```bash
# Start a session
mcp2cli --mcp https://server.example.com/mcp session-start mysession

# Use the session
mcp2cli --mcp https://server.example.com/mcp --session mysession tool-name

# List active sessions
mcp2cli --session-list

# Stop session
mcp2cli session-stop mysession
```

## Common Patterns

### Check if server is reachable
```bash
mcp2cli --mcp https://server.example.com/mcp --pretty --list 2>&1 | head -5
```

### Search for a specific tool
```bash
mcp2cli --mcp https://server.example.com/mcp --search "keyword" --pretty --list
```

### Limit output for LLM context
```bash
mcp2cli --mcp https://server.example.com/mcp --pretty --head 10 --list
```

## Troubleshooting

- **"Repository not found" on DeepWiki**: The repo hasn't been indexed. Visit `https://deepwiki.com/owner/repo` to trigger indexing.
- **Connection refused**: Check the MCP server URL and that the server is running.
- **Auth errors**: Verify `--auth-header` or `--oauth` flags are correct.
- **Cache issues**: Use `--refresh` to force re-fetch specs.

## Reference

- Repository: https://github.com/knowsuchagency/mcp2cli
- Full docs: Use `mcp2cli --help` or DeepWiki at `knowsuchagency/mcp2cli`

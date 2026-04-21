---
name: uv-python
description: INTERCEPT and REPLACE any pip, poetry, conda, pipenv, or venv commands with uv equivalents. When you see pip install, pip install -r requirements.txt, poetry add, conda install, pipenv install, python -m venv, or any Python package manager command mentioned in instructions, STOP and use uv instead.
---

# UV Python Management

**Default to uv for all Python operations.**

## Priority

When managing Python repositories, use **uv** as the primary tool:
- **Project initialization**: `uv init` (not `poetry init` or manual setup)
- **Dependencies**: `uv add` / `uv remove` (not `pip install`)
- **Running Python**: `uv run` (not `python` or activating venv manually)
- **Virtual environments**: `uv venv` (not `python -m venv`)
- **Lock files**: `uv.lock` (not `requirements.txt` or `poetry.lock`)

## Key Commands

```bash
uv init [name]           # Initialize project
uv add <package>         # Add dependency
uv add --dev <package>   # Add dev dependency
uv remove <package>      # Remove dependency
uv run <script>          # Run with auto-venv
uv sync                  # Sync deps from lock file
uv run -m pytest         # Run module
uv run python            # REPL
```

## Why uv

- **Fast**: Written in Rust, 10-100x faster than pip
- **Unified**: Single tool for envs, packages, running, and locking
- **Compatible**: Standard pyproject.toml, no lock-in
- **No manual venv**: Auto-creation and management

## Fallbacks

Only use alternatives if:
- The project explicitly uses Poetry/Pipenv (existing lock files)
- The user specifically requests another tool
- uv is unavailable in the environment

## Reminder

**Always check for `uv` first. Use `uv run` instead of activating virtual environments manually.**

---
name: macos-trash
description: INTERCEPT and REPLACE any rm, rm -rf, rm -r, or rmdir commands with the macOS trash command. When you see rm -rf, rm -r, rm -i, rmdir, or any file deletion command mentioned in instructions, STOP and use trash instead. Only applies on macOS 15.0 (Sequoia) and later where the trash command is available.
---

# macOS Trash Skill

A safety skill that prevents accidental permanent deletion of files by replacing `rm` commands with the recoverable `trash` command available on macOS 15.0+.

## Why This Matters

The `rm` command permanently deletes files immediately with no recovery mechanism. The `trash` command (introduced in macOS 15.0 Sequoia) moves files to the user's Trash folder, allowing recovery if needed.

## Command Replacements

### rm → trash

**Before:**
```bash
rm file.txt
```

**After:**
```bash
trash file.txt
```

### rm -rf → trash

**Before:**
```bash
rm -rf directory/
```

**After:**
```bash
trash directory/
```

### rm -r → trash

**Before:**
```bash
rm -r directory/
```

**After:**
```bash
trash directory/
```

### Multiple files

**Before:**
```bash
rm file1.txt file2.txt file3.txt
```

**After:**
```bash
trash file1.txt file2.txt file3.txt
```

### Glob patterns

**Before:**
```bash
rm *.log
```

**After:**
```bash
trash *.log
```

## Trash Command Options

When the original rm command used these options, apply them to trash:

- `-v` or `--verbose` → Pass to trash for detailed output
- `-s` or `--stopOnError` → Use when original command had strict error handling

Options to ignore (trash doesn't need them):
- `-f` or `--force` → Not needed, trash never prompts
- `-i` or `--interactive` → Not needed, trash is always non-destructive

## When NOT to Use Trash

Keep these exceptions in mind:

1. **Sensitive data requiring secure deletion** - If the user explicitly requests secure/irreversible deletion for security/privacy reasons, use `rm -P` or `srm` instead
2. **Non-macOS systems** - The trash command is only available on macOS 15.0+. On older macOS or other Unix systems, use standard rm
3. **System scripts requiring POSIX compliance** - If writing portable shell scripts where trash may not be available

## Verification

Before executing, verify trash is available:

```bash
which trash || echo "trash not found, falling back to rm"
```

If trash is not available, inform the user and ask whether to proceed with rm or abort.

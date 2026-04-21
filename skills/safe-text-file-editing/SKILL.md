---
name: safe-text-file-editing
description: Use when editing, modifying, merging, or restructuring text files of any kind. Especially critical for destructive operations like section deletion, file merges, reordering content, or when using the write tool on existing files. Triggers on phrases like "edit file", "update config", "merge files", "delete section", "restructure", "modify text", or when the task involves changing existing file content.
---

# Safe Text File Editing

A protocol for editing text files safely by routing operations to the appropriate tool and enforcing verification checkpoints.

## Core Principle

**Prefer `edit` over `write` whenever possible.** The `edit` tool has built-in safety through exact-match uniqueness requirements—it physically cannot perform ambiguous replacements. The `write` tool overwrites entire files and requires manual safeguards.

## Tool Routing Decision Tree

Before touching any file, answer these questions in order:

1. **Can the change be expressed as targeted replacements with unique anchors?**
   - Use `edit`
   - Skip to the `edit` protocol

2. **Is this a new file that doesn't exist yet?**
   - Use `write` directly
   - No safeguards needed

3. **Is this a large deletion, merge, or restructure that `edit` cannot express?**
   - Use `write` with the **copy-on-write protocol** below

## Protocol: Using `edit`

The safest path—use this whenever possible.

1. **State intent in one sentence.** If you cannot, stop and clarify.

2. **Verify uniqueness.** For each `oldText`:
   - Mentally scan or use `grep` to confirm it appears exactly once in the file
   - Choose the smallest `oldText` that is still unique
   - If multiple edits in one call, confirm they target disjoint regions

3. **Execute the edit.**

4. **Verify the result:**
   - Re-read the edited region
   - Confirm `newText` landed correctly
   - Check that surrounding content is intact

**If `edit` returns a not-found or multi-match error:** Do not retry with a broader `oldText`. Stop and investigate—the anchor may not be where you think it is.

## Protocol: Using `write` on Existing Files (Copy-on-Write)

This is the danger zone. Follow every step without skipping.

### Pre-Edit Phase

1. **State intent in one sentence.** If you cannot, refuse the operation.

2. **Map file structure.** Run `grep -n` on section markers for this file type (see Section Markers table below). Confirm edit boundaries align with semantic sections, not arbitrary line numbers.

3. **Read sufficient context:**
   - Under 500 lines: Read the entire file
   - 500–3000 lines: Read structural map + 50-line window around each edit site
   - Over 3000 lines: Structural map + windows only; extract target region to temp file, edit there, splice back

4. **Create timestamped backup:**
   ```bash
   cp file.ext file.ext.bak.$(date +%s)
   ```

5. **Record mtime** of the original file before proceeding.

### Execution Phase

6. **Write to sibling path first:**
   - Write new content to `file.ext.new` (not the original)

### Verification Phase

7. **Verify before swapping:**
   - `wc -l file.ext.new` — does line count delta match expectation?
   - `tail -20 file.ext.new` — does it end at a logical stopping point?
   - `diff file.ext file.ext.new` — is anything unintended removed?
   - For structured files (JSON, YAML, markdown): attempt parse/render check

8. **Check mtime again** on the original. If it changed between step 5 and now, another writer intervened. Abort and re-read.

### Promotion Phase

9. **Atomic swap via bash:**
   ```bash
   mv file.ext.new file.ext
   ```

10. **Post-swap check:** Tail the final file once more.

11. **Keep the `.bak`** for this session. Delete only when the task is fully complete and verified.

## Section Markers by File Type

Identify these markers to map file structure before editing:

| Extension | Section Markers |
|-----------|-----------------|
| `.md` | ATX headers (`#`, `##`, `###`) |
| `.ts`, `.js`, `.tsx`, `.jsx` | Top-level `export`, `class`, `function`, block comments |
| `.py` | Function/class definitions (`def`, `class`), module-level docstrings |
| `.txt` (reports) | `====` banners, `----` sub-banners |
| `.json` | Top-level keys |
| `.yaml`, `.yml` | Top-level keys, document separators (`---`) |
| Unknown | Blank-line separated paragraphs; if ambiguous, treat whole file as one section and require full-read mode |

## Encoding and Line Endings

**Preserve, don't normalize:**
- Detect the original file's encoding and line endings on read
- Match them exactly on write
- Never silently convert UTF-8 to ASCII, LF to CRLF, or vice versa
- If the file has a BOM, preserve it

## Idempotency on Retry

Before retrying any edit after a partial failure:

1. Re-read the current file state
2. Check whether the intended change is already present
3. If yes → previous attempt succeeded, do not retry
4. If partially present → roll back via `.bak` and start over

**For append operations specifically:** Check the tail for the intended content before appending again. Duplicate appends are the easiest idempotency failure.

## Refusal Criteria

Stop and surface the problem to the user when any of these hold:

1. Intent cannot be stated in one sentence. **Specific red flags:** vague terms like "clean up", "make better", "organize", "fix" without specifics, or "improve" without criteria.
2. Section markers are ambiguous or absent for this file type
3. An anchor for `edit` resolves to zero matches when one was expected, or multiple matches when one was expected, and the cause is unclear
4. Post-`write` verification fails and the cause is not obvious
5. The mtime check shows the file changed under you and you cannot determine what changed
6. The edit would remove content that cannot be identified semantically (orphaned lines with no matching section header)

**Refusing is not failure. Proceeding past ambiguity is.**

## Quick Reference Table

| Situation | Tool | Protocol |
|-----------|------|----------|
| Fix typo, change value, rename symbol | `edit` | Verify uniqueness, execute, verify result |
| `edit` returns multi-match | Stop | Investigate anchor, do not broaden |
| Large section deletion | `write` | Full copy-on-write protocol |
| Merge two files | `write` | Full copy-on-write protocol |
| Restructure/reorder content | `write` | Full copy-on-write protocol |
| Create new file | `write` | Direct write (no safeguards needed) |
| Retry after failure | Check first | Re-read, check idempotency |
| Unknown file structure | `edit` or `write` with caution | Treat as one section; full-read mode |
| Ambiguous intent | Refuse | Surface to user |

## Key Safety Properties

| Property | `edit` | `write` |
|----------|--------|---------|
| Uniqueness enforced | Yes (errors on multi-match) | No |
| Exact match enforced | Yes | No |
| Scope limited to target | Yes | Entire file |
| Accidental section loss possible | No | Yes |
| Line-number reasoning possible | No (anchors only) | Yes (dangerous) |
| Safe default for existing files | Yes | No |

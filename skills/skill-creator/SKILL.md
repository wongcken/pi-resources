---
name: skill-creator
description: Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, edit or optimize an existing skill, run evals to test a skill, benchmark skill performance, or optimize a skill's description for better triggering accuracy. Also use when someone says "turn this into a skill", "make a skill for X", "improve my skill", or wants to package workflows as reusable capabilities.
---

# Skill Creator

A skill for creating, testing, and iteratively improving Pi skills.

The overall process looks like this:

1. Figure out what the skill should do
2. Write a draft SKILL.md (and any bundled scripts/references)
3. Create a few test prompts, then run Pi on each one with the skill loaded
4. Help the user evaluate the results, both qualitatively and quantitatively
5. Revise the skill based on feedback
6. Repeat until the user is satisfied
7. Optionally, optimize the skill's description for reliable triggering

Your job is to figure out where the user is in this process and help them move forward. Maybe they already have a draft and want to jump straight to testing. Maybe they want to skip formal evals and just iterate conversationally. Be flexible and meet them where they are.

## Communicating with the user

Pi attracts a wide range of users. Some are seasoned developers who installed Pi from npm and live in the terminal. Others are newcomers exploring what a coding agent can do for them.

Pay attention to context cues. In the default case:

- "evaluation" and "benchmark" are borderline but fine to use
- For "JSON" and "assertion", look for signals that the user knows what those mean before using them without a brief explanation

If in doubt, define terms briefly inline and move on.

---

## Creating a Skill

### Capture Intent

Start by understanding what the user wants. The current conversation might already contain a workflow the user wants to capture (e.g., "turn this into a skill"). If so, extract what you can from the conversation history first: the tools used, the sequence of steps, corrections the user made, the input/output formats you observed. The user may need to fill gaps, and they should confirm before you proceed.

Questions to answer:

1. What should this skill enable Pi to do?
2. When should this skill trigger? (what user phrases or contexts)
3. What is the expected output format?
4. Should we set up test cases? Skills with objectively verifiable outputs (file transforms, data extraction, code generation, fixed workflow steps) benefit from test cases. Skills with subjective outputs (writing style, creative work) often do not. Suggest the appropriate default, but let the user decide.

### Interview and Research

Proactively ask about edge cases, input/output formats, example files, success criteria, and dependencies. Wait to write test prompts until this is sorted out. Come prepared with context so the user does not have to do all the explaining.

### Write the SKILL.md

Based on the user interview, fill in these components:

- **name**: Skill identifier (lowercase, hyphenated)
- **description**: When to trigger and what the skill does. This is the primary triggering mechanism. Pi's model sees only the name and description to decide whether to load the full SKILL.md, so pack both the "what" and the "when" into this field. Lean slightly aggressive: if a skill is useful for dashboards, say so explicitly rather than hoping the model will infer it. Max 1024 characters.
- **The body of the SKILL.md**: Instructions the model will follow after loading the skill

### Skill Structure

```
skill-name/
├── SKILL.md          # Required: YAML frontmatter + markdown instructions
├── scripts/          # Optional: executable helpers for deterministic tasks
├── references/       # Optional: docs loaded into context on demand
└── assets/           # Optional: templates, icons, fonts used in output
```

### Progressive Disclosure

Pi skills use a three-level loading system:

1. **Metadata** (name + description): Always visible in the system prompt (~100 words max)
2. **SKILL.md body**: Loaded via the `read` tool when the model decides the skill is relevant
3. **Bundled resources**: Read on demand as the skill's instructions direct

Keep the SKILL.md body under 500 lines. If you are approaching that limit, factor large reference material into files under `references/` and include clear pointers about when and why to read them. For reference files over 300 lines, include a table of contents at the top.

**Domain organization**: When a skill supports multiple variants (e.g., different cloud providers, different frameworks), organize by variant:

```
cloud-deploy/
├── SKILL.md                # Workflow and selection logic
└── references/
    ├── aws.md
    ├── gcp.md
    └── azure.md
```

The model reads only the relevant reference file based on the user's context.

### Safety

Skills must not contain malware, exploit code, or anything that could compromise system security. A skill's contents should not surprise the user if described. Do not go along with requests to create misleading skills or skills designed for unauthorized access or data exfiltration. Roleplay and creative skills are fine.

### Writing Patterns

Use the imperative form in instructions.

**Defining output formats:**

```markdown
## Report Structure
Use this exact template:
# [Title]
## Executive Summary
## Key Findings
## Recommendations
```

**Examples pattern:**

```markdown
## Commit Message Format
**Example 1:**
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication
```

### Writing Style

Explain to the model *why* things are important rather than leaning on heavy-handed ALWAYS/NEVER directives. LLMs have strong theory of mind and respond well to reasoning. If you find yourself reaching for all-caps imperatives, that is a yellow flag; try reframing with the underlying rationale instead. Start by writing a draft, step back with fresh eyes, and improve it.

### Test Cases

After writing the draft, come up with 2 to 3 realistic test prompts. Share them with the user: "Here are a few test cases I'd like to try. Do these look right, or do you want to add more?"

Save test cases to `evals/evals.json`:

```json
{
  "skill_name": "example-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "User's task prompt",
      "expected_output": "Description of expected result",
      "files": [],
      "expectations": [
        "The output includes X",
        "The skill used script Y"
      ]
    }
  ]
}
```

Do not write assertions yet if you plan to draft them while tests run. See `references/schemas.md` for the full schema.

---

## Running and Evaluating Test Cases

Pi does not have built-in subagents. Test cases run sequentially using Pi's print mode (`pi -p`), which executes a prompt non-interactively and returns the result.

Put results in `<skill-name>-workspace/` as a sibling to the skill directory. Within the workspace, organize by iteration (`iteration-1/`, `iteration-2/`, etc.) and within each iteration, each test case gets a directory (`eval-0/`, `eval-1/`, etc.). Create directories as you go.

### Step 1: Run each test case

For each eval, run two Pi invocations: one with the skill loaded and one without (the baseline).

**With-skill run:**

```bash
pi -p "Execute this task: <eval prompt>" \
  --skill <path-to-skill> \
  > <workspace>/iteration-1/eval-0/with_skill/transcript.txt 2>&1
```

Copy any output files from the working directory into `with_skill/outputs/`.

**Baseline run** (same prompt, no skill):

```bash
pi -p "Execute this task: <eval prompt>" \
  > <workspace>/iteration-1/eval-0/without_skill/transcript.txt 2>&1
```

If improving an existing skill rather than creating a new one, the baseline should use the old version of the skill. Before editing, snapshot the original: `cp -r <skill-path> <workspace>/skill-snapshot/`, then point the baseline at the snapshot with `--skill <workspace>/skill-snapshot/`.

Give each eval a descriptive name based on what it tests, not just "eval-0". Write an `eval_metadata.json` in each eval directory:

```json
{
  "eval_id": 0,
  "eval_name": "descriptive-name-here",
  "prompt": "The user's task prompt",
  "assertions": []
}
```

### Step 2: Draft assertions

While tests are running (or after they complete), draft quantitative assertions for each test case and explain them to the user. Good assertions are objectively verifiable and have descriptive names that read clearly at a glance. Subjective qualities (writing style, design aesthetics) are better evaluated by the user directly.

Update the `eval_metadata.json` files and `evals/evals.json` with the assertions.

### Step 3: Grade the results

Once all runs finish:

1. **Grade each run.** For each assertion, check the outputs and transcript against the expectation. For assertions that can be checked programmatically (file exists, string appears in output, column count matches), write and run a script rather than eyeballing it. Save results to `grading.json` in each run directory. The `expectations` array must use the fields `text`, `passed`, and `evidence`:

```json
{
  "expectations": [
    {
      "text": "Output is a valid PDF file",
      "passed": true,
      "evidence": "file command reports 'PDF document, version 1.4'"
    }
  ],
  "summary": {
    "passed": 2,
    "failed": 1,
    "total": 3,
    "pass_rate": 0.67
  }
}
```

2. **Aggregate into a benchmark.** Run the aggregation script:

```bash
python -m scripts.aggregate_benchmark <workspace>/iteration-N --skill-name <name>
```

This produces `benchmark.json` and `benchmark.md` with pass rates, time, and token usage per configuration.

3. **Run an analyst pass.** Read the benchmark data and surface patterns the aggregate stats might hide: assertions that always pass regardless of skill (non-discriminating), high-variance evals (possibly flaky), and time/token tradeoffs. See `agents/analyzer.md` for guidance.

4. **Launch the viewer.** Use the eval viewer to present results to the user:

```bash
python eval-viewer/generate_review.py \
  <workspace>/iteration-N \
  --skill-name "my-skill" \
  --benchmark <workspace>/iteration-N/benchmark.json \
  --static <workspace>/iteration-N/review.html
```

Use `--static` to write a standalone HTML file, then tell the user where to find it so they can open it in their browser. For iteration 2+, also pass `--previous-workspace <workspace>/iteration-<N-1>`.

Use `generate_review.py` for the viewer rather than writing custom HTML.

5. **Tell the user** something like: "I've generated the results viewer at `<path>`. Open it in your browser to review each test case and leave feedback. When you're done, come back here."

### What the User Sees in the Viewer

The "Outputs" tab shows one test case at a time:

- **Prompt**: the task that was given
- **Output**: the files the skill produced, rendered inline where possible
- **Previous Output** (iteration 2+): collapsed section showing the last iteration's output
- **Formal Grades** (if grading was run): collapsed section showing assertion pass/fail
- **Feedback**: a textbox that auto-saves as they type
- **Previous Feedback** (iteration 2+): their comments from last time

The "Benchmark" tab shows pass rates, timing, and token usage with per-eval breakdowns and analyst observations.

When done, the user clicks "Submit All Reviews" which downloads `feedback.json`. Ask them to place it in the workspace directory (or tell you where it ended up).

### Step 4: Read the feedback

Read `feedback.json`:

```json
{
  "reviews": [
    {"run_id": "eval-0-with_skill", "feedback": "the chart is missing axis labels", "timestamp": "..."},
    {"run_id": "eval-1-with_skill", "feedback": "", "timestamp": "..."}
  ],
  "status": "complete"
}
```

Empty feedback means the user thought it was fine. Focus improvements on test cases with specific complaints.

---

## Improving the Skill

This is the heart of the loop. You have run the test cases, the user has reviewed the results, and now you make the skill better.

### How to Think About Improvements

1. **Generalize from the feedback.** The goal is a skill that works across many prompts, not just the test cases you are iterating on. If you find yourself adding fiddly, overfitted fixes or oppressively rigid constraints, consider branching out and trying different metaphors, patterns, or approaches. It is relatively cheap to experiment.

2. **Keep the prompt lean.** Remove instructions that are not pulling their weight. Read the transcripts (not just the final outputs) and look for unproductive loops or wasted effort the skill might be causing.

3. **Explain the why.** Try to explain the reasoning behind every instruction. If you understand *why* the user wants something, transmit that understanding into the skill so the model can generalize beyond the letter of the instruction.

4. **Look for repeated work across test cases.** If every test run independently wrote a similar helper script or took the same multi-step approach, that is a strong signal the skill should bundle that script. Write it once, put it in `scripts/`, and tell the skill to use it. This saves every future invocation from reinventing the wheel.

### The Iteration Loop

After improving the skill:

1. Apply your changes to the SKILL.md (and any bundled resources)
2. Rerun all test cases into a new `iteration-<N+1>/` directory, including baseline runs
3. Generate the viewer with `--previous-workspace` pointing at the previous iteration
4. Wait for the user to review
5. Read the new feedback, improve again, repeat

Keep going until:

- The user says they are happy
- The feedback is all empty (everything looks good)
- You are not making meaningful progress

---

## Description Optimization

The description field in SKILL.md frontmatter is what determines whether Pi loads the skill. After the skill itself is in good shape, offer to optimize the description for reliable triggering.

### Step 1: Generate trigger eval queries

Create 20 eval queries, a mix of should-trigger and should-not-trigger. Save as JSON:

```json
[
  {"query": "the user prompt", "should_trigger": true},
  {"query": "another prompt", "should_trigger": false}
]
```

The queries must be realistic. Not abstract requests, but concrete and specific with file paths, personal context, column names, company names, typos, casual speech. Use a mix of lengths, and focus on edge cases rather than clear-cut examples.

**Should-trigger queries (8 to 10):** Different phrasings of the same intent. Include cases where the user does not name the skill or file type explicitly but clearly needs it. Include uncommon use cases and competitive triggers where this skill should win over a similar one.

**Should-not-trigger queries (8 to 10):** The most valuable negatives are near-misses. Queries that share keywords or concepts but actually need something different. Do not use obviously irrelevant queries like "write a fibonacci function" as a negative test for a PDF skill.

### Step 2: Review with the user

Present the eval set to the user for review using the HTML template:

1. Read the template from `assets/eval_review.html`
2. Replace the placeholders:
   - `__EVAL_DATA_PLACEHOLDER__` with the JSON array of eval items (no quotes, it is a JS variable assignment)
   - `__SKILL_NAME_PLACEHOLDER__` with the skill's name
   - `__SKILL_DESCRIPTION_PLACEHOLDER__` with the skill's current description
3. Write to a temp file (e.g., `/tmp/eval_review_<skill-name>.html`) and open it: `open /tmp/eval_review_<skill-name>.html`
4. The user can edit queries, toggle should-trigger, add/remove entries, then click "Export Eval Set"
5. The file downloads to `~/Downloads/eval_set.json`. Check the Downloads folder for the most recent version in case there are multiple.

### Step 3: Run the optimization loop

Tell the user: "This will take some time. I will run the optimization loop and check on it periodically."

Save the eval set to the workspace, then run:

```bash
python -m scripts.run_loop \
  --eval-set <path-to-trigger-eval.json> \
  --skill-path <path-to-skill> \
  --model <model-id-powering-this-session> \
  --max-iterations 5 \
  --verbose
```

Use the model ID from the current session so the triggering test matches what the user actually experiences.

The script splits the eval set 60/40 into train and held-out test, evaluates the current description (running each query 3 times for reliable trigger rates), then proposes improvements based on failures. It re-evaluates each new description on both train and test, iterating up to 5 times. When done, it produces a report and returns JSON with `best_description`, selected by test score to avoid overfitting.

### How Skill Triggering Works

Pi's model sees all discovered skills as a list of name + description entries. It decides whether to `read` a skill's full SKILL.md based on that description. The important nuance: Pi only consults skills for tasks it cannot easily handle on its own. Simple one-step queries like "read this PDF" may not trigger a skill even if the description matches, because the model can handle them directly with its built-in tools. Complex, multi-step, or specialized queries reliably trigger skills when the description matches.

This means your eval queries should be substantive enough that the model would actually benefit from consulting a skill.

### Step 4: Apply the result

Take `best_description` from the output and update the skill's SKILL.md frontmatter. Show the user the before/after and report the scores.

---

## Updating an Existing Skill

The user might ask to update an existing skill rather than create a new one. In this case:

- **Preserve the original name.** Note the skill's directory name and `name` frontmatter field. Use them unchanged.
- **Copy to a writeable location before editing.** Installed skill paths may be read-only. Copy to `/tmp/skill-name/`, edit there, and test from the copy.
- If the user wants to install the updated version, copy the final result back to the skill's original location (or guide them through the install).

---

## Reference Files

The `agents/` directory contains instructions for specialized evaluation tasks. Read them when you need guidance on the relevant activity:

- `agents/grader.md`: How to evaluate assertions against outputs
- `agents/comparator.md`: How to do blind A/B comparison between two outputs
- `agents/analyzer.md`: How to analyze benchmark results and surface patterns

The `references/` directory has additional documentation:

- `references/schemas.md`: JSON structures for evals.json, grading.json, benchmark.json, etc.

---

## Summary of the Core Loop

1. Figure out what the skill is about
2. Draft or edit the skill
3. Run Pi with the skill loaded on test prompts (using `pi -p`)
4. Evaluate the outputs with the user:
   - Generate `benchmark.json` and run `eval-viewer/generate_review.py` so the user can review them
   - Run quantitative evals
5. Repeat until satisfied
6. Optionally, optimize the description for triggering accuracy

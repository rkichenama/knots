# Agent Team Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a 4-agent cross-tool team (orchestrator, coder, tester, reviewer) in `D:\Code\agents` that works in both Claude Code (parallel) and Gemini CLI (sequential fallback).

**Architecture:** Each agent is defined in two formats — a Claude Code subagent markdown file (YAML frontmatter + system prompt) and a plain markdown system prompt for Gemini CLI. The orchestrator delegates to coder + tester in parallel, then gates reviewer until both complete. All agents live in `D:\Code\agents` independent of any single project.

**Tech Stack:** Claude Code subagent markdown (`.claude/agents/`), Gemini CLI `--system-prompt` flag, plain markdown.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `D:\Code\agents\README.md` | Create | Usage instructions |
| `D:\Code\agents\claude\agents\orchestrator.md` | Create | Claude Code orchestrator subagent |
| `D:\Code\agents\claude\agents\coder.md` | Create | Claude Code coder subagent |
| `D:\Code\agents\claude\agents\tester.md` | Create | Claude Code tester subagent |
| `D:\Code\agents\claude\agents\reviewer.md` | Create | Claude Code reviewer subagent |
| `D:\Code\agents\gemini\orchestrator.md` | Create | Gemini CLI orchestrator prompt |
| `D:\Code\agents\gemini\coder.md` | Create | Gemini CLI coder prompt |
| `D:\Code\agents\gemini\tester.md` | Create | Gemini CLI tester prompt |
| `D:\Code\agents\gemini\reviewer.md` | Create | Gemini CLI reviewer prompt |

---

### Task 1: Create directory structure

**Files:**
- Create: `D:\Code\agents\` (root)
- Create: `D:\Code\agents\claude\agents\`
- Create: `D:\Code\agents\gemini\`

- [ ] **Step 1: Create directories**

```powershell
New-Item -ItemType Directory -Force -Path "D:\Code\agents\claude\agents"
New-Item -ItemType Directory -Force -Path "D:\Code\agents\gemini"
```

Expected: directories created with no error.

- [ ] **Step 2: Verify structure**

```powershell
Get-ChildItem -Recurse "D:\Code\agents" | Select-Object FullName
```

Expected: `claude\agents` and `gemini` directories visible.

---

### Task 2: Write Claude orchestrator agent

**Files:**
- Create: `D:\Code\agents\claude\agents\orchestrator.md`

- [ ] **Step 1: Write the file**

```markdown
---
name: orchestrator
description: Receives a coding task, writes an execution plan, delegates to coder/tester/reviewer agents, and reports results. Use this agent to coordinate multi-step coding work.
tools: Agent, Task, TodoWrite, Read, Glob, Grep
model: claude-opus-4-7
---

You are the orchestrator agent. You coordinate coding tasks by delegating to specialist agents.

## On receiving a task

1. Read relevant files to understand context (use Read, Glob, Grep).
2. Write a numbered execution plan — list every subtask before delegating anything.
3. Identify independent subtasks (no shared file writes). Spawn coder + tester in parallel for each independent subtask. Serialize subtasks that write to the same files.
4. For each subtask, spawn coder and tester simultaneously:
   - Coder receives: subtask description + relevant file paths
   - Tester receives: subtask description + list of files coder will change
5. After coder + tester both complete for all subtasks, spawn reviewer once with: task description + all changed files + all test results.
6. Report reviewer findings to the user as a pass/fail summary. List all BUG and SECURITY findings. List STYLE findings only if no bugs found.

## Override handling

If the user says "skip tester", omit tester spawn for remaining subtasks.
If the user says "call reviewer now", spawn reviewer immediately with work completed so far.
If the user says "call [agent] directly", hand off and stop orchestrating.

## Parallelism rule

Independent subtasks = subtasks with no shared file writes. When in doubt, serialize.
```

- [ ] **Step 2: Verify file created**

```powershell
Get-Content "D:\Code\agents\claude\agents\orchestrator.md"
```

Expected: YAML frontmatter block visible at top, system prompt below.

- [ ] **Step 3: Commit**

```bash
git -C "D:\Code\agents" init
git -C "D:\Code\agents" add claude/agents/orchestrator.md
git -C "D:\Code\agents" commit -m "feat: add Claude Code orchestrator agent"
```

---

### Task 3: Write Claude coder agent

**Files:**
- Create: `D:\Code\agents\claude\agents\coder.md`

- [ ] **Step 1: Write the file**

```markdown
---
name: coder
description: Implements code changes for a given subtask. Does not write tests or review code. Use this agent when you need code written for a specific subtask.
tools: Read, Edit, Write, Glob, Grep, Bash
model: claude-sonnet-4-6
---

You are the coder agent. You implement code changes only.

## On receiving a subtask

1. Read the files listed in the subtask. Read adjacent files for patterns and conventions.
2. Implement the minimal code change required. Do not add features beyond what is asked.
3. Do not write tests. Do not write comments explaining what the code does.
4. Do not reformat unrelated code.

## Output

Report back:
- Files changed (exact paths)
- One sentence per file: what changed and why
```

- [ ] **Step 2: Verify file created**

```powershell
Get-Content "D:\Code\agents\claude\agents\coder.md"
```

Expected: YAML frontmatter + system prompt visible.

- [ ] **Step 3: Commit**

```bash
git -C "D:\Code\agents" add claude/agents/coder.md
git -C "D:\Code\agents" commit -m "feat: add Claude Code coder agent"
```

---

### Task 4: Write Claude tester agent

**Files:**
- Create: `D:\Code\agents\claude\agents\tester.md`

- [ ] **Step 1: Write the file**

```markdown
---
name: tester
description: Writes and runs unit and integration tests for changed files. Runs e2e tests only when explicitly requested. Use this agent to test code changes.
tools: Read, Edit, Write, Glob, Grep, Bash
model: claude-sonnet-4-6
---

You are the tester agent. You write and run tests for code changes.

## On receiving a subtask

1. Read the changed files listed in the subtask.
2. Write unit tests covering: happy path, boundary conditions, and failure cases for each changed function or component.
3. Write integration tests for any interactions between changed modules.
4. Write e2e tests ONLY if the subtask explicitly says "include e2e tests".
5. Run all tests. Do not suppress failures. Do not retry silently.

## Output

Report back:
- Test files written (exact paths)
- Test run result: PASS or FAIL
- If FAIL: exact test names and failure messages — do not summarize or paraphrase
- Coverage delta if available (before → after)

## Rules

- Never mark tests as passing if they fail.
- Never skip a test because it is hard to write.
- If you cannot write a meaningful test for something, say so explicitly.
```

- [ ] **Step 2: Verify file created**

```powershell
Get-Content "D:\Code\agents\claude\agents\tester.md"
```

- [ ] **Step 3: Commit**

```bash
git -C "D:\Code\agents" add claude/agents/tester.md
git -C "D:\Code\agents" commit -m "feat: add Claude Code tester agent"
```

---

### Task 5: Write Claude reviewer agent

**Files:**
- Create: `D:\Code\agents\claude\agents\reviewer.md`

- [ ] **Step 1: Write the file**

```markdown
---
name: reviewer
description: Reviews changed code for bugs, security vulnerabilities, and style issues. Flags issues only — does not rewrite code. Use this agent after coder and tester have completed.
tools: Read, Glob, Grep
model: claude-sonnet-4-6
---

You are the reviewer agent. You audit code changes for problems.

## On receiving a review request

You will receive: task description, list of changed files, test results.

1. Read every changed file in full.
2. Check in this order: bugs → security → style.
3. Security vulnerabilities are bugs — flag them as BUG, not SECURITY, unless they are purely a security concern with no functional impact.

## Output format

List every finding as:

```
[SEVERITY] path/to/file.ext:line — description
```

Severities:
- `BUG` — incorrect behavior, logic error, security vulnerability
- `SECURITY` — security concern without functional impact (e.g., information exposure in logs)
- `STYLE` — convention violation, naming inconsistency, unnecessary complexity

Rules:
- Do not rewrite code. Flag only.
- Do not suggest "consider refactoring" without a specific finding.
- If no issues found, output: `LGTM — no findings.`
```

- [ ] **Step 2: Verify file created**

```powershell
Get-Content "D:\Code\agents\claude\agents\reviewer.md"
```

- [ ] **Step 3: Commit**

```bash
git -C "D:\Code\agents" add claude/agents/reviewer.md
git -C "D:\Code\agents" commit -m "feat: add Claude Code reviewer agent"
```

---

### Task 6: Write Gemini agents (all four)

**Files:**
- Create: `D:\Code\agents\gemini\orchestrator.md`
- Create: `D:\Code\agents\gemini\coder.md`
- Create: `D:\Code\agents\gemini\tester.md`
- Create: `D:\Code\agents\gemini\reviewer.md`

Gemini format = Claude system prompt body, no YAML frontmatter, no Claude tool references (`Agent`, `Task`, `TodoWrite`, `Read`, `Edit`, `Write`, `Glob`, `Grep`, `Bash`). Replace tool references with natural language equivalents.

- [ ] **Step 1: Write gemini/orchestrator.md**

```markdown
You are the orchestrator agent. You coordinate coding tasks by delegating to specialist agents.

## On receiving a task

1. Read relevant files to understand context.
2. Write a numbered execution plan — list every subtask before delegating anything.
3. For each subtask, run coder first, then tester, then proceed to the next subtask. After all subtasks complete, run reviewer once with all results.
4. Report reviewer findings to the user as a pass/fail summary. List all BUG and SECURITY findings. List STYLE findings only if no bugs found.

Note: parallel execution is not available in this environment. Run coder → tester → reviewer sequentially per subtask.

## Override handling

If the user says "skip tester", omit tester for remaining subtasks.
If the user says "call reviewer now", run reviewer immediately with work completed so far.
If the user says "call [agent] directly", hand off and stop orchestrating.

## Subtask serialization

Subtasks that write to the same files must run sequentially. When in doubt, serialize.
```

- [ ] **Step 2: Write gemini/coder.md**

```markdown
You are the coder agent. You implement code changes only.

## On receiving a subtask

1. Read the files listed in the subtask. Read adjacent files for patterns and conventions.
2. Implement the minimal code change required. Do not add features beyond what is asked.
3. Do not write tests. Do not write comments explaining what the code does.
4. Do not reformat unrelated code.

## Output

Report back:
- Files changed (exact paths)
- One sentence per file: what changed and why
```

- [ ] **Step 3: Write gemini/tester.md**

```markdown
You are the tester agent. You write and run tests for code changes.

## On receiving a subtask

1. Read the changed files listed in the subtask.
2. Write unit tests covering: happy path, boundary conditions, and failure cases for each changed function or component.
3. Write integration tests for any interactions between changed modules.
4. Write e2e tests ONLY if the subtask explicitly says "include e2e tests".
5. Run all tests. Do not suppress failures. Do not retry silently.

## Output

Report back:
- Test files written (exact paths)
- Test run result: PASS or FAIL
- If FAIL: exact test names and failure messages — do not summarize or paraphrase
- Coverage delta if available (before → after)

## Rules

- Never mark tests as passing if they fail.
- Never skip a test because it is hard to write.
- If you cannot write a meaningful test for something, say so explicitly.
```

- [ ] **Step 4: Write gemini/reviewer.md**

```markdown
You are the reviewer agent. You audit code changes for problems.

## On receiving a review request

You will receive: task description, list of changed files, test results.

1. Read every changed file in full.
2. Check in this order: bugs → security → style.
3. Security vulnerabilities are bugs — flag them as BUG, not SECURITY, unless they are purely a security concern with no functional impact.

## Output format

List every finding as:

```
[SEVERITY] path/to/file.ext:line — description
```

Severities:
- `BUG` — incorrect behavior, logic error, security vulnerability
- `SECURITY` — security concern without functional impact (e.g., information exposure in logs)
- `STYLE` — convention violation, naming inconsistency, unnecessary complexity

Rules:
- Do not rewrite code. Flag only.
- Do not suggest "consider refactoring" without a specific finding.
- If no issues found, output: `LGTM — no findings.`
```

- [ ] **Step 5: Verify all four Gemini files exist**

```powershell
Get-ChildItem "D:\Code\agents\gemini"
```

Expected: `orchestrator.md`, `coder.md`, `tester.md`, `reviewer.md`

- [ ] **Step 6: Commit**

```bash
git -C "D:\Code\agents" add gemini/
git -C "D:\Code\agents" commit -m "feat: add Gemini CLI agent prompts"
```

---

### Task 7: Write README.md

**Files:**
- Create: `D:\Code\agents\README.md`

- [ ] **Step 1: Write the file**

```markdown
# Agent Team

Four-agent team for coordinating code execution tasks: orchestrator, coder, tester, reviewer.

## Agents

| Agent | Role |
|---|---|
| `orchestrator` | Writes execution plan, delegates to other agents, reports results |
| `coder` | Implements code changes only |
| `tester` | Writes and runs unit + integration tests |
| `reviewer` | Audits for bugs, security issues, style violations |

## Directory Structure

```
agents/
├── README.md
├── claude/
│   └── agents/          # Claude Code subagent format (YAML frontmatter + system prompt)
│       ├── orchestrator.md
│       ├── coder.md
│       ├── tester.md
│       └── reviewer.md
└── gemini/              # Gemini CLI format (plain system prompt, no frontmatter)
    ├── orchestrator.md
    ├── coder.md
    ├── tester.md
    └── reviewer.md
```

## Claude Code Activation

Symlink or copy `claude/agents/` into your project's `.claude/agents/`:

```powershell
# PowerShell — run once per project
New-Item -ItemType SymbolicLink -Path "<project>\.claude\agents" -Target "D:\Code\agents\claude\agents"
```

Or copy (no symlink):

```powershell
Copy-Item -Recurse "D:\Code\agents\claude\agents" "<project>\.claude\agents"
```

Agents are then available as subagents in Claude Code. Call the orchestrator for full coordination, or call any agent directly.

## Gemini CLI Activation

**Per-invocation:**

```bash
gemini --system-prompt "D:\Code\agents\gemini\orchestrator.md"
```

**Per-project (recommended):** Add to your project's `GEMINI.md`:

```
@D:\Code\agents\gemini\orchestrator.md
```

## Calling Agents Directly (bypassing orchestrator)

Claude Code — spawn by name:
```
Use the coder agent to implement X in file Y.
```

Gemini CLI — pass agent prompt directly:
```bash
gemini --system-prompt "D:\Code\agents\gemini\reviewer.md"
```

## Requesting E2E Tests

Tester writes unit + integration tests by default. To include e2e:

> "Run the tester agent on these changes — include e2e tests."

Or tell the orchestrator:

> "Coordinate implementation of X — include e2e tests in the tester step."

## Keeping Formats in Sync

`claude/agents/<name>.md` is the source of truth. When updating an agent:

1. Edit the Claude version.
2. Copy the system prompt body (below the `---` frontmatter closer) to the Gemini version.
3. Remove any Claude tool references (`Agent`, `Task`, `TodoWrite`, `Read`, `Edit`, `Write`, `Glob`, `Grep`, `Bash`) from the Gemini version — replace with natural language if needed.
```

- [ ] **Step 2: Verify README created**

```powershell
Get-Content "D:\Code\agents\README.md" | Select-Object -First 5
```

Expected: `# Agent Team` as first line.

- [ ] **Step 3: Commit**

```bash
git -C "D:\Code\agents" add README.md
git -C "D:\Code\agents" commit -m "docs: add README with activation and usage instructions"
```

---

### Task 8: Verify end-to-end

- [ ] **Step 1: Confirm directory structure is complete**

```powershell
Get-ChildItem -Recurse "D:\Code\agents" | Select-Object FullName
```

Expected output includes:
```
D:\Code\agents\README.md
D:\Code\agents\claude\agents\orchestrator.md
D:\Code\agents\claude\agents\coder.md
D:\Code\agents\claude\agents\tester.md
D:\Code\agents\claude\agents\reviewer.md
D:\Code\agents\gemini\orchestrator.md
D:\Code\agents\gemini\coder.md
D:\Code\agents\gemini\tester.md
D:\Code\agents\gemini\reviewer.md
```

- [ ] **Step 2: Verify all Claude files have valid YAML frontmatter**

Each file in `claude/agents/` must start with `---` and contain `name:`, `description:`, `tools:`, `model:` fields before the closing `---`.

```powershell
Get-Content "D:\Code\agents\claude\agents\orchestrator.md" | Select-Object -First 8
Get-Content "D:\Code\agents\claude\agents\coder.md" | Select-Object -First 8
Get-Content "D:\Code\agents\claude\agents\tester.md" | Select-Object -First 8
Get-Content "D:\Code\agents\claude\agents\reviewer.md" | Select-Object -First 8
```

- [ ] **Step 3: Verify Gemini files have no YAML frontmatter**

```powershell
Get-Content "D:\Code\agents\gemini\orchestrator.md" | Select-Object -First 1
```

Expected: first line is `You are the orchestrator agent.` — not `---`.

- [ ] **Step 4: Symlink Claude agents into knots project and invoke orchestrator**

```powershell
New-Item -ItemType SymbolicLink -Path "D:\Code\knots\.claude\agents" -Target "D:\Code\agents\claude\agents" -Force
```

Then in Claude Code in the knots project, invoke:
> "Use the orchestrator agent to add a console.log to src/main.tsx that logs 'hello' on mount."

Expected: orchestrator writes plan, spawns coder + tester in parallel (both visible in task panel), then spawns reviewer.

- [ ] **Step 5: Call reviewer directly (bypass orchestrator)**

In Claude Code:
> "Use the reviewer agent to review src/main.tsx."

Expected: reviewer reads file, outputs `[SEVERITY] ...` findings or `LGTM — no findings.` without asking for orchestrator context.

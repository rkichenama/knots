# Agent Team Design

**Date:** 2026-05-11
**Location:** `D:\Code\agents`

## Context

Cross-project, cross-tool agent team for code execution tasks. Primary pain points: coordinating step sequences, testing, and code review. Team must work in both Claude Code (parallel subagent execution) and Gemini CLI (sequential fallback). Not project-specific — lives in a dedicated directory and is activated per project.

## Team Structure

Four agents, role-based:

| Agent | Responsibility |
|---|---|
| `orchestrator` | Receives task, writes execution plan, delegates to other agents, tracks completion, reports back |
| `coder` | Implements code changes only — no tests, no review |
| `tester` | Writes and runs unit + integration tests; e2e on explicit request |
| `reviewer` | Audits for bugs (priority), style/convention violations, security issues |

## Delegation Flow

```
user → orchestrator
           ├── coder (implement subtask)
           ├── tester (write+run tests)  ← parallel with coder
           └── reviewer (after both done)
```

User can bypass orchestrator and call any agent directly for overrides.

## Agent Behavior

### Orchestrator
- Produces numbered execution plan before any delegation
- Spawns `coder` + `tester` in parallel for independent subtasks
- Gates `reviewer` until coder + tester both complete
- "Independent subtasks": subtasks with no shared file writes; orchestrator serializes subtasks that touch the same files
- Surfaces reviewer findings to user with pass/fail summary
- Accepts mid-execution override instructions ("skip tester", "call reviewer now")

### Coder
- Receives: subtask description + relevant file paths
- Outputs: code changes only — no tests, no explanatory comments
- Reads existing patterns before implementing
- Reports: files changed + brief what/why per change

### Tester
- Receives: subtask description + files changed by coder
- Writes unit tests + integration tests by default
- Runs tests, reports pass/fail + coverage delta
- E2e tests only if explicitly requested
- Fails loudly — does not hide failures or retry silently

### Reviewer
- Receives: subtask description + all changed files + test results
- Checks in order: bugs → security → style
- Reports findings as structured list: `[SEVERITY] file:line — description`
- Severities: `BUG`, `SECURITY`, `STYLE`
- Flags issues only — does not rewrite code

## File Structure

```
D:\Code\agents\
├── README.md                     # Usage instructions
├── claude/
│   └── agents/
│       ├── orchestrator.md       # Claude Code subagent (YAML frontmatter + system prompt)
│       ├── coder.md
│       ├── tester.md
│       └── reviewer.md
└── gemini/
    ├── orchestrator.md           # Plain system prompt, no frontmatter
    ├── coder.md
    ├── tester.md
    └── reviewer.md
```

## Two-Format Strategy

| | Claude format | Gemini format |
|---|---|---|
| Location | `claude/agents/<name>.md` | `gemini/<name>.md` |
| Frontmatter | YAML (`name`, `description`, `tools`, `model`) | None |
| Tool refs | Claude-specific (`Agent`, `TodoWrite`, `Task`) | Removed |
| Source of truth | Yes | Stripped copy of Claude version |

**Model assignments (Claude):**
- `orchestrator`: `claude-opus-4-7` (reasoning-heavy)
- `coder`, `tester`, `reviewer`: `claude-sonnet-4-6` (execution)

## Cross-tool Activation

### Claude Code
1. Copy or symlink `D:\Code\agents\claude\agents\` → `<project>\.claude\agents\`
2. Agents available as subagents via `Agent` tool or by name
3. Orchestrator spawns others in parallel via `Agent` tool

### Gemini CLI
- Per-invocation: `gemini --system-prompt D:\Code\agents\gemini\<agent>.md`
- Per-project: add `@D:\Code\agents\gemini\orchestrator.md` to project `GEMINI.md`
- Parallel execution unavailable — orchestrator prompt includes sequential fallback: run coder → tester → reviewer in order

## README Contents

The `README.md` at repo root covers:
- Team overview and agent roles
- Directory structure explanation
- Claude Code activation (symlink instructions)
- Gemini CLI activation (flag + GEMINI.md include)
- How to call agents directly (bypass orchestrator)
- How to request e2e tests explicitly
- Sync strategy: edit Claude format, strip to Gemini format

## Verification

1. `D:\Code\agents` directory created with correct structure
2. Each Claude agent file: valid YAML frontmatter + system prompt
3. Each Gemini agent file: clean system prompt, no frontmatter, no Claude tool refs
4. Symlink Claude agents into a test project's `.claude\agents\`, invoke orchestrator with a trivial task
5. Verify parallel spawn: coder + tester both appear in Claude Code task panel simultaneously
6. Pass Gemini a task via `--system-prompt` pointing at gemini orchestrator — verify sequential output
7. Call `reviewer` directly (bypass orchestrator) — verify it accepts task without orchestrator context

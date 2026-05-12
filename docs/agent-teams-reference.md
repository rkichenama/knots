# Agent Teams Reference Guide

> Source: https://code.claude.com/docs/en/agent-teams  
> Last updated: 2026-05-09  
> Requires: Claude Code v2.1.32+

Agent teams are **experimental** and disabled by default.

---

## Quick Start

### Enable

```json
// settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### Spawn team

```
Create an agent team to [task]. Spawn [N] teammates: one for [A], one for [B], one for [C].
```

---

## When to Use Agent Teams

### Best fit

| Use case | Why teams win |
|----------|---------------|
| Parallel research/review | Multiple angles simultaneously |
| Independent new modules | Each teammate owns separate files |
| Competing bug hypotheses | Parallel investigation, adversarial debate |
| Cross-layer changes (frontend/backend/tests) | Each layer owned by one teammate |

### Poor fit

- Sequential tasks
- Same-file edits (causes overwrites)
- Work with many dependencies
- Simple/routine tasks (use single session or subagents)

---

## Agent Teams vs Subagents

| | Subagents | Agent Teams |
|--|-----------|-------------|
| **Context** | Own window; results return to caller | Own window; fully independent |
| **Communication** | Report to main agent only | Teammates message each other directly |
| **Coordination** | Main agent manages all work | Shared task list, self-coordination |
| **Best for** | Focused tasks where only result matters | Complex work requiring discussion |
| **Token cost** | Lower (results summarized back) | Higher (~7x vs single session in plan mode) |

**Rule**: Use subagents when workers only need to report results. Use teams when workers need to share findings, challenge each other, and coordinate.

---

## Architecture

```
Team Lead (main session)
  ├── Shared Task List  ←→  Teammate A
  ├── Mailbox          ←→  Teammate B  
  └── Team Config            Teammate C
```

| Component | Role |
|-----------|------|
| **Team lead** | Creates team, spawns teammates, coordinates |
| **Teammates** | Separate Claude Code instances on assigned tasks |
| **Task list** | Shared work items teammates claim/complete |
| **Mailbox** | Direct messaging between any agents |

### Storage locations

- Team config: `~/.claude/teams/{team-name}/config.json`
- Task list: `~/.claude/tasks/{team-name}/`

> Do NOT hand-edit team config — overwritten on each state update.

---

## Display Modes

| Mode | Description | Requires |
|------|-------------|----------|
| `in-process` | All teammates in main terminal, Shift+Down to cycle | Any terminal |
| `tmux` | Each teammate in own split pane | tmux or iTerm2 |
| `auto` (default) | Split panes if in tmux, else in-process | — |

### Set mode

```json
// ~/.claude/settings.json
{ "teammateMode": "in-process" }
```

```bash
claude --teammate-mode in-process
```

### Install split-pane requirements

- **tmux**: via system package manager
- **iTerm2**: install `it2` CLI, enable Python API in iTerm2 → Settings → General → Magic

> Split panes NOT supported in: VS Code integrated terminal, Windows Terminal, Ghostty.

---

## Key Commands

### Navigation (in-process mode)

| Action | Key |
|--------|-----|
| Cycle through teammates | Shift+Down (wraps at end) |
| View teammate session | Enter |
| Interrupt current turn | Escape |
| Toggle task list | Ctrl+T |

### Natural language controls

```
# Specify teammates and models
Create a team with 4 teammates. Use Sonnet for each.

# Require plan approval before implementation
Spawn an architect teammate to refactor auth module. Require plan approval before changes.

# Talk to specific teammate
[After Shift+Down to teammate] Give more specific instructions here.

# Assign tasks
Tell the researcher teammate to investigate X.

# Shutdown teammate
Ask the researcher teammate to shut down.

# Cleanup
Clean up the team.
```

---

## Task System

Tasks have 3 states: **pending → in_progress → completed**

Tasks support dependencies — blocked tasks auto-unblock when dependencies complete.

### Claim strategies

- **Lead assigns**: explicit assignment to named teammate
- **Self-claim**: teammate picks next unassigned, unblocked task after finishing

File locking prevents race conditions on simultaneous claims.

---

## Context and Communication

### What teammates load at spawn

- CLAUDE.md from working directory
- MCP servers (from project + user settings)
- Skills (from project + user settings)
- Spawn prompt from lead

### What teammates do NOT get

- Lead's conversation history
- `skills` or `mcpServers` from subagent definition frontmatter

### Communication channels

- **Direct messages**: any agent → any agent by name; auto-delivered, no polling needed
- **Idle notifications**: teammates auto-notify lead when they stop
- **Shared task list**: all agents see status and can claim work

> To broadcast: send one message per recipient (no group-send).

---

## Permissions

- Teammates inherit lead's permission settings at spawn
- If lead uses `--dangerously-skip-permissions`, all teammates do too
- Per-teammate mode changes: possible after spawn, not at spawn time

---

## Subagent Definitions as Teammate Roles

Define reusable roles once, use both as subagents and as teammates:

```
Spawn a teammate using the security-reviewer agent type to audit the auth module.
```

- Teammate inherits `tools` allowlist and `model` from the definition
- Definition body appended to teammate system prompt (not replaced)
- Team coordination tools (`SendMessage`, task tools) always available even with restricted `tools`

---

## Hooks for Quality Gates

### TeammateIdle

Fires when teammate is about to go idle.

| Exit code | Behavior |
|-----------|----------|
| 0 | Allow idle |
| 2 | Prevent idle, teammate keeps working |
| Other non-zero | Non-blocking error, teammate idles |

```json
{
  "hooks": {
    "TeammateIdle": [{ "hooks": [{ "type": "command", "command": "./check-status.sh" }] }]
  }
}
```

```bash
# JSON alternative
{ "continue": false, "stopReason": "Task not yet complete" }
```

### TaskCreated

Fires when task is being created. Exit code 2 blocks creation.

```bash
#!/bin/bash
if ! validate_task; then
  echo "Invalid task" >&2
  exit 2
fi
```

### TaskCompleted

Fires when task being marked complete. Exit code 2 prevents completion.

```bash
#!/bin/bash
if ! all_tests_passed; then
  echo "Tests must pass before completion" >&2
  exit 2
fi
```

---

## Token Costs

Agent teams use ~7x more tokens than standard sessions (in plan mode).

### Cost controls

| Strategy | Impact |
|----------|--------|
| Use Sonnet for teammates | Lower cost vs Opus |
| Keep teams small (3-5) | Linear scaling per teammate |
| Focused spawn prompts | Less context from start |
| Clean up when done | Active teammates burn tokens even idle |
| Small, self-contained tasks | Less per-teammate usage |

---

## Best Practices

### Team composition

- **Size**: 3-5 teammates for most workflows
- **Tasks per teammate**: 5-6 keeps everyone productive without excessive context switching
- **Scale up only** when work genuinely benefits from simultaneous work; 3 focused > 5 scattered

### Task sizing

- Too small → coordination overhead exceeds benefit
- Too large → teammates run too long without check-ins, risk of wasted effort
- Right size → self-contained unit producing clear deliverable (function, test file, review)

### Context

Always include task-specific detail in spawn prompt:

```
Spawn a security reviewer with prompt: "Review auth module at src/auth/ for
security vulnerabilities. Focus on token handling, session management, input
validation. App uses JWT in httpOnly cookies. Report issues with severity ratings."
```

### File discipline

- One teammate per file or module — never two teammates editing same file
- Break work by file ownership before spawning

### Monitoring

- Check in on progress, redirect approaches not working
- Don't let teams run unattended too long
- If lead starts implementing instead of delegating: `Wait for your teammates to complete their tasks before proceeding`

### Start simple

Begin with research/review tasks (no code writing) to learn team dynamics before parallel implementation.

---

## Effective Prompt Patterns

### Parallel code review

```
Create an agent team to review PR #142. Spawn three reviewers:
- One focused on security implications
- One checking performance impact
- One validating test coverage
Have them each review and report findings.
```

### Adversarial debugging

```
Users report [symptom]. Spawn 5 agent teammates to investigate different
hypotheses. Have them talk to each other to try to disprove each other's
theories, like a scientific debate. Update the findings doc with whatever
consensus emerges.
```

### Plan-gated implementation

```
Spawn an architect teammate to refactor the authentication module.
Require plan approval before they make any changes.
Only approve plans that include test coverage.
```

---

## Limitations (Experimental)

| Limitation | Detail |
|------------|--------|
| No session resumption | `/resume` and `/rewind` don't restore in-process teammates |
| Task status lag | Teammates sometimes fail to mark tasks complete; unblocks may stall |
| Slow shutdown | Teammates finish current request before stopping |
| One team at a time | Clean up before creating new team |
| No nested teams | Teammates can't spawn their own teams |
| Lead is fixed | Can't promote teammate to lead or transfer leadership |
| Permissions fixed at spawn | Can change after, not at spawn time |
| Split panes limited | Only tmux or iTerm2; not VS Code, Windows Terminal, Ghostty |

### Workarounds

```bash
# Orphaned tmux sessions
tmux ls
tmux kill-session -t <session-name>
```

- **Teammates not appearing**: press Shift+Down; check task complexity; verify tmux in PATH
- **Too many permission prompts**: pre-approve common operations in permission settings before spawn
- **Teammate stopped on error**: give direct instructions or spawn replacement
- **Lead shuts down early**: tell it to keep going or wait for teammates

---

## Related

- [Subagents](/en/sub-agents) — lightweight delegation, no inter-agent comms
- [Git worktrees](/en/worktrees) — manual parallel sessions
- [Hooks](/en/hooks) — full hook reference
- [Settings](/en/settings) — all settings including `teammateMode`

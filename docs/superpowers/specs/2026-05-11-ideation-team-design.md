# Ideation Agent Team Design

**Date:** 2026-05-11
**Location:** `D:\Code\agents`

## Context

Six-agent ideation team that operates upstream of code execution. Takes a vague idea or problem statement and produces a spec doc + condensed task brief ready for handoff to the execution team (orchestrator, coder). Lives in the same `D:\Code\agents` repo as the execution team. Same two-format strategy (Claude Code + Gemini CLI).

## Team Structure

| Agent | Role |
|---|---|
| `facilitator` | Runs panel sessions, routes topics to specialists, synthesizes output, writes spec + task brief. Doubles as scribe. |
| `architect` | Evaluates structural/technical approach and trade-offs. |
| `ux-designer` | Focuses on user flows, interaction patterns, usability. |
| `devil` | Always challenges every proposal. Pokes holes AND suggests alternatives. |
| `qa` | Surfaces testability concerns and regression risks during ideation; writes Testing section in output. |
| `a11y` | Advisory accessibility expert. Flags concerns, suggests WCAG patterns. Called when UI is involved. |

## Interaction Modes

### Panel mode
- User presents idea or problem to facilitator
- Facilitator routes each topic to domain-relevant specialists only (not everyone on everything)
- Devil always responds to every proposal — facilitator includes devil in every round
- a11y included when proposal involves UI; auto-skipped for backend-only topics
- Session ends: user says "wrap up" OR facilitator judges ~90% consensus among active specialists
- On end: facilitator asks where to save, then writes spec + task brief

### Direct mode
- User calls any specialist by name
- No facilitation, no routing — specialist responds directly
- Useful for targeted input or overrides

## Agent Behavior

### Facilitator
- Routes each topic to the right specialist(s) — architect for structure, UX for flows, QA for testing concerns
- Always includes devil in routing
- Checks if topic involves UI before routing to a11y; user can also call a11y directly at any time
- Requests QA's Testing section before writing final output
- Session end triggers: "wrap up" command OR ~90% specialist consensus
- Asks for save path before writing output; suggests `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`

### Devil's advocate
- Speaks every session without being called
- For every proposal: identifies weaknesses/risks AND suggests at least one alternative
- User can dismiss output but cannot silence agent mid-session

### QA
- During session: asks "how will this be tested?", flags regression risks, surfaces implementation trade-offs
- In final output: writes a Testing section covering what needs testing, how, and what existing behavior is at risk

### Accessibility expert (a11y)
- Advisory only — no veto, no sign-off required
- Flags WCAG concerns, suggests accessible patterns
- Facilitator routes to a11y when proposal has UI impact
- Auto-skipped for backend-only work
- Always available for direct call

## Output

Two artifacts per session:
1. **Spec doc** — full markdown spec matching `docs/superpowers/specs/` format
2. **Task brief** — condensed prompt-ready description for handoff to orchestrator or coder

Scribe (facilitator) asks where to save at session end. Default: `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` in current project.

## File Structure

```
D:\Code\agents\
├── claude\agents\
│   ├── facilitator.md
│   ├── architect.md
│   ├── ux-designer.md
│   ├── devil.md
│   ├── qa.md
│   └── a11y.md
└── gemini\
    ├── facilitator.md
    ├── architect.md
    ├── ux-designer.md
    ├── devil.md
    ├── qa.md
    └── a11y.md
```

## Two-Format Strategy

Same as execution team:
- Claude format: YAML frontmatter (`name`, `description`, `tools`, `model`) + system prompt
- Gemini format: plain system prompt, no frontmatter, no Claude tool refs
- Claude format = source of truth; Gemini = stripped copy

**Model assignments:**
- `facilitator`: `claude-opus-4-7`
- All others: `claude-sonnet-4-6`

## Verification

1. All 12 new files present in `D:\Code\agents`
2. Claude files: valid YAML frontmatter with correct `model:` assignments
3. Gemini files: no frontmatter, first line is `You are the [role] agent.`
4. Invoke facilitator with vague idea — routes to architect + UX + devil + QA (not a11y for backend topic)
5. Say "wrap up" — facilitator asks save path, writes spec + task brief
6. Call a11y directly on UI topic — advisory output with WCAG references, no sign-off language
7. Devil speaks every round without being called

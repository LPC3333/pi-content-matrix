# pi-content-matrix

An 8-agent content matrix system for Xiaohongshu (RED).

## Pipeline

style-observer (learn writing style from 200+ viral posts) → searcher (source materials) → content-writer (persona-driven creation) → content-reviewer (quality review) → persona-builder (account nurturing)

## 6 Work Modes

| Mode | Trigger |
|------|---------|
| A — Init style guide | Learn how RED种草 works |
| B — Daily creation | Write种草 notes for a product |
| C — Batch production | Process inbox products in bulk |
| D — Single edit | Revise generated content |
| E — Account nurturing | Post lifestyle content |
| F — Persona init | Create a new account identity |

## Key Mechanisms

- **Persona system** — Independent account profiles with persona/voice/taboos/history
- **Bullshit Detector** — Every attribution must be debunked by a dedicated agent before proceeding
- **Startup state scan** — Auto-scans cluster status on launch and reports actionable suggestions

## Tech

Prompt engineering, multi-agent orchestration, Playwright, Node.js

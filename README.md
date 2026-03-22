# pr-context-enricher

> Auto-generate rich context summaries for AI code reviewers

[![GitHub Action](https://img.shields.io/badge/GitHub-Action-blue?logo=github)](https://github.com/ollieb89/pr-context-enricher)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## What it does

`pr-context-enricher` automatically posts a structured context summary on every pull request, giving AI code reviewers (and humans) everything they need at a glance:

- 📊 **Executive summary** — files changed, lines added/removed, related issues, labels
- 📁 **Change breakdown** — per-file diff summary grouped by status, full commit history
- 🔴 **Risk assessment** — complexity score (0–10), migration warnings, missing test flags
- ✅ **Review checklist** — auto-generated, context-aware review items
- 🤖 **AI reviewer prompt** — ready-to-paste prompt with full PR context for ChatGPT, Claude, etc.

## Usage

```yaml
name: PR Context Enricher
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  enrich:
    runs-on: ubuntu-latest
    steps:
      - uses: ollieb89/pr-context-enricher@v1.0.0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `github-token` | GitHub token for API access | `${{ github.token }}` |
| `pr-number` | PR number (auto-detected for PR events) | auto |
| `post-comment` | Post/update summary comment on the PR | `true` |

## Outputs

| Output | Description |
|--------|-------------|
| `risk-level` | `low` \| `medium` \| `high` |
| `complexity-score` | 0–10 complexity score |
| `has-tests` | Whether test files were detected |
| `files-changed` | Number of files changed |
| `ai-reviewer-prompt` | Ready-to-paste AI reviewer prompt |

## Advanced: Use outputs downstream

```yaml
- id: context
  uses: ollieb89/pr-context-enricher@v1.0.0
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}

- name: Block high-risk PRs
  if: steps.context.outputs.risk-level == 'high'
  run: |
    echo "⚠️ High risk PR detected. Manual review required."
    exit 1

- name: Send AI review prompt to Slack
  run: |
    echo "${{ steps.context.outputs.ai-reviewer-prompt }}" | curl -X POST ...
```

## What the comment looks like

The action posts (or updates) a comment on the PR like this:

```
🔍 PR Context Summary

**PR #42: Add user authentication**
Author: @devuser | Base: main ← feature/auth

This PR touches 5 file(s) with +200/-50 lines across `src`, `tests`.
Related issues: #10

---
### Changed Files
Added:
- `src/auth.ts` (+150/-0)
- `tests/auth.test.ts` (+50/-0)

### Commits
- feat: add JWT auth
- test: add auth tests

---
### Risk Assessment: 🟢 Low
Complexity score: 2.5/10

---
### Review Checklist
- [ ] Does the PR description clearly explain the motivation?
- [ ] Are related issues linked?
- [ ] Verify tests are comprehensive

---
🤖 AI Reviewer Prompt (copy-paste ready)
...
```

## Part of the AI DevOps Actions Suite

- [workflow-guardian](https://github.com/ollieb89/workflow-guardian) — Workflow health monitoring
- [pr-size-labeler](https://github.com/ollieb89/pr-size-labeler) — Auto-label PRs by size
- [ai-pr-guardian](https://github.com/ollieb89/ai-pr-guardian) — Detect and score AI-generated PRs
- [pr-context-enricher](https://github.com/ollieb89/pr-context-enricher) — Rich context for AI reviewers ← **you are here**
- [actions-lockfile-generator](https://github.com/ollieb89/actions-lockfile-generator) — Supply chain security for actions
- [dependency-checker](https://github.com/ollieb89/dependency-checker) — Dependency vulnerability scanning

## License

MIT © [ollieb89](https://github.com/ollieb89)

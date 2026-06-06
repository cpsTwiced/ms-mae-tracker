---
description: Update README.md to match current app functionality (lists the changes and asks for approval before editing)
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*)
---

Update `README.md` so it accurately covers the app's current functionality.

Context — current changes in the working tree:

- Status: !`git status --porcelain`
- Diff stat (vs HEAD): !`git diff --stat HEAD`

Follow this flow exactly, in order:

1. **Gather the changes.** From the git output above (run `git diff` / `git log --oneline` if you need more detail), work out what actually changed in the app — anything affecting user-facing functionality, features, slash commands/scripts, reset behavior, tech stack, data model, or project scope. Ignore noise (lockfiles, `dist/`, formatting-only edits).

2. **List the changes briefly.** Output a short bullet list: what changed, and which README sections it affects (Features, Reset schedule, Tech stack, Scripts, How it works, Boss portraits, Status / scope).

3. **Get approval.** Ask the user to approve the proposed README updates. Do **NOT** edit `README.md` yet — wait for an explicit go-ahead.

4. **On approval, update `README.md`** to cover the current functionality. Preserve the existing structure and writing style; change only the sections that need it rather than rewriting wholesale.

If nothing functional changed, say so and edit nothing.

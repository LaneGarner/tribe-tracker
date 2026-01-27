---
allowed-tools: Bash(git status*), Bash(git diff*), Bash(git add*), Bash(git commit*)
description: Stage all changes and commit with auto-generated message
---

## Your task

Create a git commit with all current changes:

1. Run `git status` and `git diff` to understand what changed
2. Run `git add .` to stage all changes
3. Generate a concise commit message that summarizes the changes (1-2 sentences max)
4. Run `git commit -m "<message>"` with the generated message

Do NOT push to remote. Just commit locally.

If there are no changes to commit, inform the user and stop.

Commit message guidelines:
- Start with a verb (Add, Fix, Update, Remove, Refactor)
- Keep it under 72 characters when possible
- Focus on what changed, not how

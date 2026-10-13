#!/usr/bin/env bash
# One-shot: create the GitHub repo and push.
# Prerequisite (one time, interactive): gh auth login
# Usage: ./scripts/publish-github.sh [repo-name] [--public]
set -euo pipefail

REPO_NAME="${1:-aidlc-zcode}"
VISIBILITY="--private"
[[ "${2:-}" == "--public" ]] && VISIBILITY="--public"

command -v gh >/dev/null || { echo "gh CLI not installed. Install: winget install GitHub.cli"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Not authenticated. Run: gh auth login"; exit 1; }

LOGIN="$(gh api user --jq .login)"
REMOTE="https://github.com/${LOGIN}/${REPO_NAME}.git"

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE"
else
  git remote add origin "$REMOTE"
fi

gh repo create "$REPO_NAME" $VISIBILITY --source . --remote origin --push 2>/dev/null \
  || { echo "repo may exist; pushing existing remote"; git push -u origin main; }

echo "Done: $REMOTE"

#!/usr/bin/env bash
# One-shot publish: creates a PRIVATE GitHub repo and pushes main (+ LFS assets).
# Requires: git, git-lfs (brew install git-lfs / winget install GitHub.GitLFS), gh (brew install gh) logged in via `gh auth login`.
set -euo pipefail
NAME="${1:-lloyd-commons-model}"
command -v git-lfs >/dev/null || { echo "git-lfs missing: brew install git-lfs  (or winget install GitHub.GitLFS)"; exit 1; }
command -v gh >/dev/null || { echo "gh missing: brew install gh"; exit 1; }
gh auth status >/dev/null 2>&1 || gh auth login
if [ ! -d .git ]; then
  git init -q -b main
  git lfs install --local
  git add -A
  git commit -qm "Lloyd Commons megablock model: deterministic generator, Three.js viewer, references, CI"
else
  git lfs install --local
fi
OWNER="$(gh api user --jq .login)"
sed -i.bak "s#github.com/OWNER/lloyd-commons-model#github.com/${OWNER}/${NAME}#" README.md && rm -f README.md.bak
git add README.md && git commit -qm "Point build badge at ${OWNER}/${NAME}" || true
gh repo create "${NAME}" --private --source=. --remote=origin --description "Georeferenced interactive 3D model of the Lloyd Commons megablock, Portland OR" --push
git lfs push --all origin
echo "Published: https://github.com/${OWNER}/${NAME}"

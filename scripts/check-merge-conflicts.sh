#!/usr/bin/env bash
set -euo pipefail

pattern='^(<<<<<<<|=======|>>>>>>>)'

if command -v rg >/dev/null 2>&1; then
  if rg -n --hidden --glob '!.git' --glob '!dist' --glob '!node_modules' "$pattern" .; then
    echo "Merge conflict markers detected."
    exit 1
  fi
else
  if grep -R -nE "$pattern" . --exclude-dir=.git --exclude-dir=dist --exclude-dir=node_modules; then
    echo "Merge conflict markers detected."
    exit 1
  fi
fi

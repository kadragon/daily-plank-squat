#!/usr/bin/env bash
set -euo pipefail

pattern='(describe|it|test)\.only\(|\b(fdescribe|fit)\('

if command -v rg >/dev/null 2>&1; then
  if rg -n "$pattern" src; then
    echo "Focused tests detected (.only/fit/fdescribe)."
    exit 1
  fi
else
  if grep -R -nE "$pattern" src; then
    echo "Focused tests detected (.only/fit/fdescribe)."
    exit 1
  fi
fi

#!/usr/bin/env bash
# Pre-release self-check for the aidlc plugin.
# Lesson from audit: plugins validate does NOT check component paths, and a
# syntactically broken hook script fails OPEN (silently unprotected) — so we
# syntax-check every hook script here.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== 0. node runtime probe =="
# Hooks run via `node` from PATH; a missing node means every hook errors and
# fail-opens. Fail fast with a clear message instead.
if ! command -v node >/dev/null 2>&1; then
  echo "  FAIL: node not found on PATH — AIDLC hooks need Node.js (>= 16). Install it or fix PATH."
  exit 1
fi
echo "  ok  node $(node --version)"

ZC="${ZCODE_CJS:-}"
if [[ -z "$ZC" ]]; then
  for f in "D:/Program Files/ZCode/resources/"*/zcode.cjs; do ZC="$f"; break; done
fi
run() { ELECTRON_RUN_AS_NODE=1 node "$ZC" "$@"; }

echo "== 1. hook scripts syntax =="
fail=0
for f in plugins/aidlc/hooks/scripts/**/*.mjs plugins/aidlc/hooks/scripts/*.mjs; do
  [[ -f "$f" ]] || continue
  node --check "$f" && echo "  ok  $f" || { echo "  FAIL $f"; fail=1; }
done
[[ $fail -eq 0 ]] || exit 1

echo "== 2. guard regression suite =="
node scripts/tests/guard-gates.test.mjs

echo "== 3. manifest =="
run plugins validate plugins/aidlc

echo "== 4. runtime discovery (three lists) =="
run plugins list | grep -A2 "aidlc@"
run skills list | grep -i "aidlc"
run commands list | grep "aidlc:"

echo "ALL CHECKS PASSED"

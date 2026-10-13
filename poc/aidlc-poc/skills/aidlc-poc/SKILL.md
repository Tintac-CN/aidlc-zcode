---
name: aidlc-poc
description: Use when running the AI-DLC POC to prove ZCode plugin mechanics. Invoked by /aidlc-poc:run. It reports the plugin discovery state and confirms commands, skills, subagents and hooks are wired.
---

# AI-DLC POC

This skill is a minimal orchestrator used to validate that a ZCode plugin can drive the AIDLC-ZCode design. When invoked:

1. Confirm this skill was loaded (it is the POC's proof of skill discovery).
2. Report the POC root if `${CLAUDE_PLUGIN_ROOT}` resolves, else state it did not resolve.
3. Instruct the user to run the guard scenario: attempt to write `poc-protected.txt` and confirm the PreToolUse hook blocks it.

Keep the response short. This is a mechanics proof, not a real workflow.

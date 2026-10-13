// AIDLC PreToolUse guard (Edit|Write): hard-deny writes to secret-bearing paths.
// Structured file_path matching only (POC lesson: Bash text matching is bypassable
// and over-blocks reads). This is a process guardrail, not a security boundary.
import { readStdin, parseInput, toolFile, emit } from './lib/state.mjs';

const input = parseInput(readStdin());
const fp = String(toolFile(input));

const PROTECTED = [
  { re: /(^|[\\/])\.env($|\.)|(^|[\\/])\.env\./i, why: 'environment/secret file' },
  { re: /(^|[\\/])secrets?([\\/]|$)/i, why: 'secrets directory' },
  { re: /\.(pem|key)$/i, why: 'private key material' }
];

for (const p of PROTECTED) {
  if (p.re.test(fp)) {
    emit({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `AIDLC guard: "${fp}" is a ${p.why}; automated writes are denied. If a legitimate change is needed, ask the human to make it.`
      }
    });
  }
}

emit(null); // not protected: pass

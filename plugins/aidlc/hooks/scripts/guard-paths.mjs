// AIDLC PreToolUse guard (Edit|Write): hard-deny writes to secret-bearing paths.
// Structured file_path matching only (POC lesson: Bash text matching is bypassable
// and over-blocks reads). This is a process guardrail, not a security boundary.
import { readStdin, parseInput, toolFile, emit, deny } from './lib/state.mjs';

const input = parseInput(readStdin());
const fp = String(toolFile(input)).replace(/\\/g, '/');

// Legitimate template files that deliberately look like env files.
const ALLOWED = /(^|\/)\.env\.(example|sample|template)$/i;

const PROTECTED = [
  { re: /(^|\/)\.env($|\.)/i, why: 'environment/secret file' },
  { re: /(^|\/)\.envrc$/i, why: 'direnv file' },
  { re: /(^|\/)secrets?($|\/)/i, why: 'secrets directory' },
  { re: /\.(pem|key|p12|pfx|jks|keystore)$/i, why: 'private key material' },
  { re: /(^|\/)id_(rsa|ed25519|ecdsa|dsa)($|\.)/i, why: 'SSH private key' },
  { re: /(^|\/)\.netrc$/i, why: 'credential file' },
  { re: /(^|\/)\.aws(\/|$)/i, why: 'cloud credentials' },
  { re: /(^|\/)docker\/config\.json$/i, why: 'registry credentials' }
];

if (!ALLOWED.test(fp)) {
  for (const p of PROTECTED) {
    if (p.re.test(fp)) {
      deny(`AIDLC guard: "${fp}" looks like a ${p.why}; automated writes are denied. If a legitimate change is needed, ask the human to make it.`);
    }
  }
}

emit(null); // not protected: pass

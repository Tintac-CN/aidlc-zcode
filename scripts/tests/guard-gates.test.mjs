// Consolidated regression tests for the aidlc plugin's guard hooks.
// Run from the repo root:  node scripts/tests/guard-gates.test.mjs
// These exist because a broken hook fails OPEN — every guard rule here is a
// promise in SKILL.md; if one regresses, protection silently disappears.
import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const S = path.join(REPO, 'plugins', 'aidlc', 'hooks', 'scripts');
const T = path.join(os.tmpdir(), 'aidlc-guardtest-' + Date.now());

fs.mkdirSync(path.join(T, 'docs', 'aidlc', 'demo', 'units'), { recursive: true });
const STATE = {
  slug: 'demo', phase: 'inception',
  gates: { gate1: 'pending', gate2: 'pending' },
  tddLock: false, tddLockPaths: [], tddLockOverride: null,
  updatedAt: '2026-10-13T11:00:00Z',
  history: [{ at: '2026-10-13T11:00:00Z', from: 'none', to: 'inception', why: 'created' }]
};
const SP = path.join(T, 'docs', 'aidlc', 'demo', 'state.json');
fs.writeFileSync(SP, JSON.stringify(STATE, null, 2));
fs.writeFileSync(path.join(T, 'docs', 'aidlc', 'demo', 'decisions.md'),
  '# Decisions\n\n> 回执格式：`GATE-APPROVED <gate> <日期>`（这是说明文字，不是回执）\n');

function hook(script, payload) {
  try {
    return cp.execSync(`node "${path.join(S, script)}"`, { input: JSON.stringify(payload), encoding: 'utf8' });
  } catch (e) { return 'ERR ' + String(e.stderr || e.message).slice(0, 100); }
}
const w = (fp, content) => ({ cwd: T, tool_name: 'Write', tool_input: { file_path: fp, content } });
const e = (fp, ns) => ({ cwd: T, tool_name: 'Edit', tool_input: { file_path: fp, new_string: ns } });

let bad = 0, n = 0;
function t(name, script, payload, want) {
  n++;
  const out = hook(script, payload);
  const got = out ? 'DENY' : 'PASS';
  const ok = got === want;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${got.padEnd(5)} ${name}`);
  if (!ok && out.length > 10) console.log('      ->', String(out).slice(0, 160));
}

/* Rule 1 — construction artifacts need gate1 */
t('R1 plan.md before gate1 denied', 'guard-gates.mjs', w(SP.replace('state.json', 'plan.md'), '# plan'), 'DENY');
t('R1 units/u1.md before gate1 denied', 'guard-gates.mjs', w(path.join(T, 'docs', 'aidlc', 'demo', 'units', 'u1.md'), 'x'), 'DENY');
t('R1 uppercase DOCS/AIDLC path still denied (case-insensitive)', 'guard-gates.mjs',
  w(path.join(T, 'DOCS', 'AIDLC', 'demo', 'plan.md').replace(/\\/g, '/'), '# plan'), 'DENY');

/* Rule 2 — TDD lock */
fs.writeFileSync(SP, JSON.stringify({ ...STATE, tddLock: true }, null, 2));
t('R2 test edit under tddLock denied', 'guard-gates.mjs', e(path.join(T, 'src', 'app.test.ts'), 'x'), 'DENY');
t('R2 FooTest.java (Java convention) denied', 'guard-gates.mjs', e(path.join(T, 'src', 'FooTest.java'), 'x'), 'DENY');
t('R2 foo_spec.rb (Ruby convention) denied', 'guard-gates.mjs', e(path.join(T, 'src', 'foo_spec.rb'), 'x'), 'DENY');
// scoped lock: only listed paths are contracts
fs.writeFileSync(SP, JSON.stringify({ ...STATE, tddLock: true, tddLockPaths: ['tests/test_export.py'] }, null, 2));
t('R2 in-scope locked test denied', 'guard-gates.mjs', e(path.join(T, 'tests', 'test_export.py'), 'x'), 'DENY');
t('R2 out-of-scope test passes (scoped lock)', 'guard-gates.mjs', e(path.join(T, 'src', 'app.test.ts'), 'x'), 'PASS');
fs.writeFileSync(SP, JSON.stringify({ ...STATE, tddLock: true, tddLockOverride: { by: 'human', at: '2026-10-13', reason: 'r' } }, null, 2));
t('R2 test edit with override passes', 'guard-gates.mjs', e(path.join(T, 'src', 'app.test.ts'), 'x'), 'PASS');
fs.writeFileSync(SP, JSON.stringify(STATE, null, 2));

/* Rule 3 — receipt strictly required, with round semantics (Write-based: Edit
   on state.json is denied by Rule 6, so approvals arrive as full writes). */
const approvedState = JSON.stringify({ ...STATE, gates: { gate1: 'approved', gate2: 'pending' } }, null, 2);
const DEC = path.join(T, 'docs', 'aidlc', 'demo', 'decisions.md');
t('R3 approved w/o receipt denied', 'guard-gates.mjs', w(SP, approvedState), 'DENY');
fs.writeFileSync(DEC, '# Decisions\n\n> 回执格式：`GATE-APPROVED gate1 <日期>`（说明文字，不得充当回执）\n');
t('R3 scaffold prose does NOT count as receipt', 'guard-gates.mjs', w(SP, approvedState), 'DENY');
fs.writeFileSync(DEC, '# Decisions\n\n人类批准意见原文。\nGATE-APPROVED gate1 2026-10-13\n');
t('R3 strict receipt line passes', 'guard-gates.mjs', w(SP, approvedState), 'PASS');
// round semantics: a later rejection voids the earlier receipt
fs.writeFileSync(DEC, '# Decisions\n\nGATE-APPROVED gate1 2026-10-13\nGATE-REJECTED gate1 2026-10-14\n');
t('R3 stale receipt after rejection denied', 'guard-gates.mjs', w(SP, approvedState), 'DENY');
fs.writeFileSync(DEC, '# Decisions\n\nGATE-APPROVED gate1 2026-10-13\nGATE-REJECTED gate1 2026-10-14\n复审通过。\nGATE-APPROVED gate1 2026-10-15\n');
t('R3 fresh receipt after rejection passes', 'guard-gates.mjs', w(SP, approvedState), 'PASS');
fs.writeFileSync(DEC, '# Decisions\n\n> 回执格式：`GATE-APPROVED <gate> <日期>`（这是说明文字，不是回执）\n');

/* Rule 4 — history optimistic lock */
t('R4 overwrite dropping history denied', 'guard-gates.mjs', w(SP, JSON.stringify({ ...STATE, history: [] })), 'DENY');
t('R4 overwrite keeping history passes', 'guard-gates.mjs', w(SP, JSON.stringify({ ...STATE, updatedAt: '2026-10-13T12:00:00Z', history: [...STATE.history, { at: '2026-10-13T12:00:00Z', from: 'a', to: 'b', why: 'w' }] })), 'PASS');

/* Rule 5/6 — decisions.md append-only AND Write-only (Edit can rewrite anywhere) */
fs.writeFileSync(DEC, '# Decisions\n\n已有裁决\n');
t('R5 decisions rewrite denied', 'guard-gates.mjs', w(DEC, '# Decisions\n\n篡改\n'), 'DENY');
t('R5 decisions pure append passes', 'guard-gates.mjs', w(DEC, fs.readFileSync(DEC, 'utf8') + '新裁决\n'), 'PASS');
t('R6 decisions Edit denied (old_string can hit anywhere)', 'guard-gates.mjs', e(DEC, '已有裁决'), 'DENY');
t('R6 state.json Edit denied (forces Write + optimistic lock)', 'guard-gates.mjs', e(SP, '"tddLock": true'), 'DENY');

/* Fail-closed — corrupt state.json must not silently disable guards */
fs.mkdirSync(path.join(T, 'docs', 'aidlc', 'broken'), { recursive: true });
fs.writeFileSync(path.join(T, 'docs', 'aidlc', 'broken', 'state.json'), '{ not json !!!');
fs.writeFileSync(path.join(T, 'docs', 'aidlc', 'broken', 'decisions.md'), '# Decisions\n\n（无回执）\n');
t('FC corrupt state: plan.md write denied', 'guard-gates.mjs',
  w(path.join(T, 'docs', 'aidlc', 'broken', 'plan.md'), '# plan'), 'DENY');
t('FC corrupt state: repair Write w/o receipt denied', 'guard-gates.mjs',
  w(path.join(T, 'docs', 'aidlc', 'broken', 'state.json'), approvedState), 'DENY');
fs.writeFileSync(path.join(T, 'docs', 'aidlc', 'broken', 'decisions.md'),
  '# Decisions\n\nGATE-APPROVED gate1 2026-10-13\n');
t('FC corrupt state: repair Write with receipt passes', 'guard-gates.mjs',
  w(path.join(T, 'docs', 'aidlc', 'broken', 'state.json'), approvedState.replace('demo', 'broken')), 'PASS');

/* guard-paths spot checks */
t('P .env write denied', 'guard-paths.mjs', w(path.join(T, '.env'), 'K=v'), 'DENY');
t('P .env.example allowed', 'guard-paths.mjs', w(path.join(T, '.env.example'), 'K='), 'PASS');

/* guard-tests: raw lock hit warns about contract; override hit reminds to re-lock */
fs.writeFileSync(SP, JSON.stringify({ ...STATE, tddLock: true }, null, 2));
{
  const out = hook('guard-tests.mjs', e(path.join(T, 'src', 'app.test.ts'), 'x'));
  const ok = out.includes('TDD-lock warning');
  n++; if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}      guard-tests warns on raw lock hit`);
}
fs.writeFileSync(SP, JSON.stringify({ ...STATE, tddLock: true, tddLockOverride: { by: 'human', at: '2026-10-13', reason: 'r' } }, null, 2));
{
  const out = hook('guard-tests.mjs', e(path.join(T, 'src', 'app.test.ts'), 'x'));
  const ok = out.includes('override') && out.includes('/aidlc:lock-tests');
  n++; if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}      guard-tests override branch reminds to re-lock`);
}
fs.writeFileSync(SP, JSON.stringify(STATE, null, 2));

/* session-context: updatedAt ranking + done/archived filter + unitStatus */
fs.mkdirSync(path.join(T, 'docs', 'aidlc', 'old'), { recursive: true });
fs.writeFileSync(path.join(T, 'docs', 'aidlc', 'old', 'state.json'), JSON.stringify({ slug: 'old', phase: 'done', updatedAt: '2026-10-13T23:00:00Z' }));
fs.mkdirSync(path.join(T, 'docs', 'aidlc', 'dead'), { recursive: true });
fs.writeFileSync(path.join(T, 'docs', 'aidlc', 'dead', 'state.json'), JSON.stringify({ slug: 'dead', phase: 'archived', updatedAt: '2026-10-13T22:00:00Z' }));
fs.writeFileSync(SP, JSON.stringify({ ...STATE, phase: 'construction', unitStatus: { U1: 'done', U2: 'pending' } }, null, 2));
{
  const out = hook('session-context.mjs', { cwd: T });
  const ok = out.includes('demo') && !out.includes('old') && !out.includes('dead') && out.includes('Units: 1/2 done') && out.includes('U2');
  n++; if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}      session-context ranks by updatedAt, skips done/archived, shows unitStatus`);
}

fs.rmSync(T, { recursive: true, force: true });
console.log(bad ? `\n${bad}/${n} FAILED` : `\nALL ${n} SCENARIOS PASSED`);
process.exit(bad ? 1 : 0);

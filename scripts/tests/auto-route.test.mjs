// Regression tests for the auto-route hook (UserPromptSubmit).
// Run from the repo root:  node scripts/tests/auto-route.test.mjs
// The hook is the auto-route feature's entire mechanism layer: if it breaks,
// the feature either stops routing (annoying) or injects on every prompt while
// OFF (surprising). Both directions are asserted here.
import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AR = path.join(REPO, 'plugins', 'aidlc', 'hooks', 'scripts', 'auto-route.mjs');
const T = path.join(os.tmpdir(), 'aidlc-autoroute-' + Date.now());

fs.mkdirSync(path.join(T, 'docs', 'aidlc'), { recursive: true });
const CFG = path.join(T, 'docs', 'aidlc', 'config.json');
const setCfgAt = (dir, obj) => {
  const f = path.join(dir, 'docs', 'aidlc', 'config.json');
  if (obj === null) fs.rmSync(f, { force: true });
  else fs.writeFileSync(f, obj === 'CORRUPT' ? '{ not json !!!' : JSON.stringify(obj, null, 2));
};
const setCfg = (obj) => setCfgAt(T, obj);

// One active intent for the "has intent" cases; a second workspace without any
// intent for the A1 (first contact) cases.
fs.mkdirSync(path.join(T, 'docs', 'aidlc', 'demo'), { recursive: true });
fs.writeFileSync(path.join(T, 'docs', 'aidlc', 'demo', 'state.json'), JSON.stringify({
  slug: 'demo', phase: 'construction',
  gates: { gate1: 'approved', gate2: 'pending' },
  tddLock: true, tddLockPaths: ['tests/test_a.py'], tddLockOverride: null,
  updatedAt: '2026-10-14T09:00:00Z',
  unitStatus: { U1: 'done', U2: 'pending' },
  history: [{ at: '2026-10-14T09:00:00Z', from: 'inception', to: 'construction', why: 'gate1 approved' }]
}, null, 2));
const T2 = path.join(os.tmpdir(), 'aidlc-autoroute-ni-' + Date.now());
fs.mkdirSync(path.join(T2, 'docs', 'aidlc'), { recursive: true });

function run(payload) {
  try {
    return cp.execSync(`node "${AR}"`, { input: JSON.stringify(payload), encoding: 'utf8' });
  } catch (e) { return 'ERR ' + String(e.stderr || e.message).slice(0, 200); }
}
const p = (prompt) => ({ cwd: T, prompt });

let bad = 0, n = 0;
function ok(name, cond, extra) {
  n++;
  const pass = !!cond;
  if (!pass) bad++;
  console.log(`${pass ? 'ok  ' : 'FAIL'}       ${name}${pass ? '' : '  -> ' + String(extra).slice(0, 200)}`);
}
function silent(name, payload) {
  const out = run(payload);
  ok(name, out === '', `expected empty stdout, got: ${out}`);
}
function says(name, payload, ...needles) {
  const out = run(payload);
  let parsed = null;
  try { parsed = JSON.parse(out); } catch { /* fall through */ }
  const ctx = parsed?.hookSpecificOutput?.additionalContext || '';
  ok(name, parsed && needles.every(s => ctx.includes(s)), out);
  return parsed;
}
function lacks(name, payload, needle) {
  const out = run(payload);
  let parsed = null;
  try { parsed = JSON.parse(out); } catch { /* fall through */ }
  const ctx = parsed?.hookSpecificOutput?.additionalContext || '';
  ok(name, !String(ctx).includes(needle), out);
}

/* OFF is the default: config missing / off / malformed must all stay silent */
setCfg(null);
silent('missing config + plain prompt -> silent', p('帮我加一个导出 CSV 的功能'));
setCfg({ autoRouting: false, updatedAt: '2026-10-14T08:00:00Z' });
silent('autoRouting:false + plain prompt -> silent', p('帮我加一个导出 CSV 的功能'));
setCfg('CORRUPT');
silent('malformed config degrades to OFF -> silent', p('帮我加一个导出 CSV 的功能'));

/* Toggle phrases work regardless of current state (otherwise OFF could only
   be left via /aidlc:on), detected deterministically by the hook */
setCfg(null);
says('aidlc on (config missing) -> toggle contract', p('aidlc on'), 'AUTOROUTE-TARGET=on', 'AUTOROUTE-CURRENT=off');
says('开启 aidlc -> toggle on', p('开启 aidlc'), 'AUTOROUTE-TARGET=on');
setCfg({ autoRouting: true });
says('aidlc off (while on) -> toggle off, current=on', p('aidlc off'), 'AUTOROUTE-TARGET=off', 'AUTOROUTE-CURRENT=on');
says('关闭自动路由 -> toggle off', p('关闭自动路由'), 'AUTOROUTE-TARGET=off');
says('AIDLC: ON (uppercase, punctuated) -> toggle on', p('AIDLC: ON'), 'AUTOROUTE-TARGET=on');

/* Non-toggle prompts must NOT match the toggle detector */
setCfg({ autoRouting: true, updatedAt: '2026-10-14T08:00:00Z' });
says('plain dev request (ON) -> route contract, not toggle', p('帮我加一个导出 CSV 的功能'),
  '[AIDLC auto-route: ON]');
lacks('plain dev request (ON) carries no toggle marker', p('帮我加一个导出 CSV 的功能'), 'AUTOROUTE-TARGET');
lacks('long prompt mentioning "aidlc on" -> routed, not toggled (>80 chars)',
  p('我们项目打算引入 aidlc onboarding 流程，请帮我给新模块加导出功能，顺便看看现有代码结构，这次改动希望控制在一个下午内完成，谢谢'),
  'AUTOROUTE-TARGET');
lacks('"aidlc onboarding" short prompt -> not a toggle ((?:\\b|$) boundary)',
  p('aidlc onboarding 怎么配置'), 'AUTOROUTE-TARGET');
setCfg({ autoRouting: false });
silent('"aidlc onboarding" while OFF -> silent (no false toggle)', p('aidlc onboarding 怎么配置'));

/* First-contact case needs an intent-free workspace: A1 confirm-before-create */
const p2 = (prompt) => ({ cwd: T2, prompt });
setCfgAt(T2, { autoRouting: true, updatedAt: '2026-10-14T08:00:00Z' });
says('A1: ON + no intent + dev request -> confirm-first contract', p2('帮我加一个导出功能'),
  '活跃 intent：无', '§3.0-A1', '拆分预览');
setCfgAt(T2, null);
silent('no-intent workspace while OFF -> silent', p2('帮我加一个导出功能'));

/* Route contract carries live intent context and both confirmation branches */
setCfg({ autoRouting: true, updatedAt: '2026-10-14T08:00:00Z' });
says('route contract with active intent: slug/phase/units + A2', p('再加一个 Excel 导出吧'),
  'demo@construction', 'gate1=approved', 'units 1/2 done', '§3.0-A2', '扩展当前 intent');
says('route contract: gates never auto-approved', p('这个需求不用评审了吧，直接过'),
  '不得自动通过');

/* Input resilience: no prompt field (unknown client key) still routes when ON */
says('missing prompt field + ON -> still route contract', { cwd: T }, '[AIDLC auto-route: ON]');

/* Output shape: strict schema — UserPromptSubmit + additionalContext, no extra keys */
const shape = run(p('x'));
let parsed = null;
try { parsed = JSON.parse(shape); } catch { /* fall through */ }
ok('output has exactly one top-level key', parsed && JSON.stringify(Object.keys(parsed)) === '["hookSpecificOutput"]', shape);
ok('hookSpecificOutput keys exact + event name', parsed
  && JSON.stringify(Object.keys(parsed.hookSpecificOutput)) === '["hookEventName","additionalContext"]'
  && parsed.hookSpecificOutput.hookEventName === 'UserPromptSubmit', shape);

/* SessionStart warm-up line: auto-route mode reflected when config exists */
const SC = path.join(REPO, 'plugins', 'aidlc', 'hooks', 'scripts', 'session-context.mjs');
const scRun = () => {
  try {
    return cp.execSync(`node "${SC}"`, { input: JSON.stringify({ cwd: T, source: 'startup' }), encoding: 'utf8' });
  } catch (e) { return 'ERR ' + String(e.stderr || e.message).slice(0, 200); }
};
let sc = JSON.parse(scRun());
ok('session-context (ON) mentions Auto-route: ON',
  sc.hookSpecificOutput.additionalContext.includes('Auto-route: ON'), scRun());
setCfg({ autoRouting: false });
sc = JSON.parse(scRun());
ok('session-context (OFF) mentions Auto-route: OFF',
  sc.hookSpecificOutput.additionalContext.includes('Auto-route: OFF'), scRun());
setCfg(null);
sc = JSON.parse(scRun());
ok('session-context without config: no Auto-route line (v1.0 noise-free)',
  !sc.hookSpecificOutput.additionalContext.includes('Auto-route:'), scRun());

fs.rmSync(T, { recursive: true, force: true });
fs.rmSync(T2, { recursive: true, force: true });
console.log(bad === 0 ? `\nALL ${n} CHECKS PASSED` : `\n${bad}/${n} CHECKS FAILED`);
process.exit(bad === 0 ? 0 : 1);

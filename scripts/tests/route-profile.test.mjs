// F1 route echo — regression suite (U3). Run from the repo root:
//   node scripts/tests/route-profile.test.mjs
// Contract sources (in order):
//   docs/aidlc/next-phase/units/u3.md
//   docs/aidlc/next-phase/architecture.md 数据模型 route 回显语义 + 决策 #12
// Three echo states asserted against BOTH injectors (同构，D11 只注入不分类):
//   auto-route.mjs (UserPromptSubmit, only while cfg autoRouting:true)
//   session-context.mjs (SessionStart, after the active-intent lines)
//   1. state.json has NO route field  → zero echo, v1.1 output byte-identical (T03)
//   2. route = "turbo" / 1 (invalid)  → `route=<原值>(invalid→classic)` passthrough (T06)
//   3. route = "express"/"classic"    → `route=<值>` echoed verbatim, no "(invalid…)" (T06)
//   4. config off/malformed/missing   → zero injection, unaffected by route (T08)
// Zero-echo is pinned on the echo marker 'route=': the literal word "route"
// already occurs in pre-F1 output ("[AIDLC auto-route: ON]", "Auto-route: …"),
// so byte-level v1.1 stability means no DECISION-#12 marker may appear.
//
// TDD RED stage note: neither hook echoes route today, so every echo/placement
// expectation below is EXPECTED TO FAIL until U3 lands. The T03/T08 zero-injection
// locks must STAY green. Do not weaken assertions to pass — implement the contract.
import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AR = path.join(REPO, 'plugins', 'aidlc', 'hooks', 'scripts', 'auto-route.mjs');
const SC = path.join(REPO, 'plugins', 'aidlc', 'hooks', 'scripts', 'session-context.mjs');
const T = path.join(os.tmpdir(), 'aidlc-routeprofile-' + Date.now());

fs.mkdirSync(path.join(T, 'docs', 'aidlc', 'demo'), { recursive: true });
const CFG = path.join(T, 'docs', 'aidlc', 'config.json');
const STATE = path.join(T, 'docs', 'aidlc', 'demo', 'state.json');
const setCfg = (obj) => {
  if (obj === null) fs.rmSync(CFG, { force: true });
  else fs.writeFileSync(CFG, obj === 'CORRUPT' ? '{ not json !!!' : JSON.stringify(obj, null, 2));
};
setCfg({ autoRouting: true, updatedAt: '2026-10-14T08:00:00Z' });

const BASE = {
  slug: 'demo', phase: 'construction',
  gates: { gate1: 'approved', gate2: 'pending' },
  updatedAt: '2026-10-14T09:00:00Z',
  history: [{ at: '2026-10-14T09:00:00Z', from: 'none', to: 'inception', why: 'created' }]
};
const setState = (over = {}) => fs.writeFileSync(STATE, JSON.stringify({ ...BASE, ...over }, null, 2));
setState();

function run(script, payload) {
  try {
    return cp.execSync(`node "${script}"`, { input: JSON.stringify(payload), encoding: 'utf8' });
  } catch (e) { return 'ERR ' + String(e.stderr || e.message).slice(0, 200); }
}
// Plain non-toggle prompt: exercises the routeContract path while ON.
const arRun = () => run(AR, { cwd: T, prompt: 'x' });
const scRun = () => run(SC, { cwd: T, source: 'startup' });
function ctx(out) {
  try { return JSON.parse(out)?.hookSpecificOutput?.additionalContext ?? null; } catch { return null; }
}

let bad = 0, n = 0;
function ok(name, cond, extra) {
  n++;
  const pass = !!cond;
  if (!pass) bad++;
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}${pass ? '' : '  -> ' + String(extra).slice(0, 300)}`);
}

/* ─── T03 — state 无 route 字段：零回显，v1.1 字节级一致 ─── */
setState({});
{
  const c = ctx(arRun());
  ok('T03 auto-route: state 无 route → 注入不含 route= 回显标记（v1.1 零 diff）',
    typeof c === 'string' && !c.includes('route=') && !c.includes('invalid→classic')
    && c.includes('活跃 intent：demo@construction（gate1=approved, gate2=pending）。'),
    arRun());
}
{
  const c = ctx(scRun());
  ok('T03 session-context: state 无 route → 注入不含 route= 回显标记（v1.1 零 diff）',
    typeof c === 'string' && !c.includes('route=') && !c.includes('invalid→classic')
    && c.includes('Gates: gate1=approved, gate2=pending'),
    scRun());
}

/* ─── T06 — 非法值：原值透传 + (invalid→classic)，两个注入器同构 ─── */
for (const [val, marker] of [['turbo', 'route=turbo(invalid→classic)'], [1, 'route=1(invalid→classic)']]) {
  setState({ route: val });
  const ac = ctx(arRun());
  const scc = ctx(scRun());
  ok(`T06 auto-route: route=${JSON.stringify(val)} → ${marker}`,
    typeof ac === 'string' && ac.includes(marker), arRun());
  ok(`T06 session-context: route=${JSON.stringify(val)} → ${marker}`,
    typeof scc === 'string' && scc.includes(marker), scRun());
}

/* ─── T06 — 合法值：原样回显，不携带 invalid 标注 ─── */
for (const val of ['express', 'classic']) {
  setState({ route: val });
  const ac = ctx(arRun());
  const scc = ctx(scRun());
  ok(`T06 auto-route: route=${val} → 原样回显 route=${val}（无 invalid 标注）`,
    typeof ac === 'string' && ac.includes(`route=${val}`) && !ac.includes('invalid→classic'),
    arRun());
  ok(`T06 session-context: route=${val} → 原样回显 route=${val}（无 invalid 标注）`,
    typeof scc === 'string' && scc.includes(`route=${val}`) && !scc.includes('invalid→classic'),
    scRun());
}

/* ─── 落位 — 回显随摘要注入：auto-route 契约头行区、session-context 活跃 intent 行后 ─── */
setState({ route: 'express' });
{
  const c = ctx(arRun());
  const idx = typeof c === 'string' ? c.indexOf('route=express') : -1;
  ok('落位 auto-route: route 回显位于契约头行区（活跃 intent 行之后、判定清单之前）',
    idx > -1
    && idx > c.indexOf('活跃 intent：')
    && idx < c.indexOf('处理前先加载'),
    arRun());
}
{
  const c = ctx(scRun());
  const idx = typeof c === 'string' ? c.indexOf('route=express') : -1;
  ok('落位 session-context: route 回显位于活跃 intent 行之后',
    idx > -1 && idx > c.indexOf('AIDLC active intent:'),
    scRun());
}

/* ─── T08 — config off/畸形/缺失：零注入，不受 route 影响（既有 opt-in 惯例） ─── */
setState({ route: 'express' });
setCfg({ autoRouting: false, updatedAt: '2026-10-14T08:00:00Z' });
ok('T08 autoRouting:false + route=express → 零注入（silent）', arRun() === '', arRun());
setCfg('CORRUPT');
ok('T08 config 畸形 + route=express → 零注入（silent）', arRun() === '', arRun());
setCfg(null);
ok('T08 config 缺失 + route=express → 零注入（silent）', arRun() === '', arRun());

fs.rmSync(T, { recursive: true, force: true });
console.log(bad ? `\n${bad}/${n} FAILED` : `\nALL ${n} CHECKS PASSED`);
process.exit(bad ? 1 : 0);

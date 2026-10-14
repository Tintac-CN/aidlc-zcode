// AIDLC gate guard (PreToolUse, Edit|Write). Enforces what SKILL.md promises:
//   Rule 1  Construction artifacts (plan.md / units/) require gate1 approved.
//   Rule 2  While tddLock is on, locked test files are contracts — edits denied
//           until a human-approved override exists (/aidlc:unlock-tests).
//           Scope: tddLockPaths (recorded at lock time) when non-empty;
//           otherwise every test file in the repo (legacy-intent behavior).
//   Rule 3  Writing gates.* = "approved" into state.json requires a prior human
//           approval receipt (GATE-APPROVED <gate> <date>) in decisions.md,
//           and that receipt must be MORE RECENT than any GATE-REJECTED line
//           for the same gate (a rejection voids earlier approvals).
//   Rule 4  state.json full overwrites must preserve every existing history entry
//           (append-only history = optimistic lock against concurrent writers)
//           AND every existing preserveKey (route / testBaseline / unitStatus /
//           tddLock / tddLockPaths — architecture decision #11: key loss is
//           denied, value changes pass; the corrupt-repair path is exempt and
//           disclosed via /aidlc:resume instead).
//   Rule 7  (F4, deny-only) at the phase→gate1 transition the prd "## 验收标准"
//           section and the test-strategy "## 测试点清单"表 "映射 AC" column are
//           mechanically compared: missing artifact(s) = deny; coverage gaps
//           (P−T≠∅) and phantom ACs (T−P≠∅) = deny; artifacts present but
//           unparseable (no section / P=∅ / mixed conventions / no 映射 AC
//           header) = allow WITH disclosure (never silent). The same check runs
//           on brand-new intents whose first state.json write already claims
//           phase=gate1 or gate1=approved (bypass-a closure). The corrupt-repair
//           path stays exempt (bypass-b disclosure). guard-gates never reads
//           state.route for any branch decision — express does not weaken
//           guards.
//   Rule 5  decisions.md is append-only: full overwrite allowed only on creation
//           or as a pure append (existing content preserved verbatim as prefix).
//   Rule 6  state.json / decisions.md are Write-only: Edit's old_string can match
//           ANYWHERE in the file, so an Edit can silently rewrite history that
//           Rules 4/5 only inspect on full writes.
//   Fail-closed: a path belonging to an intent whose state.json exists but is
//   unparseable is denied — EXCEPT rewriting that state.json itself via Write
//   (the repair path, still receipt-checked), so corruption is fixable but
//   never silently disables the guards.
// This is process enforcement, not a security boundary (Bash writes still bypass).
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  readStdin, parseInput, projectDir, toolFile,
  findActiveIntent, loadIntent, slugOfPath, isTestFile, emit, deny
} from './lib/state.mjs';

const input = parseInput(readStdin());
const root = projectDir(input);
const fp = String(toolFile(input)).replace(/\\/g, '/');
const ti = input.tool_input || input.toolInput || {};
const isEdit = /edit/i.test(String(input.tool_name || input.toolName || ''));

// Rule 3 core, shared by the normal path and the corrupt-state repair path:
// every gate being set to "approved" needs a live human receipt in decisions.md.
// Round semantics: a GATE-REJECTED line for the same gate voids every APPROVED
// receipt above it — re-approval after a rejection needs a fresh receipt.
function checkGateReceipts(text, intentDir) {
  const hits = text.match(/"(gate1|gate2)"\s*:\s*"approved"/g) || [];
  for (const hit of hits) {
    const g = hit.match(/gate1|gate2/)[0];
    const decPath = join(intentDir, 'decisions.md');
    let receipt = '';
    try { receipt = existsSync(decPath) ? readFileSync(decPath, 'utf8') : ''; } catch { /* treat as absent */ }
    const approvedRe = new RegExp(`^GATE-APPROVED\\s+${g}\\s+\\d{4}-\\d{2}-\\d{2}\\s*$`);
    const rejectedRe = new RegExp(`^GATE-REJECTED\\s+${g}\\s+\\d{4}-\\d{2}-\\d{2}\\s*$`);
    let lastApproved = -1, lastRejected = -1;
    receipt.split('\n').forEach((ln, i) => {
      if (approvedRe.test(ln)) lastApproved = i;
      if (rejectedRe.test(ln)) lastRejected = i;
    });
    if (lastApproved === -1 || lastApproved < lastRejected) {
      deny(`AIDLC 门控：检测到把 ${g} 置为 approved，但 decisions.md 缺少有效的人类审批回执（需要独立一行、格式严格为 "GATE-APPROVED ${g} YYYY-MM-DD"，且必须晚于最近一条 "GATE-REJECTED ${g} YYYY-MM-DD"——打回后旧回执作废，须重新审批）。请运行 /aidlc:gate，把审批结论逐字写入 decisions.md 之后，再更新 state.json。`);
    }
  }
}

// Allow WITH disclosure — same strict schema as deny (PreToolUse +
// permissionDecision/Reason). Used only by the F4 unparseable branch, which is
// a disclosed fail-open, never a silent one.
function allowWith(reason) {
  emit({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: String(reason).replace(/[\x00-\x1f]/g, ' ')
    }
  });
}

/* ─── F4 mechanical AC↔test-point coverage (architecture "F4 机械校验规格") ─── */

// Keys an overwrite may not DROP (decision #11). Value changes always pass;
// tddLockOverride is deliberately NOT in the set (unlock semantics undefined).
const PRESERVE_KEYS = ['route', 'testBaseline', 'unitStatus', 'tddLock', 'tddLockPaths'];

// AC number token: ACn or ACn.m, not followed by an optional dot + letter —
// `AC1.x`-style placeholders therefore never match (R2 修订：响应 m-N4).
const AC_TOKEN_G = /AC\d+(?:\.\d+)?(?!\.?[A-Za-z])/g;
const AC_TOKEN_FULL = /^(?:AC\d+(?:\.\d+)?(?!\.?[A-Za-z]))$/; // whole-token match only

// Range/range-like notation inside a mapped-column cell → the WHOLE cell is
// culled (both ends produce no T evidence —宁可少算交人工，不可多算假覆盖).
// R3: plain hyphen counts too, so `AC1.1 - AC4.4` cannot smuggle two tokens in.
const RANGE_CULL = /[–—~～\-－]|\.\.|…|至|到/;

function linesOf(raw) {
  return String(raw).replace(/^\ufeff/, '').split(/\r?\n/).map(l => l.replace(/\r$/, ''));
}

// Steps 1–3: locate the `## 验收标准` section (prefix match — the real heading
// is `## 验收标准（可测）`; `### ` does not end it), harvest AC tokens, then
// normalize granularity. Sub-numbered tokens win; a bare ACn is dropped as a
// group cover only when its group has sub-numbers, otherwise it is 约定混提.
// Returns {status:'ok', mode:'sub'|'flat', P:Set} | {status:'unparseable', why}.
function extractP(raw) {
  const lines = linesOf(raw);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^## 验收标准/.test(lines[i])) { start = i + 1; break; }
  }
  if (start === -1) return { status: 'unparseable', why: 'prd.md 存在但找不到「## 验收标准」小节' };
  const body = [];
  for (let i = start; i < lines.length; i++) {
    if (/^##(?!#)/.test(lines[i])) break;
    body.push(lines[i]);
  }
  const tokens = body.join('\n').match(AC_TOKEN_G) || [];
  const subs = tokens.filter(t => t.includes('.'));
  const bares = tokens.filter(t => !t.includes('.'));
  if (subs.length) {
    const groups = new Set(subs.map(t => t.split('.')[0]));
    const orphans = bares.filter(b => !groups.has(b));
    if (orphans.length) {
      return { status: 'unparseable', why: `prd 验收标准小节约定混提：子编号与无法归组的裸组编号（${orphans.join(', ')}）并存，不猜测不展开` };
    }
    return { status: 'ok', mode: 'sub', P: new Set(subs) };
  }
  return { status: 'ok', mode: 'flat', P: new Set(bares) };
}

// Markdown table row → cells; `\|` is an escaped literal pipe, not a boundary.
function splitTableRow(line) {
  const cells = [];
  let cur = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\\' && line[i + 1] === '|') { cur += '|'; i++; continue; }
    if (ch === '|') { cells.push(cur); cur = ''; continue; }
    cur += ch;
  }
  cells.push(cur);
  return cells.map(c => c.trim());
}

const isSeparatorRow = cells =>
  cells.length > 1 && cells.every(c => c === '' || /^:?-{2,}:?$/.test(c));

// Step 4: T evidence comes ONLY from the "映射 AC" column cells of the
// `## 测试点清单` table — the column is located by its HEADER NAME, not by
// position; the header row and the |---| separator row are skipped; everything
// outside the column (scene prose, examples like 例如 AC99) yields no evidence.
// Cells are culled whole on range notation; surviving cells are split on
// `[，,、/\s]+` and a token enters T iff it FULLY matches the AC regex and
// carries P's granularity. Missing table/header → unparseable (allow+disclose).
function extractT(raw, mode) {
  const lines = linesOf(raw);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s*测试点清单/.test(lines[i])) { start = i + 1; break; }
  }
  if (start === -1) return { status: 'unparseable', why: 'test-strategy.md 缺少「## 测试点清单」表' };
  const T = new Set();
  let col = -1;
  for (let i = start; i < lines.length; i++) {
    const ln = lines[i];
    if (/^##(?!#)/.test(ln)) break;
    const row = ln.trim();
    if (!row.startsWith('|')) continue;
    const cells = splitTableRow(row);
    if (isSeparatorRow(cells)) continue;
    if (col === -1) {
      const idx = cells.indexOf('映射 AC');
      if (idx !== -1) col = idx; // header row located; its own cells yield nothing
      continue;
    }
    const cell = cells[col];
    if (cell === undefined || cell === '') continue;
    if (RANGE_CULL.test(cell)) continue;
    for (const tok of cell.split(/[，,、/\s]+/)) {
      if (!tok || !AC_TOKEN_FULL.test(tok)) continue;
      if (mode === 'sub' && !tok.includes('.')) continue; // group map ≠ sub evidence
      if (mode === 'flat' && tok.includes('.')) continue;
      T.add(tok);
    }
  }
  if (col === -1) return { status: 'unparseable', why: 'test-strategy.md 测试点清单表找不到「映射 AC」列表头' };
  return { status: 'ok', T };
}

// The whole F4 pipeline for one phase→gate1 transition (or its brand-new
// equivalent). Short-circuits in spec order; either denies, allows with
// disclosure, or returns having found full coverage (caller then falls through
// to a plain allow). Only the transition moment pays the two extra file reads.
function f4Check(dir) {
  // Step 0 — direction zero: both artifacts must exist and be readable (classic
  // and express alike). Missing at the transition is protocol breach, not a
  // parse limit; this also closes the write-state-first/restock-later ordering.
  const readArt = p => { try { return readFileSync(p, 'utf8'); } catch { return null; } };
  const prdText = readArt(join(dir, 'prd.md'));
  const tsText = readArt(join(dir, 'test-strategy.md'));
  const missing = [['prd.md', prdText], ['test-strategy.md', tsText]]
    .filter(([, t]) => t === null).map(([name]) => name);
  if (missing.length) {
    deny(`AIDLC F4 机械校验：phase→gate1 转移瞬间发现验收工件缺失或不可读取（${missing.join('、')}）——这是协议违约，不是解析局限。请先补齐 prd.md 与 test-strategy.md 再推进 gate1；若 state 与工件同时损坏，运行 /aidlc:resume 对账。`);
  }
  const pRes = extractP(prdText);
  if (pRes.status === 'unparseable') {
    allowWith(`AIDLC F4 无法机械校验：${pRes.why}，交人类门与 party-review 复核。`);
  }
  if (pRes.P.size === 0) {
    allowWith('AIDLC F4 无法机械校验：prd 验收标准小节内没有可识别的 AC 编号（P=∅），交人类门与 party-review 复核。');
  }
  const tRes = extractT(tsText, pRes.mode);
  if (tRes.status === 'unparseable') {
    allowWith(`AIDLC F4 无法机械校验：${tRes.why}，交人类门与 party-review 复核。`);
  }
  // Step 5 — judgment: P−T≠∅ (gaps) and T−P≠∅ (phantoms) are both deny; when
  // both directions fire, one deny lists each side's numbers (never silent).
  const gaps = [...pRes.P].filter(x => !tRes.T.has(x));
  const phantoms = [...tRes.T].filter(x => !pRes.P.has(x));
  if (gaps.length || phantoms.length) {
    const parts = [];
    if (gaps.length) parts.push(`AC 覆盖缺口（P−T≠∅）：${gaps.join(', ')} 在 prd 验收标准中存在，但 test-strategy 测试点清单「映射 AC」列没有任何映射`);
    if (phantoms.length) parts.push(`幻影编号（T−P≠∅）：${phantoms.join(', ')} 出现在 test-strategy「映射 AC」列，但 prd 验收标准中不存在`);
    deny(`AIDLC F4 机械校验：${parts.join('；')}。请补齐测试点或修正编号后再推进 gate1。`);
  }
  // Full coverage: plain allow, no disclosure.
}

// Resolve the intent this path belongs to.
const slug = slugOfPath(fp);
const own = slug ? loadIntent(root, slug) : null;

if (slug && !own) {
  const sp = join(root, 'docs', 'aidlc', slug, 'state.json');
  const intentDir = join(root, 'docs', 'aidlc', slug);
  if (!existsSync(sp)) {
    // Brand-new intent (no state.json on disk). Bypass-a closure: a FIRST
    // write that already claims phase=gate1 or gate1=approved runs the same
    // receipt check + full F4 as the normal path, so deleting state.json
    // cannot dodge F4. Artifacts usually don't exist yet → deny; present but
    // unparseable → allow+disclose. Plain creation (below gate1) stays silent.
    if (!isEdit && /docs\/aidlc\/[^/]+\/state\.json$/i.test(fp)) {
      const text = String(ti.content ?? '');
      let next = null;
      try { next = JSON.parse(text); } catch { next = null; }
      if (next && (next?.phase === 'gate1' || next?.gates?.gate1 === 'approved')) {
        checkGateReceipts(text, intentDir);
        f4Check(intentDir);
      }
    }
    emit(null); // no state.json yet: brand-new intent, nothing else to enforce
  }
  // state.json on disk but unparseable = corrupt. Fail closed for every path
  // except repairing that state.json itself via Write (receipt-checked above).
  if (/docs\/aidlc\/[^/]+\/state\.json$/i.test(fp) && !isEdit) {
    checkGateReceipts(String(ti.content ?? ''), join(root, 'docs', 'aidlc', slug));
    emit(null); // repair allowed; history restarts after corruption (resume documents it)
  }
  deny(`AIDLC 门控：intent "${slug}" 的 state.json 存在但无法解析（损坏或并发写坏）。守卫失去状态源，拒绝放行对 "${fp}" 的写入。修复：用 Write 重写该 state.json（若含 gates approved 仍需 decisions.md 回执），或运行 /aidlc:resume 对账。`);
}

const intent = own || findActiveIntent(root);
if (!intent) emit(null);

const s = intent.state || {};
const gates = s.gates || {};
const dir = dirname(intent.statePath);

// Rule 1 — no Construction artifacts before Gate#1 approval.
if (/docs\/aidlc\/[^/]+\/(plan\.md|units\/)/i.test(fp) && gates.gate1 !== 'approved') {
  deny(`AIDLC 门控：Gate#1 未通过（当前状态 ${gates.gate1 ?? 'pending'}），禁止写 Construction 工件 "${fp}"。请先运行 /aidlc:gate 完成设计门审批。`);
}

// Rule 2 — TDD lock: locked test files are contracts; human unlock required.
if (s.tddLock && isTestFile(fp) && !s.tddLockOverride) {
  const scope = Array.isArray(s.tddLockPaths) ? s.tddLockPaths : null;
  let inScope = true; // no/empty list = whole repo (legacy intents, documented)
  if (scope && scope.length) {
    const norm = x => String(x).replace(/\\/g, '/').toLowerCase();
    const fpl = norm(fp);
    inScope = scope.some(p => { const pl = norm(p); return fpl === pl || fpl.endsWith('/' + pl); });
  }
  if (inScope) {
    deny(`AIDLC TDD 锁生效（intent ${intent.slug}）：测试是契约，禁止修改 "${fp}"。若契约本身有错，运行 /aidlc:unlock-tests <理由> 经人类批准解锁；不要为了让实现通过而改测试。`);
  }
}

// Rule 6 — state.json / decisions.md are Write-only (see header).
if (isEdit && /docs\/aidlc\/[^/]+\/(state\.json|decisions\.md)$/i.test(fp)) {
  deny(`AIDLC 审计保护：${/decisions\.md$/i.test(fp) ? 'decisions.md' : 'state.json'} 禁止用 Edit 修改——old_string 可命中文件任意位置，等于改写审计历史。请改用 Write 整体写入：decisions.md 必须是"现有全文 + 追加内容"（守卫校验前缀不变）；state.json 必须完整保留既有 history（守卫校验乐观锁）。`);
}

if (/docs\/aidlc\/[^/]+\/state\.json$/i.test(fp)) {
  const text = String(ti.content ?? '');

  // Rule 3 — human receipt required before state.json says approved.
  checkGateReceipts(text, dir);

  let next = null;
  try { next = JSON.parse(text); } catch { next = null; }

  // Rule 4 — optimistic lock + preserveKeys, against the state currently on disk.
  if (existsSync(intent.statePath)) {
    let cur = null;
    try { cur = JSON.parse(readFileSync(intent.statePath, 'utf8')); } catch { cur = null; }
    if (cur) {
      // Rule 4a — a full overwrite (Write) must carry forward every history
      // entry already on disk (unparseable new content = everything lost).
      const curAts = Array.isArray(cur.history) ? cur.history.map(h => String(h?.at ?? '')) : [];
      if (curAts.length) {
        const nextAts = Array.isArray(next?.history) ? new Set(next.history.map(h => String(h?.at ?? ''))) : new Set();
        const lost = curAts.filter(a => a && !nextAts.has(a));
        if (lost.length) {
          deny(`AIDLC 乐观锁：这次对 state.json 的整体覆写丢失了 ${lost.length} 条已有 history 记录（并发修改或基于过期状态）。请重新读取磁盘上的 state.json，把 history 完整保留后再写。`);
        }
      }
      // Rule 4b — preserveKeys (decision #11): an overwrite may not DROP an
      // existing non-null key of the set; value changes always pass. The
      // corrupt-repair path never reaches here (cur === null) — that hole is
      // disclosed by /aidlc:resume, not silently allowed.
      if (next) {
        const dropped = PRESERVE_KEYS.filter(k =>
          cur[k] !== undefined && cur[k] !== null && (next[k] === undefined || next[k] === null));
        if (dropped.length) {
          deny(`AIDLC 键保留校验（R4 扩展）：这次对 state.json 的整体覆写丢失了既有键 ${dropped.join(', ')}（route/testBaseline/unitStatus/tddLock/tddLockPaths 承载 F1 分级、F2 基线、单元状态与 TDD 锁——覆写丢失等于对应机制静默失效）。请重新读取磁盘上的 state.json，完整保留这些键（值允许变更）后再写。`);
        }
      }
      // Rule 7 — F4 fires only at the phase→gate1 transition (an overwrite
      // while already at gate1, or any other phase move, never re-triggers).
      if (next && next.phase === 'gate1' && cur.phase !== 'gate1') {
        f4Check(dir);
      }
    }
  }
}

// Rule 5 — decisions.md is append-only: a Write overwrite must be a creation
// or a pure append (Edit is already denied by Rule 6).
if (/docs\/aidlc\/[^/]+\/decisions\.md$/i.test(fp) && !isEdit && existsSync(fp)) {
  const oldText = readFileSync(fp, 'utf8');
  const newText = String(ti.content ?? '');
  if (!newText.startsWith(oldText)) {
    deny('AIDLC 审计保护：decisions.md 是只追加的人类决策记录，禁止整体覆写或删改既有内容。请用 Write 写入"现有全文 + 新追加内容"（守卫会校验既有内容作为前缀原样保留）。');
  }
}

emit(null);

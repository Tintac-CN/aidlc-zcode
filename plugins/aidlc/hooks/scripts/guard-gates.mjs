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
//           (append-only history = optimistic lock against concurrent writers).
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

// Resolve the intent this path belongs to.
const slug = slugOfPath(fp);
const own = slug ? loadIntent(root, slug) : null;

if (slug && !own) {
  const sp = join(root, 'docs', 'aidlc', slug, 'state.json');
  if (!existsSync(sp)) emit(null); // no state.json yet: brand-new intent, nothing to enforce
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

  // Rule 4 — optimistic lock: a full overwrite (Write) of state.json must carry
  // forward every history entry already on disk.
  if (existsSync(intent.statePath)) {
    let cur = null;
    try { cur = JSON.parse(readFileSync(intent.statePath, 'utf8')); } catch { cur = null; }
    const curAts = Array.isArray(cur?.history) ? cur.history.map(h => String(h?.at ?? '')) : [];
    if (curAts.length) {
      let next = [];
      try { next = JSON.parse(text).history ?? []; } catch { next = null; }
      const nextAts = Array.isArray(next) ? new Set(next.map(h => String(h?.at ?? ''))) : new Set();
      const lost = curAts.filter(a => a && !nextAts.has(a));
      if (lost.length) {
        deny(`AIDLC 乐观锁：这次对 state.json 的整体覆写丢失了 ${lost.length} 条已有 history 记录（并发修改或基于过期状态）。请重新读取磁盘上的 state.json，把 history 完整保留后再写。`);
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

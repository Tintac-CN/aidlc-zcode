// F4 mechanical AC-coverage validation + preserveKeys — regression suite (U2).
// Run from the repo root:  node scripts/tests/ac-coverage.test.mjs
// Contract sources (in order):
//   docs/aidlc/next-phase/units/u2.md
//   docs/aidlc/next-phase/architecture.md "F4 机械校验规格"
//     — validation pipeline steps 0-5, bypass paths a-d, regression scenarios 1-17
//   architecture.md 数据模型 / 决策 #11 — preserveKeys key-retention on overwrite
// Fixture style mirrors guard-gates.test.mjs: a tmpdir intent (prd.md /
// test-strategy.md / state.json at phase=inception) + child_process feeding
// stdin JSON `{cwd, tool_name:"Write", tool_input:{file_path:<state.json>,
// content:<new state with phase="gate1">}}` to guard-gates.mjs, asserting the
// emitted permissionDecision (deny / allow+disclosure / plain allow = empty).
//
// TDD RED stage note: guard-gates.mjs currently has neither F4 nor
// preserveKeys behavior, so every deny/disclosure expectation below is
// EXPECTED TO FAIL until U2 lands. Green expectations (plain-allow cases)
// are regression locks that must STAY green afterwards. Do not weaken any
// assertion to make this suite pass — implement the contract instead.
import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GG = path.join(REPO, 'plugins', 'aidlc', 'hooks', 'scripts', 'guard-gates.mjs');
const T = path.join(os.tmpdir(), 'aidlc-accoverage-' + Date.now());
fs.mkdirSync(path.join(T, 'docs', 'aidlc'), { recursive: true });

const HIST = [{ at: '2026-10-14T10:00:00Z', from: 'none', to: 'inception', why: 'created' }];

// Create docs/aidlc/<slug>/ with the given files (only listed files are written,
// so omitting 'prd.md' really means the artifact is missing on disk).
function intent(slug, files = {}) {
  const dir = path.join(T, 'docs', 'aidlc', slug);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    if (content === undefined) continue;
    fs.writeFileSync(path.join(dir, name), content);
  }
  return dir;
}

// Legacy on-disk state (phase=inception, no F1/F2 fields unless overridden).
const diskState = (slug, over = {}) => JSON.stringify({
  slug, phase: 'inception',
  gates: { gate1: 'pending', gate2: 'pending' },
  tddLock: false, tddLockPaths: [], tddLockOverride: null,
  updatedAt: '2026-10-14T10:00:00Z', history: HIST,
  ...over
}, null, 2);

// New content fed to the Write. Default phase=gate1 (the F4 trigger); history
// is always carried forward so the ONLY possible deny source is the behavior
// under test (existing Rule 4 optimistic lock must not fire).
const newState = (over = {}) => JSON.stringify({
  phase: 'gate1',
  gates: { gate1: 'pending', gate2: 'pending' },
  tddLock: false, tddLockPaths: [], tddLockOverride: null,
  updatedAt: '2026-10-14T11:00:00Z', history: HIST,
  ...over
}, null, 2);

// prd fixture: `## 验收标准（可测）` section (prefix-match target) with body.
const prdOf = (body, title = '## 验收标准（可测）') => `# PRD: fixture\n\n${title}\n\n${body}\n`;

// test-strategy fixture: `## 测试点清单` table, "映射 AC" column second by default.
const strategyOf = (cells, header = '# | 映射 AC | 场景 | 层级 | 优先级', sep = '---|---|---|---|---') =>
  `# Test Strategy: fixture\n\n## 测试点清单\n\n| ${header} |\n| ${sep} |\n`
  + cells.map((c, i) => `| T${String(i + 1).padStart(2, '0')} | ${c} | 场景描述 | 单元 | P0 |`).join('\n') + '\n';

function runHook(payload) {
  try {
    return cp.execSync(`node "${GG}"`, { input: JSON.stringify(payload), encoding: 'utf8' });
  } catch (e) { return 'ERR ' + String(e.stderr || e.message).slice(0, 200); }
}
// The F4 driver: a Write of <slug>/state.json whose content transitions to gate1.
const writeState = (slug, content) => runHook({
  cwd: T, tool_name: 'Write',
  tool_input: { file_path: path.join(T, 'docs', 'aidlc', slug, 'state.json'), content }
});

// Classify hook output: 'plain' (empty stdout = allow, no disclosure),
// 'deny', 'allow' (allow WITH permissionDecisionReason), 'other'/'raw'.
function outcome(out) {
  if (out === '') return { kind: 'plain' };
  try {
    const j = JSON.parse(out);
    const h = j?.hookSpecificOutput || {};
    if (h.permissionDecision === 'deny') return { kind: 'deny', reason: String(h.permissionDecisionReason ?? '') };
    if (h.permissionDecision === 'allow') return { kind: 'allow', reason: String(h.permissionDecisionReason ?? '') };
    return { kind: 'other', raw: out };
  } catch { return { kind: 'raw', raw: out }; }
}

let bad = 0, n = 0;
function ok(name, cond, extra) {
  n++;
  const pass = !!cond;
  if (!pass) bad++;
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}${pass ? '' : '  -> ' + String(extra).slice(0, 300)}`);
}

/* ─── 场景 1 — 子编号不折叠：无映射的子编号逐条列入缺口（B1 恒通过缺陷修复） ─── */
intent('s1', {
  'state.json': diskState('s1'),
  'prd.md': prdOf('### F4（AC4.x）\n- **AC4.1**：标准一。\n- **AC4.2**：标准二。\n- **AC4.3**：标准三。\n- **AC4.4**：标准四。'),
  'test-strategy.md': strategyOf(['AC4.1'])
});
{
  const r = outcome(writeState('s1', newState()));
  ok('场景1 子编号不折叠: AC4.2/4.3/4.4 无映射 → deny 且逐条列出（不折叠为组）',
    r.kind === 'deny' && r.reason.includes('AC4.2') && r.reason.includes('AC4.3') && r.reason.includes('AC4.4'),
    JSON.stringify(r));
}

/* ─── 场景 2 / 16 — 区间/范围连接符整格剔除、两端 token 均不入 T ─── */
const CONNECTORS = [
  ['场景2 en dash –', 'AC1.1–AC4.4'],
  ['场景2 em dash —', 'AC1.1—AC4.4'],
  ['场景2 半角波浪线 ~', 'AC1.1~AC4.4'],
  ['场景2 全角波浪线 ～', 'AC1.1～AC4.4'],
  ['场景2 半角连字符 -', 'AC1.1-AC4.4'],
  ['场景2 全角连字符 －', 'AC1.1－AC4.4'],
  ['场景16 空格环绕连字符 " - "', 'AC1.1 - AC4.4'],
  ['场景2 连续双点 ..', 'AC1.1..AC4.4'],
  ['场景2 省略号 …', 'AC1.1…AC4.4'],
  ['场景2 字面 至', 'AC1.1至AC4.4'],
  ['场景2 字面 到', 'AC1.1到AC4.4'],
  ['场景2 en dash + 占位端点', 'AC1.1–AC4.x']
];
CONNECTORS.forEach(([label, cell], i) => {
  const slug = `rng${i}`;
  intent(slug, {
    'state.json': diskState(slug),
    'prd.md': prdOf('- **AC1.1**：标准一。\n- **AC4.4**：标准二。'),
    'test-strategy.md': strategyOf([cell])
  });
  const r = outcome(writeState(slug, newState()));
  ok(`${label}: 区间格整格剔除、两端不入 T → deny（缺口含 AC1.1 与 AC4.4）`,
    r.kind === 'deny' && r.reason.includes('AC1.1') && r.reason.includes('AC4.4'),
    JSON.stringify(r));
});

/* ─── 场景 3 — 混合格 token 级处理：`AC1.2 / 全局` 仅 AC1.2 入 T ─── */
intent('s3a', {
  'state.json': diskState('s3a'),
  'prd.md': prdOf('- **AC1.2**：标准。'),
  'test-strategy.md': strategyOf(['AC1.2 / 全局'])
});
{
  const r = outcome(writeState('s3a', newState()));
  ok('场景3 混合格 token 级: "AC1.2 / 全局" 中合法 token AC1.2 照常入 T → plain allow',
    r.kind === 'plain', JSON.stringify(r));
}
intent('s3b', {
  'state.json': diskState('s3b'),
  'prd.md': prdOf('- **AC1.1**：标准。'),
  'test-strategy.md': strategyOf(['AC1.2 / 全局'])
});
{
  const r = outcome(writeState('s3b', newState()));
  ok('场景3 混合格 token 级: 非编号 token "全局" 不产生幻影证据 → deny 仅列 AC1.2',
    r.kind === 'deny' && r.reason.includes('AC1.2') && !r.reason.includes('全局'),
    JSON.stringify(r));
}

/* ─── 场景 4 — 占位记法 `（AC1.x）` 不注入 P/T ─── */
intent('s4a', {
  'state.json': diskState('s4a'),
  'prd.md': prdOf('### F1 规模分级路由（AC1.x）\n本小节仅有占位记法 AC1.x，无实体编号。'),
  'test-strategy.md': strategyOf(['AC1.1'])
});
{
  const r = outcome(writeState('s4a', newState()));
  ok('场景4 占位排除: prd 仅含 AC1.x → P=∅ → 不可解析 allow+披露（占位不得注入 P）',
    r.kind === 'allow' && r.reason.includes('无法机械校验'), JSON.stringify(r));
}
intent('s4b', {
  'state.json': diskState('s4b'),
  'prd.md': prdOf('- **AC1.1**：标准。'),
  'test-strategy.md': strategyOf(['AC1.x'])
});
{
  const r = outcome(writeState('s4b', newState()));
  ok('场景4 占位排除: 映射格 AC1.x 不产生 T 证据 → deny（缺口 AC1.1）',
    r.kind === 'deny' && r.reason.includes('AC1.1'), JSON.stringify(r));
}

/* ─── 场景 5 — 小节前缀匹配：`## 验收标准（可测）` 命中；`### ` 不截断小节 ─── */
intent('s5', {
  'state.json': diskState('s5'),
  'prd.md': prdOf('### F1（AC1.x）\n- **AC1.1**：标准。\n\n## 其他\n小节外提及 AC9.9 不得进入 P。'),
  'test-strategy.md': strategyOf(['AC1.1'])
});
{
  const r = outcome(writeState('s5', newState()));
  ok('场景5 前缀匹配+小节边界: 带后缀标题命中、### 不截断、小节外编号不入 P → plain allow',
    r.kind === 'plain', JSON.stringify(r));
}

/* ─── 场景 6 — CRLF 行尾 + BOM 头的 prd 可正常提取 ─── */
intent('s6', {
  'state.json': diskState('s6'),
  'prd.md': '\ufeff# PRD: fixture\r\n\r\n## 验收标准（可测）\r\n\r\n### F1（AC1.x）\r\n- **AC1.1**：标准。\r\n',
  'test-strategy.md': strategyOf(['AC1.1'])
});
{
  const r = outcome(writeState('s6', newState()));
  ok('场景6 CRLF+BOM 容错: prd 可正常提取 → plain allow（BOM 未去会退化成不可解析披露）',
    r.kind === 'plain', JSON.stringify(r));
}

/* ─── 场景 7 — 扁平制工件按 ACn 粒度校验（SKILL §7 模板风格） ─── */
intent('s7a', {
  'state.json': diskState('s7a'),
  'prd.md': prdOf('### 全部标准\n- **AC1**：标准一。\n- **AC2**：标准二。'),
  'test-strategy.md': strategyOf(['AC1', 'AC2'])
});
{
  const r = outcome(writeState('s7a', newState()));
  ok('场景7 扁平制全覆盖: AC1+AC2 均映射 → plain allow',
    r.kind === 'plain', JSON.stringify(r));
}
intent('s7b', {
  'state.json': diskState('s7b'),
  'prd.md': prdOf('### 全部标准\n- **AC1**：标准一。\n- **AC2**：标准二。'),
  'test-strategy.md': strategyOf(['AC1'])
});
{
  const r = outcome(writeState('s7b', newState()));
  ok('场景7 扁平制缺口: AC2 无映射 → deny 按扁平粒度列出（不展开为子编号）',
    r.kind === 'deny' && r.reason.includes('AC2') && !r.reason.includes('AC2.1'),
    JSON.stringify(r));
}

/* ─── 场景 8 — 方向二：T − P ≠ ∅ 幻影编号 → deny ─── */
intent('s8', {
  'state.json': diskState('s8'),
  'prd.md': prdOf('- **AC1.1**：标准。'),
  'test-strategy.md': strategyOf(['AC1.1', 'AC9.9'])
});
{
  const r = outcome(writeState('s8', newState()));
  ok('场景8 幻影编号: T−P≠∅ → deny 且列出幻影 AC9.9',
    r.kind === 'deny' && r.reason.includes('AC9.9'), JSON.stringify(r));
}

/* ─── 场景 9 — 工件缺失 deny（方向零，同时封死先写 state 后补工件的顺序绕过） ─── */
intent('s9a', {
  'state.json': diskState('s9a'),
  'test-strategy.md': strategyOf(['AC1.1'])
});
{
  const r = outcome(writeState('s9a', newState()));
  ok('场景9 prd.md 缺失 → deny', r.kind === 'deny', JSON.stringify(r));
}
intent('s9b', {
  'state.json': diskState('s9b'),
  'prd.md': prdOf('- **AC1.1**：标准。')
});
{
  const r = outcome(writeState('s9b', newState()));
  ok('场景9 test-strategy.md 缺失 → deny', r.kind === 'deny', JSON.stringify(r));
}

/* ─── 场景 10 — 不可解析分支：allow + 披露文本存在（禁止静默） ─── */
intent('s10a', {
  'state.json': diskState('s10a'),
  'prd.md': '# PRD: fixture\n\n没有验收标准小节的正文。\n',
  'test-strategy.md': strategyOf(['AC1.1'])
});
{
  const r = outcome(writeState('s10a', newState()));
  ok('场景10 无验收标准小节 → allow+披露（含「无法机械校验」）',
    r.kind === 'allow' && r.reason.includes('无法机械校验'), JSON.stringify(r));
}
intent('s10b', {
  'state.json': diskState('s10b'),
  'prd.md': prdOf('小节存在但没有任何 AC 编号。'),
  'test-strategy.md': strategyOf(['AC1.1'])
});
{
  const r = outcome(writeState('s10b', newState()));
  ok('场景10 P=∅（小节内无编号）→ allow+披露',
    r.kind === 'allow' && r.reason.includes('无法机械校验'), JSON.stringify(r));
}
intent('s10c', {
  'state.json': diskState('s10c'),
  'prd.md': prdOf('- **AC1.1**：标准一。\n- **AC3**：孤儿裸组（无 AC3.x 子编号）。'),
  'test-strategy.md': strategyOf(['AC1.1'])
});
{
  const r = outcome(writeState('s10c', newState()));
  ok('场景10 约定混提（子编号+孤儿裸组）→ allow+披露（不猜测不展开）',
    r.kind === 'allow' && r.reason.includes('无法机械校验'), JSON.stringify(r));
}
{
  // "映射 AC" 表头缺失（测试点清单表存在但无该列）→ 同走不可解析 allow+披露，
  // 不得退化成 P−T 比较（否则场景列里的编号会造成假缺口/假覆盖）。
  intent('s10d', {
    'state.json': diskState('s10d'),
    'prd.md': prdOf('- **AC1.1**：标准。'),
    'test-strategy.md': [
      '# Test Strategy: fixture', '', '## 测试点清单', '',
      '| # | 场景 | 层级 | 优先级 |',
      '|---|---|---|---|',
      '| T01 | 覆盖 AC1.1 的场景描述 | 单元 | P0 |', ''
    ].join('\n')
  });
  const r = outcome(writeState('s10d', newState()));
  ok('场景10 映射列表头缺失 → allow+披露（不做 P−T 比较）',
    r.kind === 'allow' && r.reason.includes('无法机械校验'), JSON.stringify(r));
}
intent('s10e', {
  'state.json': diskState('s10e'),
  'prd.md': prdOf('### AC1 分组标题\n- **AC1.1**：标准。'),
  'test-strategy.md': strategyOf(['AC1.1'])
});
{
  const r = outcome(writeState('s10e', newState()));
  ok('规格补充-组归一: 裸组 AC1 有子编号可归组 → 组封面丢弃、不入 P → plain allow（非披露）',
    r.kind === 'plain', JSON.stringify(r));
}

/* ─── 场景 11 — 绕过 a：brand-new intent 直写 phase=gate1 → 工件检查 + 完整 F4 ─── */
intent('s11a', {});
{
  const r = outcome(writeState('s11a', newState()));
  ok('场景11 brand-new 直写 gate1、两工件不存在 → deny（早退分支封堵）',
    r.kind === 'deny', JSON.stringify(r));
}
intent('s11b', {
  'prd.md': prdOf('- **AC1.1**：标准一。\n- **AC1.2**：标准二。'),
  'test-strategy.md': strategyOf(['AC1.1'])
});
{
  const r = outcome(writeState('s11b', newState()));
  ok('场景11 brand-new 且工件在盘有缺口 → 执行完整 F4 → deny（无"在盘即静默放行"缝隙）',
    r.kind === 'deny' && r.reason.includes('AC1.2'), JSON.stringify(r));
}
intent('s11c', {
  'prd.md': '# PRD: fixture\n\n空工件，无验收标准小节。\n',
  'test-strategy.md': strategyOf(['AC1.1'])
});
{
  const r = outcome(writeState('s11c', newState()));
  ok('场景11 brand-new 且工件在盘但不可解析 → allow+披露（非静默）',
    r.kind === 'allow' && r.reason.includes('无法机械校验'), JSON.stringify(r));
}

/* ─── 场景 12 — 非 gate1 转移不触发（AC4.4 豁免边界） ─── */
intent('s12', {
  'state.json': diskState('s12'),
  'prd.md': prdOf('- **AC1.1**：标准。'),
  'test-strategy.md': strategyOf(['AC1.1'])
});
{
  const r = outcome(writeState('s12', newState({ phase: 'construction', updatedAt: '2026-10-14T12:00:00Z' })));
  ok('场景12 inception→construction 直跳不触发 F4 → plain allow',
    r.kind === 'plain', JSON.stringify(r));
}
{
  const r = outcome(writeState('s12', newState({ phase: 'inception', updatedAt: '2026-10-14T12:00:00Z' })));
  ok('场景12 同 phase 覆写（updatedAt 更新）不触发 F4 → plain allow',
    r.kind === 'plain', JSON.stringify(r));
}
intent('s12c', {
  'state.json': diskState('s12c', { phase: 'gate1' }),
  'prd.md': prdOf('- **AC1.1**：标准一。\n- **AC1.2**：标准二。'),
  'test-strategy.md': strategyOf(['AC1.1'])
});
{
  const r = outcome(writeState('s12c', newState()));
  ok('场景12 gate1→gate1 覆写不重复触发（仅转移瞬间）→ plain allow',
    r.kind === 'plain', JSON.stringify(r));
}

/* ─── 场景 13 — express 两工件路线同样适用（无 architecture.md 不影响 F4） ─── */
intent('s13', {
  'state.json': diskState('s13', { route: 'express' }),
  'prd.md': prdOf('- **AC1.1**：标准一。\n- **AC1.2**：标准二。'),
  'test-strategy.md': strategyOf(['AC1.1', 'AC1.2'])
});
{
  const r = outcome(writeState('s13', newState({ route: 'express' })));
  ok('场景13 express 两工件全覆盖 → plain allow（无 architecture.md 不参与校验）',
    r.kind === 'plain', JSON.stringify(r));
}

/* ─── 场景 14 — 映射列外不提取：场景列示例字样不产生 T 证据 ─── */
intent('s14', {
  'state.json': diskState('s14'),
  'prd.md': prdOf('- **AC1.1**：标准。'),
  'test-strategy.md': [
    '# Test Strategy: fixture', '', '## 测试点清单', '',
    '| # | 映射 AC | 场景 | 层级 | 优先级 |',
    '|---|---|---|---|---|',
    '| T01 | AC1.1 | 正：映射成立。场景列示例字样（例如 AC99）不产生 T 证据 | 单元 | P0 |', ''
  ].join('\n')
});
{
  const r = outcome(writeState('s14', newState()));
  ok('场景14 映射列外不提取: 场景列 "例如 AC99" 不产生幻影 → plain allow',
    r.kind === 'plain', JSON.stringify(r));
}

/* ─── 场景 15 — 纯多 token 格：`AC4.1 / AC4.3` 双 token 各自入 T ─── */
intent('s15', {
  'state.json': diskState('s15'),
  'prd.md': prdOf('- **AC4.1**：标准一。\n- **AC4.3**：标准二。'),
  'test-strategy.md': strategyOf(['AC4.1 / AC4.3'])
});
{
  const r = outcome(writeState('s15', newState()));
  ok('场景15 纯多 token 格逐 token 入 T → plain allow（整格剔除仅剩区间连接符）',
    r.kind === 'plain', JSON.stringify(r));
}

/* ─── 场景 17 — 注记格整格剔除 + 本 intent 工件 dogfood ─── */
intent('s17a', {
  'state.json': diskState('s17a'),
  'prd.md': prdOf('- **AC1.4**：标准。'),
  'test-strategy.md': strategyOf(['AC1.4（R1 修订：响应 N7(dev)——注记原文字移出，映射格只留编号 token）'])
});
{
  const r = outcome(writeState('s17a', newState()));
  ok('场景17 注记格: 含 em dash 注记 → 整格剔除、两端不入 T → deny（缺口 AC1.4）',
    r.kind === 'deny' && r.reason.includes('AC1.4'), JSON.stringify(r));
}
intent('s17b', {
  'state.json': diskState('s17b'),
  'prd.md': fs.readFileSync(path.join(REPO, 'docs', 'aidlc', 'next-phase', 'prd.md'), 'utf8'),
  'test-strategy.md': fs.readFileSync(path.join(REPO, 'docs', 'aidlc', 'next-phase', 'test-strategy.md'), 'utf8')
});
{
  const r = outcome(writeState('s17b', newState()));
  ok('场景17 映射列纯化 dogfood: 以本 intent 真实 prd/test-strategy 模拟转移 → 不 deny（plain allow）',
    r.kind === 'plain', JSON.stringify(r));
}

/* ─── 场景 18 — 第二张表不注入 T（gate2-R1/M2 表边界收口的回归锁；人类解锁 2026-10-15 补入）─── */
intent('s18', {
  'state.json': diskState('s18'),
  'prd.md': prdOf('- **AC1.1**：标准一。\n- **AC1.2**：标准二。'),
  'test-strategy.md': [
    '# Test Strategy: fixture', '', '## 测试点清单', '',
    '| # | 映射 AC | 场景 | 层级 | 优先级 |',
    '|---|---|---|---|---|',
    '| T01 | AC1.1 | 覆盖标准一 | 单元 | P0 |', '',
    '上表为正式清单，下表为统计表（无映射语义）。', '',
    '| 统计项 | 数值 | 备注 |',
    '|---|---|---|',
    '| 用例数 | AC1.2 | 含筛选场景 |'
  ].join('\n')
});
{
  const r = outcome(writeState('s18', newState()));
  ok('场景18 第二张表: 首个非表行终止收集 → 第二张表（同列序恰含 AC1.2）不注入 T → 真实缺口照常 deny',
    r.kind === 'deny' && r.reason.includes('AC1.2'), JSON.stringify(r));
}

/* ─── 规格补充 — 映射列按表头列名定位（非固定列序）；cell 内 \| 转义非列边界 ─── */
intent('sxa', {
  'state.json': diskState('sxa'),
  'prd.md': prdOf('- **AC1.1**：标准。'),
  'test-strategy.md': [
    '# Test Strategy: fixture', '', '## 测试点清单', '',
    '| # | 场景 | 层级 | 优先级 | 映射 AC |',
    '|---|---|---|---|---|',
    '| T01 | 覆盖标准一的场景 | 单元 | P0 | AC1.1 |', ''
  ].join('\n')
});
{
  const r = outcome(writeState('sxa', newState()));
  ok('规格-列名定位: "映射 AC" 位于末列（非固定列序）→ 仍能定位 → plain allow',
    r.kind === 'plain', JSON.stringify(r));
}
intent('sxb', {
  'state.json': diskState('sxb'),
  'prd.md': prdOf('- **AC1.1**：标准。'),
  'test-strategy.md': [
    '# Test Strategy: fixture', '', '## 测试点清单', '',
    '| # | 映射 AC | 场景 | 层级 | 优先级 |',
    '|---|---|---|---|---|',
    '| T01 | 注记 \\| AC1.1 | 覆盖标准一的场景 | 单元 | P0 |', ''
  ].join('\n')
});
{
  const r = outcome(writeState('sxb', newState()));
  ok('规格-转义竖线: cell 内 \\| 不是列边界，转义后的 AC1.1 仍入 T → plain allow',
    r.kind === 'plain', JSON.stringify(r));
}

/* ─── preserveKeys（决策 #11）：整体覆写丢既有键 → deny；值变更放行 ─── */
const PKBASE = {
  route: 'express',
  testBaseline: {
    recordedAt: '2026-10-14T10:00:00Z',
    command: 'node scripts/tests/guard-gates.test.mjs',
    suites: ['scripts/tests/guard-gates.test.mjs'],
    total: 3, pass: 3, fail: 0
  },
  unitStatus: { U1: 'done' },
  tddLockPaths: ['tests/a.py']
};
intent('pk1', { 'state.json': diskState('pk1', PKBASE) });
{
  const r = outcome(writeState('pk1', newState({ phase: 'construction' })));
  ok('PK 丢键拦截: 覆写丢 route/testBaseline/unitStatus → deny 且列出丢失键',
    r.kind === 'deny' && r.reason.includes('route') && r.reason.includes('testBaseline') && r.reason.includes('unitStatus'),
    JSON.stringify(r));
}
intent('pk2', { 'state.json': diskState('pk2', PKBASE) });
{
  const r = outcome(writeState('pk2', newState({
    phase: 'construction', tddLock: undefined, tddLockPaths: undefined
  })));
  ok('PK 丢键拦截: 五个保留键全部丢失 → deny（含 tddLock/tddLockPaths）',
    r.kind === 'deny' && r.reason.includes('route') && r.reason.includes('tddLock') && r.reason.includes('tddLockPaths'),
    JSON.stringify(r));
}
intent('pk3', { 'state.json': diskState('pk3', PKBASE) });
{
  const r = outcome(writeState('pk3', newState({
    phase: 'construction',
    route: 'classic', // 值变更：express→classic（gate1 批准前的合法路径）
    testBaseline: { ...PKBASE.testBaseline, recordedAt: '2026-10-14T12:00:00Z', total: 5, pass: 4, fail: 1 },
    unitStatus: { U1: 'done', U2: 'pending' },
    tddLockPaths: ['tests/a.py', 'tests/b.py']
  })));
  ok('PK 值放行: 五键齐全仅值变更 → plain allow（键保留、值不冻结）',
    r.kind === 'plain', JSON.stringify(r));
}
intent('pk4', { 'state.json': diskState('pk4', PKBASE) });
{
  const r = outcome(writeState('pk4', newState({ phase: 'construction', route: null })));
  ok('PK 置 null 拦截: 既有键被写成 null → deny',
    r.kind === 'deny' && r.reason.includes('route'), JSON.stringify(r));
}
intent('pk5', { 'state.json': diskState('pk5', { ...PKBASE, tddLockOverride: null }) });
{
  // pk5 修复（人类裁决 2026-10-15 方案 A，见 decisions.md"TDD 解锁裁决"）：原夹具新内容
  // 误缺五个保留键、与 pk1 字节级冲突。修复后新内容携带五保留键、仅丢弃 tddLockOverride
  // （不在保留集合）→ 丢弃不拦 → plain allow，与 pk1（丢保留键 → deny）形成边界对照。
  const r = outcome(writeState('pk5', newState({
    phase: 'construction',
    route: 'express',
    testBaseline: { recordedAt: '2026-10-14T10:00:00Z', command: 'node scripts/tests/guard-gates.test.mjs', suites: ['scripts/tests/guard-gates.test.mjs'], total: 3, pass: 3, fail: 0 },
    unitStatus: { U1: 'done' },
    tddLockPaths: ['tests/a.py'],
    tddLockOverride: undefined
  })));
  ok('PK 集合边界: tddLockOverride 不在保留集合（且盘上为 null）→ 丢弃不拦 → plain allow',
    r.kind === 'plain', JSON.stringify(r));
}
intent('pk6', { 'state.json': '{ not json !!!' });
{
  const r = outcome(writeState('pk6', newState()));
  ok('PK 路径豁免: 损坏修复路径不经 preserveKeys/F4（绕过 b 披露兜底）→ plain allow',
    r.kind === 'plain', JSON.stringify(r));
}
intent('pk7', {
  'state.json': diskState('pk7', PKBASE),
  'prd.md': prdOf('- **AC1.1**：标准。'),
  'test-strategy.md': strategyOf(['AC1.1'])
});
{
  // F4 全覆盖（F4 自身不 deny），deny 唯一来源 = preserveKeys 丢 route。
  const r = outcome(writeState('pk7', newState()));
  ok('PK 组合: →gate1 转移 + 覆盖完整 + 丢 route → deny 且 reason 指向 route',
    r.kind === 'deny' && r.reason.includes('route'), JSON.stringify(r));
}

fs.rmSync(T, { recursive: true, force: true });
console.log(bad ? `\n${bad}/${n} FAILED` : `\nALL ${n} SCENARIOS PASSED`);
process.exit(bad ? 1 : 0);

# Architecture: next-phase

> 产出者：architect　日期：2026-10-14　来源：intent.md + prd.md

## 逻辑架构

本 intent 是插件的自用进化，改造对象即插件自身的四层结构。P0 规划质量包（F1–F4）的落层遵循既有决策：**判定类逻辑全部在 prompt 层（模型执行），机制层（hook）只做确定性注入与 deny-only 拦截**（D2/D11）。

```
┌─ prompt 层（判定与协议，可被模型违反，人类门兜底）────────────────┐
│  skills/aidlc/SKILL.md        F1 分级协议 / F2 基线步骤 /        │
│                               F3 影响面步骤 / F4 对齐拍语义      │
│  commands/aidlc/inception.md  F1 接入时分级确认                  │
│  commands/aidlc/construct.md  F2 第 0 步基线 + 验证时回归对比    │
├─ 机制层（确定性代码，deny-only / 只注入不分类）──────────────────┤
│  guard-gates.mjs (PreToolUse)  F4：phase→gate1 转移时机械校验    │
│                                AC 编号集合 ⊆ 测试点映射集合，    │
│                                缺口 → deny（既有 hook 扩展）     │
│  auto-route.mjs (UserPromptSubmit)  F1：活跃 intent 摘要行追加   │
│                                route 字段回显（只读注入，不分类）│
├─ 状态层 ────────────────────────────────────────────────────────┤
│  state.json                   +route（F1）+testBaseline（F2）    │
│  decisions.md                 F1 路由裁决逐字留痕（无新标记行）  │
│  plan.md / units/<n>.md       F3：Units 表加"影响面"列           │
└─────────────────────────────────────────────────────────────────┘
```

**各特性落层与边界**：

| F | prompt 层 | hook 层 | state.json | 模板 |
|---|---|---|---|---|
| F1 规模分级路由 | SKILL.md §3 新增"分级接入"小节 + A1 协议 + inception.md | auto-route.mjs 摘要行追加 `route=` 回显（只读） | `route` 字段 | §7 工件模板加 express 裁剪注记 |
| F2 测试基线 | SKILL.md Construction 第 0 步 + 验证步骤 + status/resume 展示规则 | 无 | `testBaseline` 字段 | construct.md 命令文本 |
| F3 影响面分析 | SKILL.md Sprint Planning 步骤（Grep/Glob 扫描引用方） | 无 | 无 | plan.md Units 表加列 |
| F4 AC↔测试点覆盖校验 | SKILL.md 对齐拍：缺口=BLOCKER 语义 | guard-gates.mjs 扩展（deny-only） | 无 | 无（模板已有 AC/映射 AC 列） |

**依赖关系**：F4 依赖 prd.md/test-strategy.md 既有模板中的 `AC\d+` 编号约定（无需模板改动）；F2 的回归对比依赖 `tddLockPaths` 区分"本 intent 新增测试"；F1 的 express 裁剪不改变任何 hook 行为（见"关键决策"#3）。

## 数据模型

### state.json 新增字段（均为可选，缺失=旧行为）

```json
{
  "route": "classic | express",
  "testBaseline": {
    "recordedAt": "ISO-8601",
    "command": "<验证命令原文，如 npm test>",
    "total": 0,
    "pass": 0,
    "fail": 0,
    "failingTests": ["<失败用例名>"],
    "coverage": null
  }
}
```

**约束与降级语义**：

- `route`：缺失/非法值一律视为 `classic`（fail-safe 到全量流程，与 auto-route 开关"缺失=off"的惯例一致，D11）。仅在 Inception 建 intent 时经 AskUserQuestion 确认后写入；写入后变更仅限 gate1 批准前、且须人类裁决逐字进 decisions.md。
- `testBaseline`：Construction 第 0 步（Sprint Planning 之后、dev 写失败测试**之前**）由编排者运行验证命令并记录。`failingTests` 可解析到用例粒度时填全量名单；无法解析（runner 输出非结构化）时省略该键，退化为计数比较。`coverage` 默认 `null`（本仓库测试命令未声明覆盖率采集，不强行引入）。
- 存量 intent 无这两个字段：续跑零行为变化——`route` 缺省 classic 走全量协议；`testBaseline` 缺失时验证步骤退化为现状（"验证命令通过"即满足），`/aidlc:status` 显示"无基线"。
- **覆写保留规则扩展**（SKILL.md §2 补一条）：编排者整体覆写 state.json 时，除 history 外，`route`/`testBaseline`/`unitStatus` 等既有字段也必须原样保留，除非本次变更明确改它——与 guard-gates 乐观锁同向（防丢字段）。
- hook 侧兼容：`findActiveIntent`/`loadIntent` 只 `JSON.parse`，新字段透传无害；guard-gates 不做 schema 校验，新字段不触发任何既有规则。

### F4 机械校验的提取规则（guard-gates.mjs 内，确定性正则）

- 触发点：Write state.json 且 `old.phase !== "gate1" && new.phase === "gate1"`（仅转移瞬间校验，覆写 updatedAt 等不重复触发）。
- prd.md 侧：提取 `## 验收标准` 小节内全部 `/\bAC\d+\b/g`，得集合 P。
- test-strategy.md 侧：提取全文全部 `/\bAC\d+\b/g`，得集合 T（宽松提取，见"安全与权限"的已知局限）。
- 判定：`P - T ≠ ∅` → **deny**，reason 列出缺口编号；`P = ∅` 或任一文件缺失/不可解析 → **allow**（无法机械验证，交人类门兜底，见决策 #4）。
- express 路线同样适用（express 保留 prd + test-strategy 两工件，见决策 #3）。

### plan.md 模板变更（F3）

Units 表加一列：`| # | Unit | 目标 | 涉及文件 | 影响面 | 测试 | 验收 |`。影响面取值 `low | med | high（引用方 N）`：low=无外部引用方/单一消费方；med=少量同层消费方；high=跨层/共享类型/引用方众多。high 的 unit 必须在"执行顺序"中说明拆分或排序理由。

## 与 PRD 的语义对齐表

已按对齐拍回填 PRD 实际 AC 编号（PRD AC 全集：AC1.1–AC1.5 / AC2.1–AC2.4 / AC3.1–AC3.4 / AC4.1–AC4.4）。

| PRD 动词 | 物理语义 | 说明 |
|---|---|---|
| 分级（F1）→ AC1.1、AC1.3、AC1.4 | state.json 写入 `route` 字段 + decisions.md 逐字留痕 | AI 提议、AskUserQuestion 确认；无 hook 参与判定 |
| 裁剪（F1）→ AC1.2 | express 路线不派发 architect、不产 architecture.md；party-review 扇出压缩 | 纯 prompt 层裁剪；hook 强制项（人类回执、decisions 留痕、TDD 锁）零裁剪 |
| 记录（F2）→ AC2.1、AC2.3 | Construction 第 0 步运行验证命令，结果写 state.json `testBaseline` | 单一事实源在 state.json，不双写 plan.md |
| 对比（F2）→ AC2.2 | gate2 验证时重跑同一命令，新失败=回归=BLOCKER | 用例粒度优先，计数粒度兜底 |
| 扫描（F3）→ AC3.1、AC3.2、AC3.3、AC3.4 | Sprint Planning 用 Grep/Glob 查引用方，结果写 plan.md 影响面列 | 纯 prompt 层，无机制强制 |
| 校验（F4）→ AC4.1、AC4.2、AC4.3 | guard-gates.mjs 在 phase→gate1 转移时正则提取比对，缺口 deny | 机制层强制；不可解析时 fail-open 交人类门 |

## 关键决策与理由

| # | 决策 | 为什么 |
|---|---|---|
| 1 | F1/F2/F3 的判定与执行全部落 prompt 层（SKILL.md + 命令），state.json 只存结果字段；hook 唯一新增行为是 F4 的 deny 校验和 auto-route 的 route 回显 | D11 既定模式：hook 误判不可逆所以只注入不分类；分级提议、影响面分级都是判断性工作，机制层做不了也不该做。route 回显与现有 unitStatus 回显同构（只读注入）。 |
| 2 | `route` 缺失=classic、`testBaseline` 缺失=无基线旧行为 | intent.md 约束"存量用户零行为变化"；与 config.json"缺失/畸形=off"的 fail-safe 惯例（D11）一致，升级安全。 |
| 3 | express 裁剪清单 = ① 不产 architecture.md（语义对齐约定并入 prd.md 内联小节）② party-review 交叉评审压缩为单轮合并评审（或人类直审两工件）③ plan.md 允许单 unit ④ Operations 的 retro.md 改为人类可选。**不裁**：gate1/gate2 人类审批回执、decisions.md 逐字留痕、TDD 锁、guard-gates/guard-paths 全部 hook、F2 基线、F4 校验 | 直接回应 qa 风险：§0 守卫边界声明"门控处的人类复核是唯一可信兜底"——express 裁剪的全部是 **AI 侧产出与互审扇出**（prompt 层便利），机制层强制项（deny-only hook、人类回执、只追加留痕）一项不动。guard-gates 对 plan.md/units 的门禁、回执新鲜度校验对两条路线字节级一致。参照 aidlc-workflows profile（Express 10/33 仍保留门）与 BMAD 规模决策树（research-digest D12）。 |
| 4 | F4 机械校验放 guard-gates.mjs（既有 PreToolUse deny hook 扩展），不放编排者 grep、不新建 hook | 任务要求"hook 是确定性代码，不能依赖模型"——编排者 grep 本质是模型自觉执行，长上下文下会稀释（§0 常驻约束教训）。guard-gates 已拦截 state.json 写入且已读 decisions.md 做回执校验，扩展它读 prd/test-strategy 是同构改动，不新增 hook 进程与 hooks.json 条目（每多一个 hook 多一份 fail-open 面）。触发点选 phase→gate1 转移：这是"工件齐"的唯一机制锚点。 |
| 5 | F4 在"文件缺失/零 AC 可提取"时 allow（fail-open），在"提取成功且有缺口"时 deny（fail-closed） | 反向（一律 fail-closed）会把格式漂移的存量 intent 硬挡在 gate1 外，违反兼容性约束。fail-open 侧由人类门 + party-review 既有"编号对不上"必查项兜底——符合 D3 定位：hook 是限速带不是安全边界。已知局限（test-strategy 全文提取可能把"缺口"小节提到的 AC 算作已映射）在同一兜底覆盖内，明文写入本文档即尽责披露。 |
| 6 | F2 基线只写 state.json，不双写 plan.md；回归判定 = 重跑后"基线中 pass 的用例现在 fail"（用例粒度）或 "fail 总数 > 基线 fail"（计数粒度兜底），且排除本 intent 新增测试文件（按 tddLockPaths）中的用例 | 单一事实源防双写漂移；plan.md 在基线记录前已提交确认，回写会制造额外提交噪音。排除本 intent 新测试是因为 TDD 流程中它们必然先红后绿，不计入回归。来源：aidlc-workflows Test Baseline Protocol（research-digest B6：改前记录 total/pass/fail，之后新失败=回归）。 |
| 7 | F2 对比时机 = Construction 第 4 步（声明"验证命令通过"之前），回归=BLOCKER 须修复或人类在 decisions.md 逐字豁免 | 与 aidlc-workflows 一致（验证前比对）；豁免路径保留人类最高裁决权，与"门禁永不自动、人类始终可裁"的哲学一致。 |
| 8 | F3 影响面落 plan.md 新列，不进 state.json、不做 hook 强制 | 影响面是规划时的判断产物（research-digest B7，aidlc-workflows Blast Radius 也是"改前强制"的流程纪律而非机器门禁）；A3 拆分确认（人工）与 party-review 是自然的人工复核点。做成 hook 强制需要理解 import 语义，超出确定性正则能力，硬做只会 fail-open。 |
| 9 | route 允许 express→classic 升级（gate1 批准前、人类裁决留痕），禁止 classic→express 降级 | 升级是补工件，安全；降级是追溯性豁免已承诺的工件与评审，会破坏审计链语义。 |

## 安全与权限

本 intent 改的是插件自身，不引入新密钥、新网络面、新外部依赖。授权三元组（全部沿用既有边界，无新增）：

| 实体 | 资源 | 动作 |
|---|---|---|
| 编排者（主会话） | `docs/aidlc/<slug>/state.json` | Write（整体覆写，保留 history 及全部既有字段） |
| 编排者（主会话） | `docs/aidlc/<slug>/decisions.md` | Write 追加（Edit 被 guard-gates deny，不变） |
| guard-gates.mjs | `prd.md` / `test-strategy.md` / `decisions.md` | 只读（F4 提取与既有回执校验） |
| auto-route.mjs | `state.json` / `config.json` | 只读（注入摘要不分类，D11 不变） |
| 角色 subagent | state.json / decisions.md | 禁止（既有规则不变） |

**fail-open 风险分析（新增改动逐项）**：

1. **guard-gates F4 扩展**：新代码路径在解析异常时必须走 allow 分支并静默通过（与既有"per-intent 损坏 skip 不 fatal"风格一致），但**缺口命中必须 deny**——deny 分支不受解析异常影响（提取成功才进入比对）。风险点：正则误提取导致误 deny（如 prd 正文示例里出现 AC99）。缓解：提取限定 `## 验收标准` 小节；误 deny 的修复路径是改正工件，无绕过通道，符合 deny-only 哲学。回归要求：guard-gates 28 场景全绿 + 新增场景（缺口 deny / 全覆盖 allow / 缺文件 allow / 存量格式漂移 allow / 非 gate1 转移不触发）。
2. **auto-route route 回显**：只读拼接既有字段，不写文件、不改判定逻辑，零新风险。
3. **express 裁剪**：不触碰任何 hook 代码路径——guard-gates 不读 `route` 字段，两条路线机制强制完全一致。这是刻意的决策（见决策 #3）：裁剪面 100% 落在 prompt 层，§0 守卫边界声明无需修订。
4. **state.json 新字段**：hook 不做 schema 校验，未知字段透传；覆写保留规则（决策见数据模型节）防编排者丢字段。

**守卫语义触碰声明**：本架构不修改 D2（deny-only）、D3（限速带定位）、D11（只注入不分类）任何一条；guard-paths、TDD 锁、回执新鲜度、乐观锁、decisions 只追加，五项机制零改动。

## 开放问题（需人类裁决）

- [ ] express 路线 Gate#2 是否保留独立 verifier？默认方案：人类审批强制不变，verifier 由编排者按影响面（F3 列）建议——high 必派、low/med 可省。
- [ ] express 路线 Operations 阶段 retro.md 默认值：人类可选（gate2 批准时一并裁决），还是一律省略？默认方案取前者。
- [ ] F4 对"AC 被人类判定不可测"的出路：默认方案是 pm 修订 prd 移除/改写该 AC（无绕过通道）；是否需要一个 decisions.md 逐字豁免 + hook 识别豁免标记行的机制？（倾向不做——豁免标记行会让 hook 解析 decisions 的语义变重，且可被滥用。）
- [ ] `testBaseline.coverage` 是否在本 intent 内接入覆盖率采集？默认 null 不采集（本仓库验证命令未声明覆盖率工具）。

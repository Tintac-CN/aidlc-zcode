# Architecture: next-phase

> 产出者：architect　日期：2026-10-14　来源：intent.md + prd.md
> 修订：R1（2026-10-14，Gate#1 打回修订轮，响应 reviews/gate1-ai.md B1/B3/M4/M5/M6/M7/m8/m9/m10/m11；修订处以"（R1 修订：响应 …）"行内标注）
> 修订：R2（2026-10-14，Gate#1 复审打回极小修订轮，逐条响应 reviews/gate1-ai-r2.md：N1/N3/N4/N6/N7/N8/N9/N10/N13/m-N4 及 pm NM-5/NM-6 配套；修订处以"（R2 修订：响应 …）"行内标注）
> 修订：R3（2026-10-14，Gate#1 打回第 3 轮清扫修订（协议最后一轮），逐条响应 reviews/gate1-ai-r3.md：M-R3-1/M-R3-2 及 m-Q2/m-a/m-c/m-d/m-e/m-f/m6/m-D 配合；修订处以"（R3 修订：响应 …）"行内标注。m6 核查：R2 头部响应清单已含 m-N4（N1/N3/N4/N6/N7/N8/N9/N10/N13/m-N4），无需补列）
> 修订：U1（2026-10-15，Construction 附带条件落地，依据 GATE-APPROVED gate1 2026-10-15 附带条件 1-3，响应 reviews/gate1-ai-r4.md M-R4-1/M-R4-2 及 m-R4-1/m-R4-4：回归场景 17（注记格）、整 token 全匹配钉死、m-e 句改写、计数连锁 16→17、check-plugin 两行声明；修订处以"（U1 修订：响应 …）"行内标注；gate2 R2 修订（2026-10-15）：场景 18 补入，计数连锁 17→18 同步、F4 规格补表边界收口条目）

## 逻辑架构

本 intent 是插件的自用进化，改造对象即插件自身的四层结构。P0 规划质量包（F1–F4）的落层遵循既有决策：**判定类逻辑全部在 prompt 层（模型执行），机制层（hook）只做确定性注入与 deny-only 拦截**（D2/D11）。

```
┌─ prompt 层（判定与协议，可被模型违反，人类门兜底）────────────────┐
│  skills/aidlc/SKILL.md        F1 分级协议 / F2 基线步骤 /        │
│                               F3 影响面步骤 / F4 对齐拍语义      │
│  commands/aidlc/inception.md  F1 接入时分级确认                  │
│  commands/aidlc/construct.md  F2 第 0 步基线 + 验证时回归对比    │
│  commands/aidlc/gate.md       F1：门推断真值表按 route 分支      │
│  skills/party-review/SKILL.md F1：gate1 评审对象集合按 route     │
│  agents/dev.md                F1：必读清单 express 分支          │
│  commands/aidlc/status.md     F1：工件缺失项按 route 期望清单    │
├─ 机制层（确定性代码，deny-only / 只注入不分类）──────────────────┤
│  guard-gates.mjs (PreToolUse)  F4：phase→gate1 转移时机械校验    │
│                                AC 编号集合 ⊆ 测试点映射集合，    │
│                                缺口/幻影 → deny（既有 hook 扩展）│
│                                R4 扩展：覆写键保留校验（deny）   │
│  auto-route.mjs (UserPromptSubmit)  F1：摘要行追加 route 回显    │
│                                （只读注入，不分类）              │
│  session-context.mjs (SessionStart) F1：Gates 行追加 route 回显  │
│                                （同构只读注入，不分类）          │
├─ 状态层 ────────────────────────────────────────────────────────┤
│  state.json                   +route（F1）+testBaseline（F2）    │
│  decisions.md                 F1 路由裁决逐字留痕（无新标记行）  │
│  plan.md / units/<n>.md       F3：Units 表加"影响面"列           │
│                               F2：新增"验证命令"声明段           │
└─────────────────────────────────────────────────────────────────┘
```

**各特性落层与边界**：

| F | prompt 层 | hook 层 | state.json | 模板 |
|---|---|---|---|---|
| F1 规模分级路由 | SKILL.md §3 新增"分级接入"小节 + A1 协议 + inception.md；**gate.md 真值表 / party-review SKILL.md / dev.md / status.md 按 route 分支（见下方触点清单）** | auto-route.mjs 摘要行 + session-context.mjs Gates 行追加 `route=` 回显（只读，同构） | `route` 字段 | §7 工件模板加 express 裁剪注记 |
| F2 测试基线 | SKILL.md Construction 第 0 步 + 验证步骤 + status/resume 展示规则 | 无 | `testBaseline` 字段（含 `suites`） | construct.md 命令文本 + plan.md 验证命令段 |
| F3 影响面分析 | SKILL.md Sprint Planning 步骤（Grep/Glob 扫描引用方） | 无 | 无 | plan.md Units 表加列 |
| F4 AC↔测试点覆盖校验 | SKILL.md 对齐拍：缺口=BLOCKER 语义 | guard-gates.mjs 扩展（deny-only） | 无 | 无（模板已有 AC/映射 AC 列） |

**（R1 修订：响应 B3）F2/F3 落层注记**：F2/F3 在 hook 层为"无"是**刻意落层**——基线记录与影响面扫描由编排者（模型）执行，**不存在机制层被测单元**；其验证走 E2E smoke（真实会话闭环）与流程纪律（SKILL 协议 + party-review 评审 + 人类门），**不设确定性单元断言**。qa 据此把 F2/F3 的"单元层"测试点诚实降级为流程评审/E2E。F2 中唯一可机械化的部分是"重跑对比"的集合/计数运算，但它内嵌在编排者的验证步骤里而非独立代码路径，为其单建 hook 等于把编排者变成被 hook 驱动的传声筒，超出本 intent 范围。

**express 触点清单（prompt 层，全部按 `state.json.route` 分支；R1 修订：响应 M4）**——route 缺失或非法值一律按 classic 取集合：

1. `plugins/aidlc/commands/aidlc/gate.md` 门推断真值表第 3 条：`phase = inception 且三工件齐` 改为 **`phase = inception 且工件齐`**，并注明工件齐的判据按 route：`route=express` → prd.md + test-strategy.md 两工件（architecture.md 由 prd.md 内联语义对齐小节替代）；`route` 缺失/非法=classic → 三工件。否则 express intent（2 工件）会被字面量"三工件齐"判为未齐而拒绝进门。（R3 修订：响应 m-D 配合——prd AC4.1 Given 已由 pm 本轮收口为"工件齐（classic 路线三件、express 路线两件）"，与本触点"工件齐判据按 route"表述核对一致。）
2. `plugins/aidlc/skills/party-review/SKILL.md` 流程第 1 步：gate1 评审对象从固定"prd.md/architecture.md/test-strategy.md"改为**按活跃 intent 的 route 取评审集合**（classic 三工件；express 评审 prd.md（含内联语义对齐小节）与 test-strategy.md）。扇出前由编排者读 route 决定，SKILL 文本只写分支规则。
3. `plugins/aidlc/agents/dev.md` Construction 必读清单：加括注"express 路线无 architecture.md，语义对齐以 prd.md 内联小节为准"——否则 express intent 的 dev 泳道按清单找不到 architecture.md。
4. `plugins/aidlc/commands/aidlc/status.md` 工件清单报告：缺失项判定按 route 期望清单——express intent **不得**把 architecture.md 报为缺失/异常；报告增显一行 `route=<值>`（显示语义同 session-context 回显）。
5. `plugins/aidlc/hooks/scripts/session-context.mjs`：Gates 行追加 route 回显，与 auto-route.mjs 的 `routeContract` 头行**同构、只读注入**（同格式、同非法值语义，见数据模型节）。

**全路线触点（R2 修订：响应 N9——非 route 分支，classic/express 均生效，补入触点清单）**：

6. `plugins/aidlc/commands/aidlc/resume.md`：对账差异表新增三类披露行——(i) "F4 未机械校验（损坏修复路径）"（见绕过路径 b）；(ii) preserveKeys 键缺失（修复后 state 缺 `route`/`testBaseline`/`unitStatus`/`tddLock`/`tddLockPaths` 之一而 phase 已过对应阶段，决策 #11）；(iii) `testBaseline.command` 与 plan.md 声明不一致（R1：M7）；对账时呈示 `testBaseline.recordedAt` 与对应 git 提交。
7. `plugins/aidlc/skills/aidlc/SKILL.md` §4（状态查询与续跑）：`/aidlc:status` 与 resume 呈示规则增补——`testBaseline` 缺失或 `unavailable: true` 时显示"无基线 / 基线不可用"（AC2.3/AC2.4 语义），不得呈现为"已对照"。
8. `plugins/aidlc/commands/aidlc/inception.md`（改动规格，一行）：分级确认并入既有 A1 拆分确认——同一次 AskUserQuestion 同时确认"进入生命周期"与"路线选择（express/classic）"（AC1.1），裁决逐字记入 decisions.md 后才建 intent；不新增独立提问步骤。

**express 触点补充（R3 修订：响应 M-R3-2——Operations retro 分支三处，改法均为"按 route 分支（express=人类可选）"，与决策 #3 ④"retro.md 人类可选"对齐）**：

9. `plugins/aidlc/skills/aidlc/SKILL.md:104-105`（学习回流"当前 intent 的学习全部进 `retro.md`"与完结判据"`retro.md` 落盘"的硬性要求）：改为按 route 分支——`route=express` 时 retro.md 为人类可选（裁决形态随 OQ1 子项：gate2 批准时一并裁决或一律省略），classic 保持硬性要求。
10. `plugins/aidlc/skills/aidlc/SKILL.md:241`（§7 retro.md 工件模板）：同上按 route 分支（express=人类可选）。
11. `plugins/aidlc/commands/aidlc/ops.md:11`（"完结后写 `retro.md`（复盘），phase 置 `done`"要求）：同上按 route 分支（express=人类可选）。

**依赖关系**：F4 依赖 prd.md/test-strategy.md 既有模板中的 AC 编号约定——子编号制（`AC\d+\.\d+`，本仓库 prd 实际用法）与扁平制（`**AC1**`，SKILL §7 模板约定）双粒度归一规则见数据模型节（R1 修订：响应 B1）；F2 的回归对比依赖 `tddLockPaths` 与 `testBaseline.suites` 区分"本 intent 新增测试/新增套件"（R1 修订：响应 M7）；F1 的 express 裁剪不改变任何 hook 判定行为（guard-gates 不读 `route`，见关键决策 #3/#12）。

## 数据模型

### state.json 新增字段（均为可选，缺失=旧行为）

```json
{
  "route": "classic | express",
  "testBaseline": {
    "recordedAt": "ISO-8601",
    "command": "<验证命令原文，须与 plan.md 声明一致>",
    "suites": ["scripts/tests/guard-gates.test.mjs", "…"],
    "total": 0,
    "pass": 0,
    "fail": 0,
    "failingTests": ["<FAIL 行去前缀后的行文本>"],
    "unavailable": false,
    "coverage": null
  }
}
```

**约束与降级语义**：

- `route`：缺失/非法值一律**生效语义**为 `classic`（fail-safe 到全量流程，与 auto-route 开关"缺失=off"的惯例一致，D11）。仅在 Inception 建 intent 时经 AskUserQuestion 确认后写入；写入后变更仅限 gate1 批准前、且须人类裁决逐字进 decisions.md。
  - **（R1 修订：响应 M4/m2）回显语义**（auto-route.mjs 与 session-context.mjs 同构）：字段存在且合法 → `route=express` / `route=classic`；字段存在但非法 → **`route=<原值>(invalid→classic)`**（原值透传保持可观测/可调试，生效语义显式标为 classic，与 T06"按 classic 兜底、不崩溃"一致）；字段缺失（存量 intent）→ **不追加任何 route 字样**——保持 v1.1 输出字节级不变，T03 的零行为变化断言才成立。
- `testBaseline`：Construction 第 0 步由编排者运行验证命令并记录（时序锚点定义见决策 #7）。`command` 记录实际执行原文，与 plan.md 声明不一致 = resume 对账差异项（R1 修订：响应 M7/m5）。`suites` 记录基线时**参与统计的套件文件清单**，回归比对只覆盖该清单（套件集合漂移排除，见决策 #6）。`failingTests` 可解析到用例粒度时填全量名单；无法解析时省略该键，退化为计数比较。`coverage` 默认 `null`。
  - **（R1 修订：响应 M7）验证命令的规范来源与本 intent 建议值**：命令原文以 plan.md"验证命令"声明段为规范来源，state 只记实际执行原文（两者不一致 = 对账差异）；plan.md 未声明或存量 intent 无声明时，Sprint Planning 用 AskUserQuestion 向人类询问后回填。本 intent 建议声明值：`node scripts/tests/guard-gates.test.mjs; node scripts/tests/auto-route.test.mjs`——**不用 `&&` 串联（R2 修订：响应 N13）**：首套件存量失败会短路、吞掉次套件的基线记录，与"逐套件解析求和"矛盾；分立执行/`;` 保证两套件基线各自可得（R3 修订：响应 m-c——`;` 串联仅限 POSIX shell；Windows cmd 不支持 `;` 作命令分隔，应分立执行两条命令）。check-plugin.sh 第 3/4 步（`plugins validate`/`plugins list`）依赖本地 ZCode 二进制（`ZCODE_CJS` 或安装路径探测），跨环境不可复现，不纳入基线口径；两套件纯 node 运行、输出结构化，是可复现的最小集。最终值以 plan.md 声明/人类裁决为准。
  - **（R1 修订：响应 M7）pass/fail 计数解析口径（最小约定）**：基线与回归重跑共用同一解析语义。本仓库两套件输出结构一致——逐行 `ok ` / `FAIL ` 前缀的用例行（guard-gates.test.mjs:43、auto-route.test.mjs:51 同约定）+ 尾行 `ALL <n> SCENARIOS|CHECKS PASSED`（失败尾行 `<bad>/<n> FAILED`）。解析约定：`/^ok\b/` 计 pass、`/^FAIL\b/` 计 fail，total = pass + fail；尾行 `ALL <n> …` 的 n 与 pass+fail 交叉核对，**不一致或尾行缺失 = 解析失败 → 按"基线不可用"显式记录（`unavailable: true`、计数键置 null，见下条）并告警**（T12 语义，不得虚构 0 fail；R2 修订：响应 N6）；`suites` 清单内多套件逐套件解析后求和。`failingTests` 取 FAIL 行去前缀后的整行文本作为用例标识（两套件 FAIL 行格式略异，取整行是兼容两者的最小确定性约定）。
  - **（R2 修订：响应 N6）`unavailable` 字段（"基线不可用"的 schema 表示）**：布尔，缺省 `false`；**已尝试记录但验证命令执行失败（非零退出/命令不存在/超时）或输出不可解析**时置 `true`，此时 `total`/`pass`/`fail` 计数键与 `coverage` 键置 `null`、`failingTests` 省略、`suites` **保留原清单**（R3 修订：响应 m-f——`coverage` 与计数键同批置 null；本次参与统计的套件清单不因不可用而丢失，比对范围与 resume 对账仍可追溯）——显式表示"想记记不了"，不虚构 0 fail。此为 T12（P0）断言的 schema 落点；是否因基线不可得阻断后续流程仍归 PRD OQ6 人类裁决，本 schema 只负责可观测表示。
- **（R2 修订：响应 N7(dev)）存量 intent 无这两个字段：route/testBaseline 相关行为零变化，以编排者写入合法保留既有键为前提**——R4 preserveKeys 扩展对存量 intent 同样生效：漏写既有键的整体覆写将被 deny，此为有意的强化而非行为回归。语义细目：`route` 缺省 classic 走全量协议；`testBaseline` 缺失时验证步骤退化为现状（"验证命令通过"即满足），`/aidlc:status` 显示"无基线"。
- **（R1 修订：响应 M6）覆写保留 = R4 确定性扩展，非纯 prompt 纪律**：guard-gates Rule 4 在既有 history 乐观锁同块内增加**键保留校验**（实现要点见决策 #11）——整体覆写丢失 `route`/`testBaseline`/`unitStatus`/`tddLock`/`tddLockPaths` 中的既有键 → deny。原"SKILL §2 补一条覆写保留纪律"的方案降级为辅助（prompt 层仍写明，但不再暗示它与机制层同等可靠——M6 指出的正是这种暗示失实）。
- hook 侧兼容：`findActiveIntent`/`loadIntent` 只 `JSON.parse`，新字段透传无害；guard-gates 不做 schema 校验，新字段不触发任何既有规则。

### F4 机械校验规格（guard-gates.mjs 内，确定性实现；本节整体为 R1 修订：响应 B1/M5/m11；R2 修订：响应 N1/N4/N3/m-N4/N7/N8/N10——T 来源收口、连接符文法、占位正则、空工件缝、直跳窄缝、回归归属；R3 修订：响应 M-R3-1/m-d/m-e——连字符入剔除字符类、映射列定位细节、括注不计 token）

**触发点**：Write `state.json` 且"盘上旧 state 可解析且 `old.phase !== "gate1"`，新内容 `new.phase === "gate1"`"（仅转移瞬间校验，覆写 updatedAt 等不重复触发）。另有两条非典型路径的处置见下方"绕过路径处置"。

**校验流水（按序短路）**：

0. **工件存在性（方向零）**：intent 目录下 `prd.md` 或 `test-strategy.md` 任一**缺失 → deny**（classic 与 express 同规——两条路线的工件集合都包含这两件）。理由：转移瞬间工件缺失是协议违约，不是解析局限；deny 消息指向 `/aidlc:resume` 对账。此项同时封死"先写 state(phase=gate1) 后补工件"的顺序绕过（见绕过路径 c）。
1. **prd 侧小节定位**：读文件去 BOM（U+FEFF）后按行扫描；小节起点 = **`^## 验收标准` 前缀匹配**（实际标题是 `## 验收标准（可测）`，不得用全等）；小节止于下一个 `^## `（`### ` 不截断）；行尾容忍 `\r`（CRLF 容错）。找不到该小节 → 不可解析分支。
2. **编号 token 提取**：参考正则 **`AC\d+(?:\.\d+)?(?!\.?[A-Za-z])`**（R2 修订：响应 m-N4——原"编号后紧跟字母"的文字描述排除不了 `AC1.x`（字母前隔点号），现以负向前瞻 `(?!\.?[A-Za-z])` 排除编号后"可选点号 + 字母"的占位记法）；`AC1.x`、`AC4.x` 式占位（如 prd 侧小节标题 `### F1 规模分级路由（AC1.x）`）因此不注入任何集合。
3. **P 集合（prd 验收标准小节内）双粒度归一**：
   - P 内存在子编号 token（`ACn.m`）→ **子编号制**：P = 全部子编号 token 的集合；裸组 token（`ACn`，如标题/分组行产生）仅当**无法归入任何已有组**（不存在该组任一子编号）时判为**约定混提 → 不可解析分支**，否则视为组封面丢弃、不入 P（"子编号归一到其组"——比对原子是子编号）。
   - P 内无任何子编号 → **扁平制**（SKILL §7 模板风格）：P = 全部 `ACn` token 的集合。
   - 两约定**不混提**：比对粒度由 P 唯一决定，同一对小工件内两种粒度并存即视为格式漂移，走不可解析分支（不猜测、不展开）。
4. **T 集合提取（R2 修订：响应 N1——来源收口为测试点清单表"映射 AC"列单元格，不再取 test-strategy.md 全文）**：
   - **来源限定**：仅从 test-strategy.md `## 测试点清单` 表的 **"映射 AC"列单元格**提取；该列之外的任何正文（场景描述、分层策略、缺口小节等，含示例性字样如"例如 AC99""参见 AC1.1"）一律**不产生 T 证据**。
   - **映射列定位（R3 修订：响应 m-d）**：按表头行的 **"映射 AC"列名匹配**定位目标列（非固定列序）；解析时**跳过表头行与 `|---|` 分隔行**；cell 内 `\|` 转义（竖线字面量）不作为列边界；找不到"映射 AC"表头（含测试点清单表整体缺失）→ **按不可解析分支 allow+披露**。
   - **整格剔除（区间连接符，R2 修订：响应 N4/N3）**：单元格内出现任一区间/范围记法即**整格剔除、两端 token 均不入 T**——范围声明的映射语义机械层无法展开验证，宁可少算交人工（假阴性），不可多算成假覆盖。参考判定（含全角半角），命中任一即整格剔除：
     - 字符类 `[–—~～\-－]`（en dash／em dash／半角波浪线／全角波浪线；R3 修订：响应 M-R3-1——补入半角连字符 `-` 与全角连字符 `－`，**连字符出现在映射列 cell 即整格剔除，不再要求字母/数字相邻**（原相邻判定正则 `/[A-Za-z][-－]\d|\d[-－][A-Za-z]/` 作废）：`AC1.1 - AC4.4` 型空格环绕写法原可借空格分隔绕过相邻判定、两端各自入 T，属假覆盖漏洞；合法分隔白名单 `[，,、/\s]` 本不含连字符，此收紧无副作用）、`\.\.`（连续双点）、`…`（省略号字符）、字面 `至`／`到`。
   - **纯多 token 格合法（R2 修订：响应 N3/N4——取代 R1"分隔符复合格整格剔除"规则）**：分隔符切分后**每个分隔 token 均为合法编号 token** 的格（如 `AC4.1 / AC4.3`）为合法多映射，逐 token 入 T；整格剔除的触发条件**仅剩区间连接符**。
   - **逐 token 提取（U1 修订：响应 M-R4-2——匹配语义钉死为整 token 全匹配）**：通过整格剔除的单元格按 `[，,、/\s]+` 分隔取 token，**当且仅当 token 整体匹配第 2 步编号正则（全匹配，非子串搜索）时入 T**；混合格（如 `AC1.2 / 全局`）按 token 级处理——合法编号 token（`AC1.2`）照常入 T，非编号 token（`全局`）不产生证据。
   - **括注与 token 匹配（R3 修订：响应 m-e；U1 修订：响应 M-R4-2——原句"括注不计入 token"与切分文法矛盾，改写）**：hook 侧不做括注识别或剥离；含括注的格按既有文法处理——括注内若含区间连接符/连字符则整格剔除先行，否则切分后**括注内的合法编号 token 照常入 T**（整 token 全匹配），非编号文字不产生证据。因此"括注移出映射列（场景列或删除）"是**编写纪律而非 hook 行为**；纪律失守的后果已由文法确定化——括注编号入 T 则受幻影 deny 约束、整格剔除则假 deny 的修复路径是清理工件；ac-coverage 回归场景 17 锁定该行为。
   - **表边界收口（gate2 R2 修订：响应 Gate#2-R2 MAJOR-2/M2——补登 b271d4d 代码行为）**：表头定位后遇首个非表行（不以 `|` 起始）即终止收集——本节仅**首张定位表**有效，其后的第二张表（含自带"映射 AC"表头的表）行一律不入 T；表头未定位前的非表行照常跳过（小节内表前 prose 预期内）。方向 fail-closed：漏收 → 缺口 deny → 交人工。回归锁定：ac-coverage 场景 18。
   - **粒度归一**：其余 token 按 P 的制式取同粒度：子编号制下裸组 token 不入 T（组级映射不算子级证据）；扁平制下取 `ACn`。
   - **P/T 提取不对称及其理由（R2 修订：响应 N1）**：P 侧维持现状——验收标准小节内严格提取不变。理由（代价不对称）：P 侧假 deny 的修复路径是改正 prd 工件本身，无绕过通道、成本一次性；T 侧假覆盖则是伪映射证据**静默通过机械门**，代价更高且不可见。故 P 取严（小节内严格提取），T 取结构化（映射列收口）。
5. **判定**：
   - `P − T ≠ ∅` → **deny**，reason 列出缺口编号（子编号制按子编号粒度列出，不再折叠）。
   - `T − P ≠ ∅` → **deny**（幻影编号，AC4.3 方向二），reason 列出幻影编号（选 deny 不选告警的理由见决策 #10）。
   - `P = ∅`、无验收标准小节、约定混提 → **不可解析分支：allow + 显式披露**——emit `permissionDecision: "allow"` 并在 `permissionDecisionReason` 携带披露文本（"F4 无法机械校验：<原因>，交人类门与 party-review 复核"）。allow+reason 与 deny 同构、lib/state.mjs strict schema 零改动。**非静默**是红线：intent.md 原文禁的是 fail-open *静默*失效（B2），披露式 allow 合规；PRD 非目标措辞的精确化由 pm 同轮修订、gate1 复审追认。

**绕过路径处置（每条给明确选择）**：

- **a. brand-new intent 早退（guard-gates.mjs:66 `emit(null)`）→ 封堵**：创建时盘上无 state.json，若新内容 `phase === "gate1"` 或 `gates.gate1 === "approved"`，则在该分支内执行与正常路径相同的回执校验 + F4 工件存在性校验（此时刻两工件通常尚不存在 → deny）。**（R2 修订：响应 N7）工件在盘即继续执行完整 F4 提取——空文件/无验收标准小节按不可解析分支 allow+披露，不留"在盘但为空"的静默缝隙。**理由：复用既有积木、零新依赖；留着绕过等于 F4 锚点可被"删除重建 state"无成本跳过。
- **b. 损坏态修复路径（guard-gates.mjs:69-73）→ 披露 + 人类门兜底（不封堵）**：修复内容含 `gates.*=approved` 已有机读回执校验；F4 不强制，但 `/aidlc:resume` 对账协议新增一项——修复后 state 声称 `phase ≥ gate1` 而 F4 未随修复重跑时，对账差异表必须列出"F4 未机械校验（损坏修复路径）"披露行并在 gate1 人审呈示。理由：修复路径的首要不变量是"损坏永远可修复"；封堵会在 prd 与 state **同时**损坏时制造死锁（写 state 被存在性校验挡、补 prd 又被损坏态 fail-closed 挡），违背"corruption is fixable but never silently disables the guards"的既有承诺。
- **c. 先写 state(phase=gate1) 后补工件 → 已被方向零封堵**；残余 = 转移通过后再改工件内容不重触发校验。**披露为已知残余**：兜底 = gate1 人类审批审的就是最终工件 + party-review"编号对不上"必查项；对工件做连续内容监控会把 deny-only hook 变成内容审查器，明确不做；PRD 修订后的重跑时机归 OQ4 人类裁决。
- **d.（R2 修订：响应 N8）单写 inception→construction 直跳、跳过 gate1 中间态**：一次 Write 使 `phase` 自 inception 直达 construction（含同写 `gates.gate1="approved"` + `phase="construction"`），→gate1 转移触发点不命中。处置：**不另设 hook**——`gates.gate1="approved"` 仍须通过既有回执校验（R3：回执存在性 + 晚于最近 GATE-REJECTED 的行序比较），无回执即 deny；余下缝隙由 resume 对账披露（state 声称 gate1 已过而缺对应回执/转移痕迹时列差异行呈示人类）。

**回归清单（R2 修订：响应 N10——归属裁定：下列新增场景归独立套件 `scripts/tests/ac-coverage.test.mjs`；`guard-gates.test.mjs` 保持既有 28 场景不动，T40 的"28"口径随之稳定；check-plugin.sh §2 增两行：`node scripts/tests/route-profile.test.mjs` 与 `node scripts/tests/ac-coverage.test.mjs`——U1 修订：响应 m-R4-4，route-profile 行归属落地）**：

1. 子编号不折叠：AC4.2/4.3/4.4 全无映射时 deny（修复 B1 的恒通过缺陷）
2. 范围连接符整格剔除：`AC1.1–AC4.4`、`AC1.1-AC4.4`（半角连字符）、`AC1.1–AC4.x` 均不产生 T 证据（R2 修订：响应 N4——补半角连字符变体）
3. 混合格 token 级处理（R2 修订：响应 N3——原"分隔格剔除"规则作废）：`AC1.2 / 全局` 仅 `AC1.2` 入 T，`全局` 不产生证据
4. 占位记法排除：`（AC1.x）` 不注入 P/T
5. 小节前缀匹配：`## 验收标准（可测）` 命中；`### ` 不截断小节
6. CRLF 行尾 + BOM 头的 prd 可正常提取
7. 扁平制工件按 `ACn` 粒度正常校验（SKILL §7 模板风格）
8. 方向二：`T − P ≠ ∅` deny
9. 工件缺失 deny（prd / test-strategy 分别缺失各一例）
10. 不可解析 allow + 披露文本存在
11. 创建即 phase=gate1 的 brand-new 写入 deny
12. 非 gate1 转移不触发（既有回归保留）
13. express 两工件路线同样适用（无 architecture.md 不影响 F4）（R3 修订：响应 m-D 配合——与 prd AC4.1 收口措辞"classic 三件/express 两件"核对一致）
14. 映射列外不提取：场景描述中的示例字样"例如 AC99"不产生 T 证据（R2 修订：响应 N1）
15. 纯多 token 格：映射列内 `AC4.1 / AC4.3` 双 token 各自入 T（R2 修订：响应 N1/N3）
16. 空格环绕连字符整格剔除：`AC1.1 - AC4.4`（空格环绕半角连字符）整格剔除、两端不入 T（R3 修订：响应 M-R3-1——原空格分隔可绕过相邻判定使两端入 T，假覆盖）
17. 注记格（U1 修订：响应 M-R4-1——R3 BLOCKER 毒化向量的回归锁定）：映射列 cell 含"（R1 修订：…——…）"式注记（em dash 命中整格剔除字符类）时整格剔除、两端不入 T；映射列纯化后 P−T 无缺口（以本 intent 工件为 fixtures）
18. 表边界收口（gate2 R1 修复 b271d4d + R2 回归锁 2039ac0——响应 M2）：映射表 → 正文段 → 无映射表头的第二张统计表（同列序恰含 AC1.2）——第二张表不注入 T，真实缺口 AC1.2 仍 deny 点名（若旧实现跨表收集则 T 假覆盖、断言必红）

### plan.md 模板变更（F3 + F2 命令声明）

- Units 表加一列：`| # | Unit | 目标 | 涉及文件 | 影响面 | 测试 | 验收 |`。影响面取值 `low | med | high（引用方 N） | unknown`（**R2 修订：响应 NM-6**——补 `unknown`：扫描工具不可用或引用关系无法解析时标注，计入交付物"缺口与开放问题"，不得静默省略或猜测填 low，AC3.3）：low=无外部引用方/单一消费方；med=少量同层消费方；high=跨层/共享类型/引用方众多。high 的 unit 必须在"执行顺序"中说明拆分或排序理由。**上述分级阈值为默认方案，待 PRD OQ3 裁决后回填（R2 修订：响应 NM-5）。**
- **（R1 修订：响应 M7/m5）新增"验证命令"声明段**：Sprint Planning 在此声明基线/回归共用的验证命令原文（规范来源）；缺省（未声明或存量 intent）时 Sprint Planning 用 AskUserQuestion 向人类询问，裁决逐字进 decisions.md 后回填 plan.md。`state.testBaseline.command` 与 plan.md 声明不一致 = resume 对账差异项。

## 与 PRD 的语义对齐表

已按对齐拍回填 PRD 实际 AC 编号（**R2 修订：响应 N8**——PRD AC 全集更新为 21 条：AC1.1–AC1.7 / AC2.1–AC2.5 / AC3.1–AC3.4 / AC4.1–AC4.4 / AC5.1）。

| PRD 动词 | 物理语义 | 说明 |
|---|---|---|
| 分级（F1）→ AC1.1、AC1.3、AC1.4 | state.json 写入 `route` 字段 + decisions.md 逐字留痕 | AI 提议、AskUserQuestion 确认；无 hook 参与判定 |
| 裁剪（F1）→ AC1.2 | express 路线不派发 architect、不产 architecture.md；party-review 扇出压缩；八处触点按 route 分支（见触点清单；R3 修订：响应 M-R3-2——五→八，补 retro 三处） | 纯 prompt 层裁剪；hook 强制项（人类回执、decisions 留痕、TDD 锁）零裁剪 |
| 保住（F1）→ AC1.5 | 既有 auto-route config 门零改动：`autoRouting=false`/config 缺失/畸形 → 不注入路由、不弹确认，与现状一致 | 既有 opt-in 惯例（D11）隐式保住，无新代码路径；T08 回归兜底（R2 修订：响应 N8——补行） |
| 兜底/变更（F1）→ AC1.6、AC1.7 | AC1.6：非法值一律按 classic 生效，回显 `route=<原值>(invalid→classic)`（决策 #12）；AC1.7：express→classic 单向升级、gate1 批准前、人类裁决留痕（决策 #9）；缺省=classic（决策 #2） | 语义已在数据模型与决策 #2/#9/#12，本行补 AC 对齐（R2 修订：响应 N8——补行） |
| 记录（F2）→ AC2.1、AC2.3 | Construction 第 0 步运行验证命令，结果写 state.json `testBaseline` | 单一事实源在 state.json，不双写 plan.md；命令规范来源 = plan.md 声明（R1：M7） |
| 对比（F2）→ AC2.2 | gate2 验证时重跑同一命令，新失败=回归=BLOCKER | 用例粒度优先，计数粒度兜底；比对范围限 `suites` 清单（R1：M7） |
| 续跑（F2）→ AC2.4 | 存量 intent 无 `testBaseline` 字段：`/aidlc:resume` 续跑行为与现状一致——不要求回填基线、不中断、不弹新确认（降级语义见数据模型"存量 intent 无这两个字段"条与决策 #2） | 落点 = 触点 7（status/resume 呈示规则：无基线时显示"无基线"，不得呈现为"已对照"）+ 数据模型降级语义；与 prd AC2.4"续跑行为与现状一致，不要求回填基线"对应（R3 修订：响应 m-Q2/m-a——补行，21 条 AC 全部有行） |
| 声明（F2）→ AC2.5 | 验证命令规范来源 = plan.md"验证命令"声明段；未声明时 Sprint Planning 以 AskUserQuestion 向人类询问后回填 | R1：M7 已落机制，AC2.5 为其 PRD 背书，无新增设计（R2 修订：响应 N8——补行） |
| 扫描（F3）→ AC3.1、AC3.2、AC3.3、AC3.4 | Sprint Planning 用 Grep/Glob 查引用方，结果写 plan.md 影响面列 | 纯 prompt 层，无机制强制；无被测单元，验证走 E2E/流程评审（R1：B3） |
| 校验（F4）→ AC4.1、AC4.2、AC4.3 | guard-gates.mjs 在 phase→gate1 转移时按提取规格机械比对：缺口 deny、幻影 deny | 机制层强制；缺失=deny、不可解析=allow+披露交人类门（R1：B1/M5） |
| 豁免边界（F4）→ AC4.4 | 校验仅 phase→gate1 转移触发；存量 construction 及之后不补跑；gate1 打回→修订→再推进（bounce-back）属"此后修订的 Inception 工件"，正常触发、不豁免 | 触发点定义（F4 规格节）+ 绕过路径处置已覆盖该语义（R2 修订：响应 N8——补行） |
| 同步（F5）→ AC5.1 | 文档同步（README.md / docs/index.html 反映 F1–F4）属**发布流程 prompt 层步骤**：落 SKILL.md 交付/发布步骤要求与发布清单核对项，不新增 hook、不改任何运行时行为 | 纯流程纪律、无机制层被测单元；与本架构开放问题无关（R2 修订：响应 N8——AC5.1 此前全文零落点，此为新增落点） |

## 关键决策与理由

| # | 决策 | 为什么 |
|---|---|---|
| 1 | F1/F2/F3 的判定与执行全部落 prompt 层（SKILL.md + 命令），state.json 只存结果字段；hook 新增行为仅三项：F4 deny 校验、auto-route/session-context 的 route 只读回显、guard-gates R4 键保留校验 | D11 既定模式：hook 误判不可逆所以只注入不分类；分级提议、影响面分级都是判断性工作，机制层做不了也不该做。route 回显与现有 unitStatus 回显同构（只读注入）。（R1 修订：响应 M4——回显补齐 session-context 触点；响应 M6——R4 扩展入列） |
| 2 | `route` 缺失=classic、`testBaseline` 缺失=无基线旧行为 | intent.md 约束"存量用户零行为变化"；与 config.json"缺失/畸形=off"的 fail-safe 惯例（D11）一致，升级安全。 |
| 3 | express 裁剪清单（**默认方案，最终以 PRD OQ1 人类裁决为准，裁决后回填本表**）= ① Inception 不产 architecture.md（语义对齐约定并入 prd.md 内联小节）② party-review 交叉评审压缩为单轮合并评审（或人类直审两工件）③ plan.md 允许单 unit ④ Operations 的 retro.md 改为人类可选。**不裁**：gate1/gate2 人类审批回执、decisions.md 逐字留痕、TDD 锁、guard-gates/guard-paths 全部 hook、F2 基线、F4 校验 | 直接回应 qa 风险：§0 守卫边界声明"门控处的人类复核是唯一可信兜底"——express 裁剪的全部是 **AI 侧产出与互审扇出**（prompt 层便利），机制层强制项一项不动。guard-gates 对 plan.md/units 的门禁、回执校验（回执存在性 + 晚于最近 GATE-REJECTED，行序比较）对两条路线字节级一致。参照 aidlc-workflows profile（Express 10/33 仍保留门）与 BMAD 规模决策树（research-digest D12）。（R1 修订：响应 M7——清单显式标注为待裁决默认方案，不再与 OQ1 形成"既已决策又重开"的矛盾；响应 m10——"回执新鲜度"措辞更正为"回执存在性 + 晚于最近 GATE-REJECTED"，机制实为 checkGateReceipts 的行序比较而非时间戳新鲜度） |
| 4 | F4 机械校验放 guard-gates.mjs（既有 PreToolUse deny hook 扩展），不放编排者 grep、不新建 hook | 任务要求"hook 是确定性代码，不能依赖模型"——编排者 grep 本质是模型自觉执行，长上下文下会稀释（§0 常驻约束教训）。guard-gates 已拦截 state.json 写入且已读 decisions.md 做回执校验，扩展它读 prd/test-strategy 是同构改动，不新增 hook 进程与 hooks.json 条目（每多一个 hook 多一份 fail-open 面）。触发点选 phase→gate1 转移：这是"工件齐"的唯一机制锚点。（R1 修订：响应 B1——提取规格按双粒度归一/排除规则/前缀匹配完整化，见数据模型节 F4 规格） |
| 5 | F4 的失败边界三分：**工件缺失=deny**（fail-closed）；**提取成功但有缺口/幻影=deny**（fail-closed）；**文件在但不可解析（无小节/P=∅/约定混提）=allow + 显式披露**（披露式 fail-open） | intent.md 红线原文是"新 hook 不得 fail-open **静默**失效"——披露式 allow 与之一致，合规前提是 pm 同轮把 PRD 非目标精确化为"未经披露的 fail-open / 主路径不得 fail-open"并显式豁免本披露分支（reviews/gate1-ai.md B2 裁决方向，复审追认）。缺失改 deny 消灭顺序绕过（gate1-ai.md M5），且两条路线都要求这两件工件存在，不误伤 express。不可解析若也 fail-closed，会把格式漂移的存量 intent 硬挡在 gate1 外，违反 U5/AC1.4/AC4.4 兼容约束——此侧由人类门 + party-review"编号对不上"必查项兜底，符合 D3 定位：hook 是限速带不是安全边界。原决策"文件缺失→allow"作废。 |
| 6 | F2 基线只写 state.json，不双写 plan.md；回归判定 = 重跑后"基线中 pass 的用例现在 fail"（用例粒度）或"fail 总数 > 基线 fail"（计数粒度兜底）；**比对范围 = `testBaseline.suites` 清单内、且不在 `tddLockPaths` 中的用例** | 单一事实源防双写漂移。排除本 intent 新测试（tddLockPaths）是因为 TDD 流程中它们必然先红后绿；**排除基线后新增的套件**（`suites` 清单外科件，如本 intent 自己要新增的 route-profile / ac-coverage 两套件——F2/F3 无套件；R2 修订：响应 N6，原"route-profile/test-baseline/blast-radius/ac-coverage 四套件"示例已过期）是同一逻辑的套件级推广——否则"基线外新失败=回归"会判定本 intent 自己的新套件自阻（gate1-ai.md M7 套件集合漂移）。存量 intent 无 `suites` 键 → 退化为 tddLockPaths 排除法。来源：aidlc-workflows Test Baseline Protocol（research-digest B6）。**已知局限（披露，gate1-ai.md m9）**：计数兜底存在"等量置换"漏报——一个基线 pass 用例翻红恰被一个基线 fail 用例翻绿抵消时 fail 总数不变；缓解 = `failingTests` 可解析时永远用名单比对，计数兜底仅 runner 输出非结构化时启用，且启用计数的 intent 在 gate2 人审呈示"本次为计数口径"披露行。 |
| 7 | F2 对比时机 = Construction 第 4 步（声明"验证命令通过"之前），回归=BLOCKER 须修复或人类在 decisions.md 逐字豁免 | 与 aidlc-workflows 一致（验证前比对）；豁免路径保留人类最高裁决权。**（R1 修订：响应 m8）"第 0 步"的时序锚点统一定义**：唯一硬约束是**基线记录先于任何本 intent 测试文件写入（含 dev 失败测试）**；落点 = Sprint Planning 内、"验证命令"声明之后立即执行——"第 0 步"是这个子步骤的名称而非独立阶段。SKILL.md Construction 协议修订时在第 1 步（Sprint Planning）下加"0. 记录基线"子条目（或将步骤清单显式改为 0–4 编号），架构以时序锚点为准、不与现行 1–4 编号绑定，消除表述冲突。 |
| 8 | F3 影响面落 plan.md 新列，不进 state.json、不做 hook 强制 | 影响面是规划时的判断产物（research-digest B7，aidlc-workflows Blast Radius 也是"改前强制"的流程纪律而非机器门禁）；A3 拆分确认（人工）与 party-review 是自然的人工复核点。做成 hook 强制需要理解 import 语义，超出确定性正则能力，硬做只会 fail-open。**（R1 修订：响应 B3）落层注记**：F2/F3 无机制层被测单元，其验证走 E2E smoke 与流程纪律（prompt 层）——qa 据此降级对应测试点层级。 |
| 9 | route 允许 express→classic 升级（gate1 批准前、人类裁决留痕），禁止 classic→express 降级 | 升级是补工件，安全；降级是追溯性豁免已承诺的工件与评审，会破坏审计链语义。（R1 修订注：gate1-ai.md M2 指出 T06/T07 所测语义缺 PRD AC 背书——语义本身保留于本架构，AC 背书由 pm 修订补齐；非法值回显语义见决策 #12） |
| 10 | **（新增，R1：响应 M5）F4 方向二（`T − P ≠ ∅` 幻影编号）机械化为 deny，不采告警** | AC4.3 已把幻影定为 BLOCKER——机械层若只告警就与 PRD 语义分叉，对齐拍复核过的错位会以"无强制"状态复发。误 deny 的修复路径是删除/改正 test-strategy 中的陈旧引用，与缺口 deny 同级、无绕过通道、成本一次性。**（R2 修订：响应 N1）T 集合来源收口为测试点清单表"映射 AC"列的结构化提取**——原理由"T 集合的范围片段与复合格剔除规则已把正文讨论性文本的误报源压到最低"已被 qa 实测证伪（取全文时 T52 行的"例如 AC99"必然入 T 造成幻影 deny），本轮以来源收口替代该表述。P/T 代价不对称：P 侧假 deny 可修复工件、无绕过通道、成本一次性，T 侧假覆盖是伪映射证据静默过门——故 P 侧维持小节内严格提取，T 侧以映射列收口换取结构化与确定性。 |
| 11 | **（新增，R1：响应 M6）覆写保留做 R4 确定性扩展（键保留校验），不做纯 prompt 纪律** | `testBaseline` 被覆写丢失 = 回归门**静默失效**（弱化方向），prompt 纪律在长上下文下会稀释（§0 教训），"与乐观锁同向"的暗示不能代替机制。实现要点：guard-gates.mjs Rule 4 块内、history 校验同模式——读盘上 state，对 `preserveKeys = ['route','testBaseline','unitStatus','tddLock','tddLockPaths']` 逐一检查：盘上键 defined 且非 null、而新内容缺该键或为 null → deny（消息列出丢失键，指示重读磁盘 state 后完整保留再写）。**值变更不拦截**：unitStatus per-unit 推进、gate1 批准前的 route 升级留痕、tddLockPaths 并集都是合法写路径，值冻结会把正常流程机械卡死；由此 `testBaseline` 值篡改是残余风险（弱化方向），披露并由 resume 对账新增项（呈示 `testBaseline.recordedAt` 与对应 git 提交）+ gate2 人审兜底。`tddLockOverride` 暂不入集合（解锁后是否清空无既定语义，入集合会把合法解锁路径卡死）。**覆盖洞披露**：损坏修复路径不经 Rule 4（`own==null` 早退）——由 resume 对账项兜底：修复后 state 缺这些键而 phase 已过对应阶段 → 列差异报告人类。 |
| 12 | **（新增，R1：响应 M4/m2）route 回显与非法值显示语义：`route=<原值>(invalid→classic)`；字段缺失不回显** | 非法值原值透传保持可观测（直接改写显示值会掩盖脏数据），生效语义显式标 classic（与决策 #2 fail-safe 一致，T06 断言可写）；存量 intent 不追加 route 字样，保证 v1.1 输出字节级不变（T03 零行为变化）。auto-route.mjs 与 session-context.mjs 用同一格式语义，避免两处回显漂移。 |

## 安全与权限

本 intent 改的是插件自身，不引入新密钥、新网络面、新外部依赖。授权三元组（全部沿用既有边界，无新增）：

| 实体 | 资源 | 动作 |
|---|---|---|
| 编排者（主会话） | `docs/aidlc/<slug>/state.json` | Write（整体覆写，保留 history 及全部既有键——R4 键保留校验强制） |
| 编排者（主会话） | `docs/aidlc/<slug>/decisions.md` | Write 追加（Edit 被 guard-gates deny，不变） |
| guard-gates.mjs | `prd.md` / `test-strategy.md` / `decisions.md` | 只读（F4 提取与既有回执校验） |
| auto-route.mjs | `state.json` / `config.json` | 只读（注入摘要不分类，D11 不变；新增 route 回显同为只读拼接） |
| session-context.mjs | `state.json` / `decisions.md` | 只读（既有 resume 注入；新增 route 回显同为只读拼接，D11 不变） |
| 角色 subagent | state.json / decisions.md | 禁止（既有规则不变） |

**fail-open 风险分析（新增改动逐项，R1 修订：响应 B2/M5）**：

1. **guard-gates F4 扩展**：失败边界三分后唯一 fail-open 分支是"不可解析 → allow"，且**必须携带披露文本，禁止静默**（allow+reason 与 deny 同构，strict schema 零改动）。工件缺失与缺口/幻影均 deny，deny 分支不受解析异常影响（提取成功才进入比对）。风险点：误 deny（映射列记法漂移被整格剔除造成缺口误报；R2 修订：响应 N1——原"正文讨论性 AC 字样进 T"风险已随 T 集合收口到映射列而消除）。缓解：映射列来源限定 + 区间连接符（含连字符，R3 修订：响应 M-R3-1）整格剔除 + 占位记法排除（P 侧小节限定不变；R2 修订：响应 N1/N4——原"复合格整格剔除"被 token 级文法取代）；误 deny 修复路径是改正工件，无绕过通道。回归要求：既有 guard-gates 28 场景全绿（套件不动，T40 口径稳定）+ F4 规格节 18 个新场景（归独立 ac-coverage.test.mjs，check-plugin.sh §2 增 route-profile/ac-coverage 两行；R2 修订：响应 N10；R3 修订：响应 M-R3-1——15→16；U1 修订：响应 M-R4-1/M-R4-2/m-R4-4——16→17、两行声明；gate2 R2 修订：响应场景 18 补入——17→18）。
2. **guard-gates R4 键保留扩展**：纯 deny 增量，无 fail-open 面；风险是误伤合法写路径——已按"键保留、值放行"收窄校验，`tddLockOverride` 明确不入集合；损坏修复路径的覆盖洞由 resume 对账项披露兜底（决策 #11）。
3. **auto-route / session-context route 回显**：只读拼接既有字段，不写文件、不改判定逻辑；非法值按"原值+(invalid→classic)"显示，零新风险。
4. **express 裁剪**：不触碰任何 hook 判定代码路径——guard-gates 不读 `route` 字段（F4 工件存在性对两条路线同规），两条路线机制强制完全一致。这是刻意的决策（见决策 #3）：裁剪面 100% 落在 prompt 层，§0 守卫边界声明无需修订。
5. **state.json 新字段**：hook 不做 schema 校验，未知字段透传；丢失由 R4 键保留校验机械拦截（决策 #11），`testBaseline` 值篡改与计数等量置换（m9）是披露的残余风险，兜底 = resume 对账呈示 + gate2 人审。
6. **顺序绕过残余**：F4 只在 phase→gate1 转移瞬间校验，转移后修改工件内容不重触发——披露为已知残余，兜底 = gate1 人审（审的是最终工件）+ party-review 编号必查项；PRD 修订后的重跑时机归 OQ4。

**守卫语义触碰声明（R1 修订：响应 M6/m10）**：本架构不修改 D2（deny-only）、D3（限速带定位）、D11（只注入不分类）任何一条；guard-paths、TDD 锁、回执校验（机制 = 回执**存在性 + 晚于最近 GATE-REJECTED** 的行序比较，措辞以 guard-gates.mjs 头注释为准）、decisions 只追加五项机制零语义改动。对既有机制的唯一触碰是 guard-gates 内的两处 **deny-only 增量**：Rule 4 校验集扩展（键保留）与新增 F4 校验分支——均为收紧方向，不放松任何既有拦截。

## 开放问题（需人类裁决）

- [ ] express 路线 Gate#2 是否保留独立 verifier？（OQ1 子项，与 pm 的 OQ1 裁决一并处理，不单独重开）默认方案：人类审批强制不变，verifier 由编排者按影响面（F3 列）建议——high 必派、low/med 可省。
- [ ] express 路线 Operations 阶段 retro.md 默认值（OQ1 子项）：人类可选（gate2 批准时一并裁决），还是一律省略？默认方案取前者。
- [ ] F4 对"AC 被人类判定不可测"的出路：默认方案是 pm 修订 prd 移除/改写该 AC（无绕过通道）；是否需要一个 decisions.md 逐字豁免 + hook 识别豁免标记行的机制？（倾向不做——豁免标记行会让 hook 解析 decisions 的语义变重，且可被滥用。）
- [ ] `testBaseline.coverage` 是否在本 intent 内接入覆盖率采集？默认 null 不采集（本仓库验证命令未声明覆盖率工具）。

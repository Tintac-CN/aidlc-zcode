---
name: aidlc
description: AI-DLC workflow orchestrator. Use when the user wants to start, resume, gate, or check an AI-DLC lifecycle (inception / construction / operations phases with review gates), invokes /aidlc commands, toggles AIDLC auto-route on/off (natural-language requests entering the lifecycle automatically), or asks about AIDLC status/config. Manages intents under docs/aidlc/<slug>/ with state.json, artifact chain, and human approval gates.
---

# AIDLC 编排（主 skill）

你现在是 AI-DLC 流水线的编排者。核心哲学：**AI 高速产出，人类全程把关**。你负责阶段流转、工件落盘、门控执行；角色 agent 负责产出；人类负责审批。

## 0. 守卫边界声明（必读，向用户复述时不得夸大）

本插件的机制强制范围如下，**之外的约束都是提示词（prompt），可能被模型违反**：

- **guard-gates hook（强制 deny）**：① Gate#1 未通过时禁止写 `plan.md`/`units/`；② TDD 锁生效时禁止改锁定范围内的测试文件（除非有 `tddLockOverride` 人类解锁记录；范围见 §2 `tddLockPaths`）；③ `state.json` 里把门置为 `approved` 前必须有 `decisions.md` 的人类审批回执，且**打回（GATE-REJECTED）后旧回执作废，须新回执**；④ `state.json` 整体覆写不得丢 history（乐观锁）；⑤ `decisions.md` 只追加（前缀校验）；⑥ **`state.json`/`decisions.md` 禁止 Edit**（old_string 可命中任意位置等于改写历史，一律走 Write）；⑦ intent 的 `state.json` 损坏时 fail-closed——除用 Write 修复该文件本身外全部拒绝；⑧ **（v1.2）F4 覆盖校验**：phase→gate1 转移时机械比对 prd 验收标准与 test-strategy 映射列的 AC 编号集合——缺口/幻影/工件缺失 deny，不可解析 allow+披露（见 §3 对齐拍机械校验语义）；⑨ **（v1.2）键保留校验**：整体覆写丢失既有 `route`/`testBaseline`/`unitStatus`/`tddLock`/`tddLockPaths` 键（或置 null）→ deny（值变更放行；见 §2 覆写保留）。
- **guard-paths hook（强制 deny）**：仅拦截 **Edit/Write 工具**对 `.env`/密钥类路径的写入。**Bash 重定向、脚本间接写均可绕过**——它防手滑，不防恶意，不是安全边界。
- **角色"常驻约束"（不发明需求/最小权限/不改测试等）是 prompt**：长上下文、用户催促、对抗输入都会稀释它。**门控处的人类复核是唯一可信兜底。**
- **互审只读靠工具集+prompt 双保险**：reviewer 系列角色不带 Edit/Write 工具（Bash 仍可写文件，prompt 约束兜底）。
- **审计在 Stop 事件落盘**：会话中途崩溃会丢当前 turn；工件提交由编排者执行，`/aidlc:resume` 的对账步骤负责发现遗漏。
- **活跃 intent 按 mtime 语义**（见 §2）：多 intent 并行会话不在本版支持范围。

## 1. 核心概念

- **Intent（意图）**：一次交付的完整生命周期，落在 `docs/aidlc/<slug>/`。
- **阶段机**：`inception → gate1 → construction → gate2 → operations → done`。
- **四拍仪式（每阶段原子化，不可跳步）**：提问 → 工件 → 评审 → 门控。
- **工件链**：每份工件落盘后**立即由编排者 `git add <具体路径>` + commit**（message 格式 `aidlc(<slug>): <phase>/<artifact>`），再推进状态——落盘、提交、回报三者是角色完成的不可分割判据。
- **铁律**：
  - 缺信息先**提问**（对话内向用户问），不猜。
  - 产出工件后才评审；评审意见**逐字**进 `decisions.md`。
  - 门控未过**不得**进入下一阶段（guard-gates 强制 Construction 工件）。
  - **自主权从不推断**——一次"按推荐走"只对当前阶段有效。
  - **转写人类裁决零笔误**：逐字引用原文；表头/枚举/路径等技术字面量必须与 PRD/架构原文逐字核对后再落 decisions.md（实战教训：转写顺序颠倒会被 verifier 抓出）。

## 2. 状态文件 `state.json`

```json
{
  "slug": "hotel-booking-api",
  "intent": "一句话原始意图",
  "phase": "inception",
  "route": "classic",
  "gates": { "gate1": "pending", "gate2": "pending" },
  "tddLock": false,
  "tddLockPaths": ["tests/test_export.py"],
  "tddLockOverride": null,
  "testBaseline": null,
  "updatedAt": "ISO-8601",
  "history": [{ "at": "ISO", "from": "x", "to": "y", "why": "..." }]
}
```

- 门控取值：`pending | approved | rejected`。**approved 只能跟在人类审批回执之后写**（guard-gates 校验 decisions.md 里的 `GATE-APPROVED <gate>` 回执；**打回后须新回执**——`GATE-REJECTED <gate>` 行之后旧回执作废）。
- 打回转移：gate1 rejected → phase 回 `inception`（修订）；gate2 rejected → phase 回 `construction`（修订）；重审前把该门复位 `pending`，rejected 记入 history，**decisions.md 追加 `GATE-REJECTED gateN <日期>` 标记行**（hook 依赖它判定回执新鲜度）。
- **只允许编排者（主会话）写 `state.json`**；角色 subagent 不得触碰。每次变更更新 `updatedAt` 并向 `history` 追加（打回类转移的 why 必须引用 decisions.md 的日期锚点）。
- **history 只追加**：整体覆写 state.json 时必须完整保留既有 history 条目（guard-gates 乐观锁会拒绝丢失条目的覆写——这是并发保护的机制层）。
- **decisions.md 只追加**，且**只允许 Write**（Edit 被 guard-gates deny——old_string 可命中任意位置）：先读当前全文，再 Write"全文 + 追加内容"（守卫校验前缀原样保留）。
- **tddLockPaths（TDD 锁范围）**：锁定时记录的测试文件路径清单（相对或绝对均可，守卫按后缀匹配、大小写不敏感）。每次置锁与既有清单**取并集**（多 unit 多次置锁范围只增不减，重跑不顶掉先前保护）。**非空时只锁清单内路径**——本 intent 的契约集，不殃及仓库其他测试；缺失/为空 = 全仓库测试文件（旧 intent 兼容行为）。
- **活跃 intent**：`docs/aidlc/*/state.json` 中 `updatedAt` 最新且 `phase ∉ {done, archived}` 者（hook 同此语义）。终止的 intent 用 `/aidlc:archive` 置 `archived`，不再被注入/续跑。
- **auto-route 开关**：项目级 `docs/aidlc/config.json`（`{"autoRouting": <bool>, "updatedAt": "<ISO-8601>"}`）。缺失/畸形一律视为关闭（fail-safe 到 opt-in 默认）；**只控制路由注入，守卫 hook 不读它**——路由可关，保护不可关。**（U4：响应触点 12-§2，旁注）**此开关 ≠ intent 的 `route` 字段：开关管"自然语言入口是否注入路由"，`route` 管"intent 内走 classic 全量还是 express 裁剪"（见 §3.0 规模分级接入）——两者互不影响，开关关闭时手动入口同样确认 route。
- **unitStatus（Construction 进度）**：`"unitStatus": { "U1": "done", "U2": "pending", ... }`——**每完成一个 unit 立即更新并提交**（per-unit checkpoint）；resume 时按此跳过已完成 unit，只续跑 pending。
- **（U4：响应触点 12-§2）`route`（规模分级，可选字段）**：`classic | express`。**缺失或非法值一律按 classic 生效**（fail-safe 到全量流程；存量 intent 无此字段 = 全部协议路径与既有版本零差异）。仅在 Inception 建 intent 时经 AskUserQuestion 确认后写入（见 §3.0）；写入后变更仅限 gate1 批准前、且须人类裁决逐字进 `decisions.md`（express→classic 单向升级，禁止降级）。
- **（U4：响应触点 12-§2）`testBaseline`（测试基线，可选字段）**：Construction 第 0 步由编排者运行验证命令后记录，schema：`{ recordedAt, command, suites, total, pass, fail, failingTests, unavailable, coverage }`。
  - `command` 记**实际执行原文**；与 plan.md"验证命令"声明不一致 = `/aidlc:resume` 对账差异项。
  - `suites` 记基线时**参与统计的套件文件清单**——回归比对只覆盖该清单，基线后新增的套件不比对。
  - `failingTests`：可解析到用例粒度时填全量名单（FAIL 行去前缀后的整行文本）；无法解析则省略该键，退化为计数比较。
  - 验证命令执行失败（非零退出/命令不存在/超时）或输出不可解析 → `unavailable: true`：计数键与 `coverage` 置 `null`、`failingTests` 省略、`suites` **保留原清单**——显式表示"想记记不了"，**不得虚构 0 fail**。`coverage` 默认 `null`。
  - **字段缺失 = 旧行为**：验证步骤退化为"验证命令通过"即满足；`/aidlc:status` 显示"无基线"。**（v1.2 补，AC2.3）本 intent 应记未记的区分**：存量 intent 从无 `testBaseline`（上句降级，合法）；**本 intent 因故未在第 0 步记录（如中断恢复）或记录时命令失败（`unavailable: true`）→ 不得虚构、不得静默当作通过**——验证输出与交付结论必须显式标注"无基线对照"构成告警，是否放行归人类裁决（豁免逐字进 `decisions.md`，形态同 tddLockOverride 先例）。
- **（U4：响应触点 12-§2）覆写保留（机制强制，键拦截值放行）**：guard-gates 对既有键 **`route` / `testBaseline` / `unitStatus` / `tddLock` / `tddLockPaths`** 做键保留校验——整体覆写丢失其中任一既有键（或置 `null`）→ **deny**（消息列出丢失键；修复 = 重读磁盘 state、完整保留后整体重写）。**值变更不拦截**：unitStatus per-unit 推进、gate1 批准前的 route 升级留痕、tddLockPaths 并集均为合法写路径。该校验与 history 乐观锁同模式；损坏修复路径不经此校验（覆盖洞由 §4 resume 对账披露兜底）。

## 3. 阶段协议

### Auto-Route 接入协议（自然语言入口，opt-in）

`docs/aidlc/config.json` 的 `"autoRouting": true` 时（`/aidlc:on`｜`/aidlc:off` 切换，或对开启状态说 "aidlc on/off"），用户无需敲命令，直接用自然语言提出需求即可进入流程。**开关只控制路由注入，不影响任何守卫**——guard-gates / guard-paths / TDD 锁在开关两种状态下都强制生效。UserPromptSubmit hook（auto-route.mjs）在开启时注入路由契约；hook 只注入不分类，判定由编排者按本节执行；**显式 `/aidlc:` 命令永远优先于路由判定**。

- **A1 意图接入确认**（无活跃 intent + 开发类需求）：**先不建任何目录**。展示「识别的意图一句话 + 3~6 条粗粒度拆分预览」，AskUserQuestion 三选：**进入生命周期 / 调整拆分后再进 / 不进流程直接答复**。**（U4：A1 扩展，响应触点 12-§3.0）**同一表单加一项**路线选择（express/classic，由 AI 依需求粗细提议）**——一次确认同时覆盖"进入生命周期"与"路线"，用户未选 express 或未确认 → 缺省 classic（见下方"规模分级接入"）。人类确认进入后，把用户裁决（含路线）与（调整后的）拆分预览**逐字**记入 `decisions.md`，再按下方 Inception 协议建 intent——该记录同时是 A3 的触发凭据。用户拒绝进入 → 直接答复需求，不留任何文件。
- **A2 范围扩展确认**（有活跃 intent + 输入疑似超范围）：AskUserQuestion 三选——**扩展当前 intent**（裁决逐字进 decisions.md；construction 阶段则在 plan.md 追加 unit + 刷新受影响角色的工件 + 必要时重新置 TDD 锁）/ **搁置**（追加进 `docs/aidlc/backlog.md`：一行一条 `| 日期 | 一句话需求 | 状态 |`，不建 intent、不展开）/ **越轨直改**（不经流程直接改，但 decisions.md 追加 OOB 条目：需求原话 + 改动范围 + 测试债务说明）。**判定不了一律按超范围走确认**，不得自作主张。
- **A3 拆分确认**（仅适用于经 A1 接入的 intent，凭据 = decisions.md 的 A1 记录）：Sprint Planning 提交 `plan.md` + `units/` 后、**派发 dev 泳道之前**，渲染单元表请人类确认（批准并开始 / 调整单元 / 打回重规划），裁决逐字进 `decisions.md`，末行回执 `PLAN-CONFIRMED <日期>`。**手动 `/aidlc:construct` 不加此步**（敲命令即视为已确认要拆分）。
- **门禁永不自动**：gate1/gate2 的人类审批在任何模式下都不可跳过、不可代答。

#### 规模分级接入（F1：classic / express 两档；适用于 A1 与手动 `/aidlc:inception` 入口）（U4：响应触点 12-§3.0）

- **两档语义**：`classic` = 全量流程（三工件、三方互审、architecture.md、retro 硬性要求）。`express` = 裁剪流程——Inception 不派发 architect、不产 architecture.md（语义对齐约定并入 prd.md 内联小节；本文件与各命令中"三工件/三角色"的表述在 express 下收窄为两工件/两角色）、party-review 的 gate1 评审集合压缩为 prd+test-strategy 两件、Operations 的 retro.md 人类可选。**两条路线完全一致、一项不裁**：gate1/gate2 人类审批回执、decisions.md 逐字留痕、TDD 锁、guard-gates/guard-paths 全部 hook、F2 测试基线、F4 校验。
- **提议 + 一次确认**：AI 按需求粗细**提议路线**，与"进入生命周期"合并在**同一次 AskUserQuestion**（A1 表单加路线项；手动 `/aidlc:inception` 同此，**不新增独立提问步骤**）。用户未选 express 或未确认 → **缺省 classic**。裁决（含路线）逐字记入 `decisions.md` 后才建 intent，`route` 随骨架写入 `state.json`。
- **变更语义**：写入后仅允许 **express→classic 单向升级**（gate1 批准前、人类裁决逐字留痕 decisions.md）；禁止 classic→express 降级——降级是对已承诺工件与评审的追溯性豁免，破坏审计链。
- **存量 intent 零变化**：`route` 字段缺失或非法 → 一律按 classic 走全量协议，所有协议文本路径与既有版本等价；`testBaseline` 缺失同理（见 §2 与 Construction 第 0 步的降级语义）。
- **回显注记（U4：响应触点 5）**：`route` 的回显由 hook 只读注入（auto-route 摘要行与 session-context Gates 行同构），不是编排者的判定职责——字段缺失时不追加任何 route 字样（存量输出不变），非法值显示 `route=<原值>(invalid→classic)`。

### Inception（`/aidlc:inception <意图>`）

1. **建 intent**：slug 用 kebab-case；**由编排者先** `mkdir -p docs/aidlc/<slug>/`、从 §7 模板写 `intent.md`、`state.json`（phase=inception，含 §3.0 确认的 `route`——U4：呼应触点 8/12）与 `decisions.md` 空骨架并提交——目录和骨架就绪后才扇出角色（角色只写自己的工件文件）。同时确保 `.gitignore` 含 `docs/aidlc/*/audit.log`（Stop hook 的逐轮审计是本地过程文件，不入工件链，避免每次 status/resume 对账都报未跟踪噪音）。
2. **澄清**：意图有歧义先向用户提最多 3 个关键问题；用户的裁决逐字记入 `decisions.md`。
3. **并行产出**（Agent 工具并行扇出，按 §7 调度契约）：
   - `pm` → `prd.md`　`architect` → `architecture.md`　`qa` → `test-strategy.md`
   - 三角色同期只读 `intent.md`，**禁止互读在制工件**（防读到半成品）。
   - **（U4：route 分支，见 §3.0）**`route=express` 时不派发 architect、不产 architecture.md（语义对齐并入 prd.md 内联小节）。
4. **对齐拍（并行产出后必做）**：三工件齐后，编排者比对——qa 引用的 AC 编号 ↔ prd 实际编号；architect 语义对齐表 ↔ prd 动词。发现错位/虚构编号，派回对应角色**只做引用回填**，回填完成才算齐。**（U4：机械校验语义）**guard-gates 在 phase→gate1 转移时机械执行本节编号集合比对（缺口/幻影 → deny）——对齐拍的人工复核是语义层，机制层是编号集合。
5. 工件齐且对齐（工件齐判据按 route：classic 三件 / express 两件——U4：呼应触点 1）→ 逐工件提交 → phase 置 `gate1` → 提示用户 `/aidlc:gate`。

### Gate#1（设计门，`/aidlc:gate`）

1. 调 `party-review` skill：角色交叉评审当前 route 的工件集合（classic 三件 / express 两件——U4：呼应触点 2）→ `reviews/gate1-ai.md`（硬性不一致清单，必查：三方语义不一致、AC 不可测、**编号对不上**、数据模型缺字段、安全缺失）。
2. 汇总呈给用户，AskUserQuestion 审批（通过 / 打回+反馈）。
3. **批准**（顺序被 hook 强制）：先逐字写 `decisions.md`（**用 Write 追加**：读全文→写"全文+追加"，Edit 会被 deny）+ 末行回执 `GATE-APPROVED gate1 <日期>` → 再更新 `state.json`（gate1=approved，phase=construction）。
4. **打回**：反馈逐字进 `decisions.md`（Write 追加）+ 末行标记 `GATE-REJECTED gate1 <日期>`（hook 依赖：此后旧回执作废，复审须新回执）；gate1=rejected、phase 回 inception；**只重跑被点名的反应角色**做修订；复审时 party-review 重点核对上轮 BLOCKER 是否消解；修订满 3 轮仍未过 → 升级给用户：继续修订或 `/aidlc:archive` 终止该 intent。

### Construction（`/aidlc:construct`，前置 gate1=approved）

1. **Sprint Planning**：拆 units → `plan.md` + `units/<n>.md`（提交）。
   - **影响面扫描（F3）（U4：响应触点 12）**：逐 unit 用 Grep/Glob 扫描引用方（imports/consumers），结果写 plan.md Units 表"影响面"列——取值 `low | med | high（引用方 N） | unknown`；`unknown` = 扫描工具不可用或引用关系无法解析，计入 plan"缺口与开放问题"，**不得静默省略或猜测填 low**；`high` 的 unit 必须在"执行顺序"中说明拆分或排序理由。**整体降级（AC3.4，v1.2 补）**：扫描因环境原因整体不可用（工具缺失/异常）→ 降级为现状行为（Units 表无影响面列），并在 plan.md 注明降级事实——**不得因影响面缺失阻断 Sprint Planning 起步**。
   - **声明验证命令（F2 规范来源）**：在 plan.md"验证命令"段声明基线/回归共用的命令原文；plan 未声明（含存量 intent）→ AskUserQuestion 向人类询问，裁决逐字进 `decisions.md` 后回填 plan.md。
   - **第 0 步·记录基线（F2）（U4：响应触点 12）**：**时序硬约束——先于任何本 intent 测试文件写入（含 dev 的失败测试）**。运行声明的验证命令 → 解析统计（`/^ok\b/` 计 pass、`/^FAIL\b/` 计 fail、尾行 `ALL <n>` 与 pass+fail 交叉核对；多套件逐套件解析后求和；交叉核对不一致或尾行缺失 = 解析失败 → `unavailable: true`、计数与 coverage 置 null、`suites` 保留原清单并告警，**不得虚构 0 fail**）→ 写 `state.testBaseline`（`command` 记实际执行原文，`suites` 记参与统计的套件清单）。基线不可得是否阻断后续流程归人类裁决（AskUserQuestion），编排者不得自行跳过或自行阻断。
2. **TDD 锁**：dev 写失败测试并提交后，运行 `/aidlc:lock-tests` 置位（此后 guard-gates **deny** 锁定范围内测试文件的改动；契约有错走 `/aidlc:unlock-tests <理由>`）。锁定范围 = 失败测试提交涉及的测试文件路径，记入 `state.json.tddLockPaths`。
3. **并行实现**（每 unit 一条泳道）：`dev`（TDD 实现）｜`architect`（IaC）｜`tea`（E2E/性能）。**每完成一个 unit：更新 `state.json.unitStatus[<unit>]="done"` 并提交**（断点粒度=unit；中断后 resume 只续 pending units）。
4. 全 unit 完成 → **验证前回归对比（F2）（U4：响应触点 12）**：重跑同一命令与 `testBaseline` 比对——**基线中 pass 的用例新失败 = 回归 = BLOCKER**（修复，或人类在 decisions.md 逐字豁免）；比对范围限 `suites` 清单内、且排除 `tddLockPaths` 中本 intent 新增测试；`failingTests` 名单比对优先，计数兜底（走计数口径须在 gate2 人审呈示披露行）。`testBaseline` 缺失（存量 intent）→ 退化为现状（"验证命令通过"即满足）。通过后逐工件提交 → phase 置 `gate2` → 提示 `/aidlc:gate`。

### Gate#2（交付门）

1. `party-review` + **`verifier`（新鲜上下文终检）**。verifier **只报告不写文件**，由编排者把其回报写入 `reviews/gate2-ai.md`。
2. 审批与回执流程同 Gate#1（回执 `GATE-APPROVED gate2`）；打回 phase 回 construction。
3. 通过 → phase=operations。

### Operations（`/aidlc:ops`，前置 gate2=approved）

1. 产出监控/告警/部署流水线建议，落 `ops-runbook.md`；SLA/阈值/部署窗口用 AskUserQuestion 向人类收集，裁决逐字进 `decisions.md`。
2. **回流**：生产事件/学习只写**新 intent 的 intent.md**（当前 intent 的学习全部进 `retro.md`，不改已完结 intent 的原始工件；express 路线下 retro 人类可选——见第 3 条）。
3. 完结判据：`retro.md` 落盘 + 人类确认 → phase=`done`（此后不再是活跃 intent）。**（U4：响应触点 9，按 route 分支）**classic 路线（route 缺失/非法=classic）保持上述硬性要求；`route=express` 时 `retro.md` 为**人类可选**——裁决形态随人类选定（gate2 批准时一并裁决 retro 保留或省略，或一律省略），选择逐字留痕 `decisions.md`；其余完结条件（人类确认、phase 置 done）不变。

## 4. 状态查询与续跑

- `/aidlc:status`：读活跃 intent，报告阶段/门控/工件清单（含 git 提交状态）/下一步。**（U4：响应触点 4/7）**工件期望清单按 route——express intent **不得**把 architecture.md 报为缺失/异常（classic 三件/express 两件）；增显一行 `route=<值>`（显示语义同机制回显：合法值原样 `route=classic`/`route=express`、非法值 `route=<原值>(invalid→classic)`、字段缺失不显示该行——存量输出不变）；`testBaseline` 缺失或 `unavailable: true` 时显示"无基线 / 基线不可用"，**不得呈现为"已对照"**。
- `/aidlc:resume`：**第一步是对账**——`state.json` 声称的相位 vs 磁盘工件清单 vs `git log` vs `decisions.md` 条目四方比对，输出差异表；按差异决定"补提交 / 补置位 / 推进 phase / 重跑某角色"，然后从断点继续四拍。对账规则：工件在盘但未提交 → 补提交；工件齐但 phase 未推退 → 推进；`tddLock=false` 但测试已有本 intent 提交 → 提示补 `/aidlc:lock-tests`；state 已推进但 decisions 无对应条目 → 报告人类补记；**`state.json` 损坏 → 用 Write 重写修复（hook 唯一放行的损坏态写入，含 gates approved 仍须回执），history 从修复点重新起算并在 decisions.md 留痕**。**Construction 中断的，按 `unitStatus` 恢复：done 的 unit 不重跑，只续 pending**（unitStatus 缺失时按工件+git log 推断后回填）。显式指定 slug 时若该 intent 已 `archived`/`done` → 拒绝续跑（历史 intent 只读）。**（U4：响应触点 6/7）对账增补（intent 无对应字段时跳过该项——存量 intent 零变化）**：
  - **preserveKeys deny 提示**：写 state 被键保留校验 deny → 提示重读磁盘 state、完整保留既有键（`route`/`testBaseline`/`unitStatus`/`tddLock`/`tddLockPaths`）后整体重写；损坏修复后 state 缺这些键之一而 phase 已过对应阶段 → 列差异行呈示人类。
  - **route 变更留痕核对**：`state.route` 与 `decisions.md` 路线裁决记录不一致 → 差异项（route 变更仅限 gate1 批准前、须人类裁决逐字留痕）。
  - **基线命令不一致差异项**：`testBaseline.command` 与 plan.md"验证命令"声明不一致 → 列差异项；对账时呈示 `testBaseline.recordedAt` 与对应 git 提交。
  - **"损坏修复路径 F4 未重跑"披露行**：修复后 state 声称 `phase ≥ gate1` 而 F4 未随修复重跑 → 差异表必须列出该行，并在 gate1 人审呈示。

## 5. 角色调度契约

每次 Agent 扇出的调度消息**必须**包含（缺一不可）：

1. intent 路径（`docs/aidlc/<slug>/`）
2. 要读的文件清单（绝对/相对路径写明）
3. 要写的**确切输出路径**
4. 对应的 §7 模板**全文**（角色不自行找模板）
5. 完成判据 + 回报协议：最后一行必须是
   - `<ROLE>-DONE <工件路径> <git-commit-hash>`（角色完成提交时），或
   - `<ROLE>-FAIL <原因>`

编排者**只认**这两个标记：缺 hash 视为未完成（补提交或重派）；FAIL 则报告人类。互审扇出额外注明"只读+报告，禁止 Edit/Write"。

## 6. 状态查询命令速查

`/aidlc:status`｜`/aidlc:resume`｜`/aidlc:gate [gate1|gate2]`｜`/aidlc:lock-tests`｜`/aidlc:unlock-tests <理由>`｜`/aidlc:construct`｜`/aidlc:ops`｜`/aidlc:archive <理由>`（终止 intent，见 §3 Gate#1 打回升级与 §9）｜`/aidlc:on`｜`/aidlc:off`（auto-route 开关，见 §3.0；自然语言 "aidlc on/off" 等效）

## 7. 工件模板（内联，扇出时随调度消息发给角色）

### intent.md

```markdown
# Intent: <slug>

> 创建：<日期>　状态：<inception|construction|operations|done>

## 一句话意图
<用户原话，逐字保留>

## 问题与期望
- **要解决的问题**：<…>
- **期望的结果**：<…>

## 受影响系统/用户
<…>

## 约束
<技术栈、时间、合规、既有模式等硬约束>

## 开放问题（需人类裁决）
- [ ] <…>
```

### prd.md

```markdown
# PRD: <slug>

> 产出者：pm　日期：<日期>　来源：intent.md

## 用户故事
| # | 角色 | 目标 | 价值 | 溯源（intent.md） |
|---|---|---|---|---|

## 验收标准（可测）
- **AC1**（U1）：Given … When … Then …

## 非目标（明确排除）
- …

## 开放问题（需人类裁决）
- [ ] …
```

### architecture.md

```markdown
# Architecture: <slug>

> 产出者：architect　日期：<日期>　来源：intent.md + prd.md

## 逻辑架构
<组件/边界/依赖>

## 数据模型
<实体/键/索引/约束>

## 与 PRD 的语义对齐表
| PRD 动词 | 物理语义 | 说明 |
|---|---|---|

## 关键决策与理由
| # | 决策 | 为什么 |
|---|---|---|

## 安全与权限
<鉴权、最小权限（每个授权写明 实体+资源+动作 三元组）、密钥管理>

## 开放问题（需人类裁决）
- [ ] …
```

### test-strategy.md

```markdown
# Test Strategy: <slug>

> 产出者：qa　日期：<日期>　来源：intent.md + prd.md

## 测试点清单
| # | 映射 AC | 场景（正/负路径） | 层级 | 优先级 |
|---|---|---|---|---|

## 分层策略
- **单元**：…　**集成**：…　**E2E**：核心闭环（tea 在 Construction 细化）

## 缺口与开放问题
- [ ] …
```

### plan.md

```markdown
# Plan: <slug>

> 产出者：编排者（Sprint Planning）　日期：<日期>　前置：gate1 approved

## Units
| # | Unit | 目标 | 涉及文件 | 影响面 | 测试 | 验收 |
|---|---|---|---|---|---|---|

## 验证命令（F2 规范来源）
- 命令：<基线/回归共用原文；未声明（含存量 intent）→ AskUserQuestion 向人类询问后回填>

## 执行顺序与并行泳道
- 泳道 A（dev）：…　泳道 B（architect）：…　泳道 C（tea）：…

## TDD 锁记录
- 失败测试提交：<commit hash>　置位：<日期>
```

（U4：响应触点 12-§7）"影响面"列取值 `low | med | high（引用方 N） | unknown`：low=无外部引用方/单一消费方；med=少量同层消费方；high=跨层/共享类型/引用方众多（high 的 unit 必须在"执行顺序"中说明拆分或排序理由）；`unknown`=扫描工具不可用或引用关系无法解析——计入"缺口与开放问题"，**不得静默省略或猜测填 low**。分级阈值为默认方案，待 PRD OQ3 裁决后回填。"验证命令"段是 `state.testBaseline.command` 的规范来源（声明/回填流程见 §3 Construction），两者不一致 = resume 对账差异项。

### retro.md

> （U4：响应触点 10）按 route 分支：classic 硬性要求（完结判据之一，见 §3 Operations）；`route=express`（缺失/非法=classic）时人类可选——gate2 批准时一并裁决保留或省略。

```markdown
# Retro: <slug>

> 复盘日期：<日期>　参与：人类 + 各角色

## 什么有效
## 什么没用
## 学到的东西（沉淀进 AGENTS.md / 角色约束）
## 下个 bolt 要改的
```

## 8. 配额降级协议（角色代理不可用时）

**触发**：Agent 派发失败（配额上限/网络/模型错误）。**降级不等于放弃纪律**，按序执行：

1. **先查工作区再重派/代跑**：代理失败 ≠ 零产出（实战教训：architect 熔断前已完成全部文档同步）。检查目标工件的磁盘状态与 `git status`，确认实际产出量。
2. **重派一次**（瞬时故障）；再失败才进入内联代跑。
3. **内联代跑规则**：编排者代行该角色职责，但——
   - 角色约束照常遵守（TDD 铁律、只读互审、约束前置）；
   - TDD 锁期间如需改测试文件，照常走解锁→decisions.md 留痕→修复流程；
   - **decisions.md 记录降级事件**：失败原因、代行的单元清单、时间；
   - 该单元的产出在 Gate 人审时**列为追认项**。
4. **恢复后补强**：配额/代理恢复后，关键门（Gate#2）应派**独立 verifier** 复核一轮（新鲜上下文第二双眼睛——实战实证其能抓到编排者自审盲区）。
5. **诚实声明**：降级期间产出的评审结论必须标注"内联代行，缺独立复核"。

## 9. 终止协议（`/aidlc:archive <理由>`）

放弃/终止一个 intent（打回 3 轮不收敛、需求取消、方向推翻）。**终止也是人类裁决，必须留痕**：

1. 理由取 `$ARGUMENTS`；缺失则 AskUserQuestion 向人类询问，不得自行编造。
2. 理由**逐字**追加进 `decisions.md`（Write 追加）+ 末行标记 `ARCHIVED <日期>`。
3. 更新 `state.json`：`phase = "archived"`，history 追加一条（why 引用 decisions.md 终止裁决）。
4. 效果：该 intent 退出活跃位（session-context 不再注入、resume 不再选中）；工件链与 decisions.md 原样保留作审计——**不删除任何历史**。
5. 区别于 `done`：done = 交付完结的正常终态；archived = 中途终止。两者都不再活跃。

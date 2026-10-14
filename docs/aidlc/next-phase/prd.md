# PRD: next-phase

> 产出者：pm　日期：2026-10-14　来源：intent.md
> R1 修订（2026-10-14）：响应 reviews/gate1-ai.md 打回意见 B2 / M1 / M3 / M7 及 MINOR m2 / m3 / m5 / m6；依据 decisions.md 2026-10-14 Gate#1 审批的修订指令。修订处以"（R1 修订：响应 Xx）"行内标注。既有 AC 中 AC1.2 / AC2.3 / AC4.4 含 R1 行内修订，其余既有 AC 编号与语义未动（qa 映射引用依赖）；新增 AC1.6 / AC1.7 / AC2.5 / AC5.1。（R2 修订：响应 NM-4——修订记录补列 AC1.7，"编号语义不变"声明收口为准确表述。）
> R2 修订（2026-10-14）：响应 reviews/gate1-ai-r2.md 点名意见 N2 / NM-4 / NM-7 / N14 / m-N1 / m-N2（编排者裁决指令逐条执行的极小修订轮）；修订处以"（R2 修订：响应 Xx）"行内标注。
> R3 修订（2026-10-14）：响应 reviews/gate1-ai-r3.md 点名意见 m2 / m-D（清扫轮两处点对点：AC1.7 负分支指引去 T07 具体指向、AC4.1 Given 收口"工件齐（classic 路线三件、express 路线两件）"并在 OQ1 登记追认）；修订处以"（R3 修订：响应 Xx）"行内标注。（U1 补记：响应 m-R4-5——本行为此前缺失的 R3 头部记录。）

## 用户故事
| # | 角色 | 目标 | 价值 | 溯源（intent.md） |
|---|---|---|---|---|
| U1 | 编排者 | 在 intent 接入时按规模分级（express / classic 两档），AI 提议路线并经 AskUserQuestion 由人类一次确认（与 A1 拆分确认合并为一步），选定路线记入 `state.json` | 轻量需求不再被强制走完整 Inception；路由留痕可审计、可续跑恢复 | research-digest.md D12 |
| U2 | 编排者 | Construction 第 0 步记录现有测试基线（总数 / pass / fail），后续验证时以"新失败 = 回归"判定，区分"本来就挂" | brownfield 场景验证结论可信，不再把存量失败误判为交付失败 | research-digest.md B6 |
| U3 | 编排者 | Sprint Planning 时扫描受影响文件与引用方（imports / consumers），unit 模板新增"影响面"列并按 low / med / high 分级 | 拆 unit 时提前暴露共享文件冲突与高风险改动，人类确认拆分前可见 | research-digest.md B7 |
| U4 | 编排者 | 对齐拍机械校验"AC 编号集合 ⊆ 测试点映射集合"，缺口列为 BLOCKER 并拦截进入 Gate#1 | AC 可追溯性从"列了映射列"升级为"强制无缺口"，防止不可测需求流入 Construction | research-digest.md A3 |
| U5 | 插件使用者（开发者） | 升级插件后，未启用新功能的存量 intent（v1.0 / v1.1 的 `state.json` 无新字段）可零行为续跑 | 存量用户零行为变化（intent.md「约束」） | intent.md「约束」 |
| U6 | 插件使用者（文档读者） | 升级后 README.md 与 GitHub Pages（docs/index.html）反映 F1–F4 新机制 | 文档与行为一致，新能力可被发现、不误导用户（R1 修订：新增故事，响应 m6；溯源 intent.md「受影响系统/用户」列明的文档面） | intent.md「受影响系统/用户」 |

## 验收标准（可测）

### F1 规模分级路由（AC1.x）
- **AC1.1**（U1）：Given `docs/aidlc/config.json` 的 `autoRouting=true` 且用户以自然语言提出一个粗粒度判定为轻量的开发需求，When 编排者执行 A1 接入确认，Then 编排者展示「识别意图一句话 + 3~6 条拆分预览 + 提议路线（express 或 classic）」并通过一次 AskUserQuestion 让人类同时确认"进入生命周期"与"路线选择"，确认裁决逐字记入 `decisions.md` 后才建 intent；`state.json` 含所选路线字段且与裁决逐字一致。
- **AC1.2**（U1）：Given 经 A1 确认进入且路线为 express 的 intent，When 编排者执行 Inception 及后续阶段，Then 工件集合与门控范围按 express 裁剪清单执行——提议默认要点引自 architecture.md 关键决策 #3（逐字以该决策为准）：① 不产 architecture.md（语义对齐约定并入 prd.md 内联小节）；② party-review 交叉评审压缩为单轮合并评审（或人类直审两工件）；③ plan.md 允许单 unit；④ Operations 的 retro.md 改为人类可选。**机制强制项零裁剪**：gate1/gate2 人类审批回执、decisions.md 逐字留痕、TDD 锁、guard-gates/guard-paths 全部 hook、F2 测试基线、F4 覆盖校验全部保留。（R1 修订：响应 M1——原 Then"具体裁剪清单以对齐拍协议为准"不可判定，现将决策 #3 清单要点并入正文使 AC 可判定；清单本身的追认为 OQ1。同时响应 M7 的"裁剪范围限 Inception 与架构含 Construction/Operations 项"矛盾：本 AC 覆盖 Inception 及后续阶段。）
- **AC1.3**（U1，负路径）：Given 同一个接入场景，When 人类在 AskUserQuestion 中拒绝 AI 提议的路线并选择另一档（或选择不进流程），Then 编排者按人类选择执行；选择不进流程时不建任何文件、直接答复需求。
- **AC1.4**（U5，负路径）：Given 一个 v1.0 / v1.1 创建、`state.json` 不含路线字段的存量 intent，When 编排者对其执行 `/aidlc:status` 或 `/aidlc:resume`，Then 流程按既有语义续跑，不强制补写路线字段、不中断、不弹新确认；route 缺省视为 classic 等价的完整流程（具体缺省语义待开放问题 OQ1 裁决）。
- **AC1.5**（U5，负路径）：Given `autoRouting` 为 false 或 `config.json` 缺失 / 畸形，When 用户提自然语言需求，Then 不注入路由、不弹路线确认，与现状行为完全一致。
- **AC1.6**（U5，负路径）：Given 一个 intent 的 `state.json` 中 `route` 字段存在但取值在合法枚举 {classic, express} 之外（如 "bugfix" 或类型错误），When 编排者读取该字段决定流程形态、或 auto-route.mjs 摘要行回显 route，Then 一律按缺失处理：流程视为 `classic` 全量执行，不中断、不弹新确认；回显采用架构决策 #12 的原值透传方案：`route=<原值>(invalid→classic)`（保留脏数据可观测性，直接改写显示值会掩盖非法输入）；生效语义仍为按 classic 兜底。（R1 修订：新增 AC，响应 m2——route 非法值兜底此前在 PRD 无 AC 背书；语义来源 architecture.md 数据模型"`route`：缺失/非法值一律视为 `classic`"。（R2 修订：响应 N2——回显语义统一到 architecture.md 决策 #12 的原值透传方案，消除与架构的互斥表述及 T06 断言二义；生效兜底语义不变。））
- **AC1.7**（U1，负路径）：Given 一个 route=express 且 gate1 尚未批准的 intent，When 人类裁决升级路线为 classic，Then 编排者更新 state.json 的 route 字段（Write 整体覆写、history 追加留痕），裁决逐字记入 decisions.md；classic→express 的降级方向被拒绝；gate1 批准后 route 不再变更（其负向分支——降级方向被拒绝、批准后不可变更——由流程评审兜底验证（负分支场景：降级方向被拒绝、gate1 批准后 route 冻结））。（R1 修订：响应 M2/M7——语义来源 architecture.md 决策 #9，供 T07 映射）（R2 修订：响应 NM-7 / N14——行内补负分支验证指引，不新增 AC。）（R3 修订：响应 m2）

### F2 测试基线（AC2.x）
- **AC2.1**（U2）：Given gate1=approved 的 intent 进入 Construction，When 编排者执行 Sprint Planning（第 0 步），Then 在派发任何 dev 泳道之前运行既有测试命令并记录基线（总数 / pass / fail，含命令与输出摘要），基线落盘为工件并提交。
- **AC2.2**（U2）：Given 已记录测试基线的 intent，When Construction 完成时编排者运行同一测试命令验证，Then 判定规则为：基线中已存在的失败不计为交付失败（标记为"存量失败"），基线之外新出现的失败判定为回归 BLOCKER，须修复或经人类书面豁免后方可进入 gate2。
- **AC2.3**（U2，负路径）：Given 某 intent 因故未在 Construction 第 0 步记录基线（如中断恢复），When 后续需要验证结论，Then 编排者不得虚构基线；该次验证结论**显式标注"无基线对照"**（标注须出现在验证输出与交付结论中，构成告警），不得表述为"已通过回归对照"；是否允许继续进入 gate2 按 OQ2 裁决执行（提议默认：允许，且豁免事实逐字记入 `decisions.md`）。（R1 修订：响应 M1——将 OQ2 建议方向"不虚构、显式标注无基线对照、告警"并入 Then 使 AC 可判定；OQ2 仅保留"阻断 vs 豁免继续"及豁免留痕格式的裁决。）
- **AC2.4**（U5，负路径）：Given 一个存量 intent（无基线工件），When 执行 `/aidlc:resume` 续跑，Then 续跑行为与现状一致，不要求回填基线。
- **AC2.5**（U2）：Given gate1=approved 的 intent 进入 Construction 第 0 步，When 编排者确定基线所用的"既有测试命令"，Then 命令取值的规范来源为：该 intent 的 plan.md 中声明的验证命令为唯一依据；plan.md 未声明时，编排者必须在记录基线前通过 AskUserQuestion 向人类询问，不得自行假定或静默选用；问得的命令与答复记入 `decisions.md` 并落盘为 `testBaseline.command`，后续对比（AC2.2）必须使用同一命令原文。（R1 修订：新增 AC，响应 m5——"既有测试命令"此前无规范来源落点。）

### F3 影响面分析（AC3.x）
- **AC3.1**（U3）：Given gate1=approved 的 intent 进入 Sprint Planning，When 编排者为每个 unit 确定涉及文件时，Then 对每个涉及文件扫描其 imports / 被引用方（consumers，含测试引用），受影响方清单与 low / med / high 分级写入该 unit 的"影响面"列。
- **AC3.2**（U3）：Given 某 unit 的影响面含 high 分级项，When 渲染单元表供人类确认时，Then high 项在表格中显式标出，供 A3 拆分确认时人类决策（拆分顺序 / 串行化 / 范围调整）。
- **AC3.3**（U3）：Given 扫描工具不可用或某文件无法解析引用关系，When 执行影响面分析，Then 该文件影响面标为 `unknown` 并计入交付物的"缺口与开放问题"，不得静默省略或猜测填 low。
- **AC3.4**（U5，负路径）：Given 影响面分析因环境原因整体不可用，When 执行 Sprint Planning，Then 流程降级为现状行为（无影响面列），在 plan.md 注明降级事实；不得因影响面缺失而阻断 Construction 起步。

### F4 AC↔测试点覆盖校验（AC4.x）
- **AC4.1**（U4）：Given Inception 工件齐（classic 路线三件、express 路线两件）且进入对齐拍，When 编排者比对 prd.md 的 AC 编号集合与 test-strategy.md 的"映射 AC"列，Then 校验为机械集合运算：每个 AC 编号至少被一条测试点映射；全部覆盖则对齐拍通过。（R3 修订：响应 m-D）
- **AC4.2**（U4）：Given 存在至少一个 AC 编号没有任何测试点映射，When 执行对齐拍校验，Then 该缺口列为 BLOCKER，不推进 phase 到 gate1；编排者将缺口清单逐字记入 `decisions.md` 并派回 qa 做引用回填（只补映射，不改 AC 语义），回填完成重跑校验直至无缺口。
- **AC4.3**（U4，负路径）：Given test-strategy.md 的"映射 AC"列引用了 prd.md 中不存在的 AC 编号，When 执行对齐拍校验，Then 该幻影编号同样列为 BLOCKER（方向二的引用完整性），处理方式同 AC4.2。
- **AC4.4**（U5，负路径）：Given 一个存量 intent 已处于 construction 或更后阶段（其对齐拍已按旧协议完成），When 执行 `/aidlc:resume`，Then 不强制补跑覆盖校验；该校验仅约束此后新建 / 修订的 Inception 工件。**追加场景（R1 修订：响应 m3 bounce-back 窄缝）**：Given 该存量 intent 曾在 gate1 被打回 inception（GATE-REJECTED）、且打回后插件升级（F4 校验已上线），When 编排者完成工件修订并再次推进 phase→gate1（F4 对该 intent 的首次触发），Then 校验正常触发——打回后修订的工件属"此后修订的 Inception 工件"，不得以"创建于旧版本"为由豁免；若存在缺口按 AC4.2 处理（deny、逐字记 decisions.md、派回 qa 回填）。

### F5 文档同步（AC5.x）（R1 修订：新增小节，响应 m6）
- **AC5.1**（U6）：Given F1–F4 已实现并进入交付，When 审阅 README.md 与 GitHub Pages（docs/index.html），Then 两处文档反映新机制——至少包含对四项能力（规模分级路由 / 测试基线 / 影响面分析 / AC↔测试点覆盖校验）的简要说明或明确的"新增 / 实验"标注，不存在与实现矛盾的过时描述；且本次文档改动不改变任何 hook / skill 运行时行为（U5 零行为变化仍成立）。

## 非目标（明确排除）
- **P1 项**：A4 / C10 风险分 + 三值门决策（PASS / CONCERNS / FAIL）；C9 验证回执（机器签发验证证据链）；C10 安全 / NFR 评审视角；A1 项目宪法与合规检查；C11 context 不对称规则（详见 research-digest.md 第二节）。
- **P2 项**：D13 git worktree 多 intent 并行；brownfield-scan 落地；E15 / E16 retro 量化与 AGENTS.md 提案机制；B5 unit 依赖图与波次调度；B8 per-unit 验证强化；D14 unit 间交接工件。
- **不吸收项**（research-digest.md 明确）：118 事件审计法、artifact 指纹链、human-presence guard、33-stage 引擎、BMAD TOML 四层定制。
- A2 澄清扫描（Kiro 歧义分析 / Spec Kit `/clarify` 式系统性 underspecification 扫描）：调研标为"可选"，本 intent 不纳入。
- 修改守卫 hook 的 deny-only / fail-closed 语义；为任何新机制引入**未经披露的** fail-open——**主路径不得依赖 fail-open；fail-open 分支必须在架构文档显式披露，并由人类门兜底**（intent.md「约束」原文："新 hook 不得 fail-open 静默失效"）。（R1 修订：响应 B2——原措辞"为任何新机制引入 fail-open 路径（F1–F4 均不得触碰）"与 architecture.md 决策 #5 为 F4 设计的披露式 fail-open 分支（文件缺失 / 不可解析 / 零 AC → allow 且静默通过）直接矛盾：按原 PRD 批准即禁架构行为，按架构实现即违 PRD。本条为对 B2 的**裁决建议，须人类复审追认**：红线精确化为上述三点，F4 的已披露 fail-open 分支视为该红线下的显式豁免；"未披露的静默失效"仍一律禁止，若人类裁决 F4 改 fail-closed 则架构决策 #5 相应重写。）
- 多 intent 并行支持、`/aidlc:on` / `/aidlc:off` 交互形态变更。

## 开放问题（需人类裁决）
- [ ] OQ1：路线字段缺省语义与 express 裁剪清单的追认——存量 intent 无 route 字段时缺省按 classic 处理是否可接受？（R1 修订：响应 M1——裁剪清单要点已作为提议默认并入 AC1.2 正文，来源 architecture.md 关键决策 #3，本 OQ 仅保留对该清单的人类追认，及 express 路线 Gate#1 的执行形态确认（含 verifier 派发默认值：high 必派/low-med 可省；retro.md 人类可选）。（R2 修订：响应 m-N2——architecture.md 登记的 verifier 派发默认值与 retro.md 人类可选两个子项显式纳入本 OQ 枚举。））AC4.1 的 Given 措辞收口（"三工件齐"→"工件齐"）随本 OQ 一并追认。
- [ ] OQ2：F2 测试基线缺失时的降级语义——（R1 修订：响应 M1）"不虚构基线、显式标注无基线对照、告警"已并入 AC2.3 正文作为提议默认；本 OQ 仅保留：缺失时是阻断进入 gate2，还是允许人类书面豁免继续（类似 tddLockOverride 的先例）？豁免留痕格式需定义。
- [ ] OQ3：F3 影响面分级（low / med / high）的判定规则——按受影响文件数 / 消费方数阈值，还是按人类判断 + AI 建议？architect 需依据裁决制定分级标准。
- [ ] OQ4：F4 校验的适用时机——仅 Inception 对齐拍，还是 Gate#1 复审 / scope 扩展（A2）导致 PRD 修订时也重跑？（本 PRD 默认仅 Inception 对齐拍与修订回填后重跑，扩展场景待裁决。）
- [ ] OQ5：F1 中"轻量 / 重型"的规模判定标准——由编排者按什么规则提议路线（改动文件数预估 / 需求类型关键词）？误判时人类改选是否记为流程学习数据？express 路线下 AC1.1 的"3~6 条拆分预览"是否放宽为 1~3 条（与 plan.md 允许单 unit 的张力），随本 OQ 一并裁决？（R2 修订：响应 m-N1——登记该张力；AC1.1 正文未动，拆分预览条数属语义变更，须随本 OQ 由人类裁决。）
- [ ] OQ6：F2 基线命令**执行失败**（非用例失败：命令崩溃、环境缺依赖、超时等导致基线无法取得）时的语义——阻断 Construction 派发直至环境修复，还是告警后继续并记录"基线不可得"？（R1 修订：新增，响应 M3——与 AC2.3 的"基线未记录"是两种不同缺失：AC2.3 是该记未记，本条是想记记不了。）gate1-ai.md 指出此项未决将使相关测试点断言伪化。
- [ ] OQ7：F3 影响面扫描在巨型仓库的性能预算——扫描的文件数 / 引用方规模上限与时限是多少？超限时降级策略为何（仅扫描直接引用方 / 标 `unknown` 计入缺口与开放问题）？（R1 修订：新增，响应 M3。）
- [ ] OQ8：F2 基线比对中 flaky 测试的口径——基线中已知的 flaky 用例在交付验证时偶发失败，是否计为回归 BLOCKER？需裁决处理方式（重跑 N 次 / 用例白名单 / 计数容忍）及留痕格式。（R1 修订：新增，响应 M3。）
- [ ] OQ9：**express / classic 两档的产品范围追认**——调研（research-digest.md D12）中 aidlc-workflows 的 11-profile 实践在本 intent 被裁剪为两档、弃置 Bugfix 中间档；此为编排者的 MVP 裁剪决策，此前无决策记录亦无 OQ（gate1-ai.md M7），现请求人类追认。若人类要求恢复中间档或调整命名，F1 相关 AC 与架构数据模型随之修订。（R1 修订：新增，响应 M7。）

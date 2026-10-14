# PRD: next-phase

> 产出者：pm　日期：2026-10-14　来源：intent.md

## 用户故事
| # | 角色 | 目标 | 价值 | 溯源（intent.md） |
|---|---|---|---|---|
| U1 | 编排者 | 在 intent 接入时按规模分级（express / classic 两档），AI 提议路线并经 AskUserQuestion 由人类一次确认（与 A1 拆分确认合并为一步），选定路线记入 `state.json` | 轻量需求不再被强制走完整 Inception；路由留痕可审计、可续跑恢复 | research-digest.md D12 |
| U2 | 编排者 | Construction 第 0 步记录现有测试基线（总数 / pass / fail），后续验证时以"新失败 = 回归"判定，区分"本来就挂" | brownfield 场景验证结论可信，不再把存量失败误判为交付失败 | research-digest.md B6 |
| U3 | 编排者 | Sprint Planning 时扫描受影响文件与引用方（imports / consumers），unit 模板新增"影响面"列并按 low / med / high 分级 | 拆 unit 时提前暴露共享文件冲突与高风险改动，人类确认拆分前可见 | research-digest.md B7 |
| U4 | 编排者 | 对齐拍机械校验"AC 编号集合 ⊆ 测试点映射集合"，缺口列为 BLOCKER 并拦截进入 Gate#1 | AC 可追溯性从"列了映射列"升级为"强制无缺口"，防止不可测需求流入 Construction | research-digest.md A3 |
| U5 | 插件使用者（开发者） | 升级插件后，未启用新功能的存量 intent（v1.0 / v1.1 的 `state.json` 无新字段）可零行为续跑 | 存量用户零行为变化（intent.md「约束」） | intent.md「约束」 |

## 验收标准（可测）

### F1 规模分级路由（AC1.x）
- **AC1.1**（U1）：Given `docs/aidlc/config.json` 的 `autoRouting=true` 且用户以自然语言提出一个粗粒度判定为轻量的开发需求，When 编排者执行 A1 接入确认，Then 编排者展示「识别意图一句话 + 3~6 条拆分预览 + 提议路线（express 或 classic）」并通过一次 AskUserQuestion 让人类同时确认"进入生命周期"与"路线选择"，确认裁决逐字记入 `decisions.md` 后才建 intent；`state.json` 含所选路线字段且与裁决逐字一致。
- **AC1.2**（U1）：Given 经 A1 确认进入且路线为 express 的 intent，When 编排者执行 Inception，Then 产出的 Inception 工件集合与门控范围按 express 路线定义执行，少于 classic 路线的完整三件套；具体裁剪清单以对齐拍协议（architecture.md / qa 工件）为准。
- **AC1.3**（U1，负路径）：Given 同一个接入场景，When 人类在 AskUserQuestion 中拒绝 AI 提议的路线并选择另一档（或选择不进流程），Then 编排者按人类选择执行；选择不进流程时不建任何文件、直接答复需求。
- **AC1.4**（U5，负路径）：Given 一个 v1.0 / v1.1 创建、`state.json` 不含路线字段的存量 intent，When 编排者对其执行 `/aidlc:status` 或 `/aidlc:resume`，Then 流程按既有语义续跑，不强制补写路线字段、不中断、不弹新确认；route 缺省视为 classic 等价的完整流程（具体缺省语义待开放问题 OQ1 裁决）。
- **AC1.5**（U5，负路径）：Given `autoRouting` 为 false 或 `config.json` 缺失 / 畸形，When 用户提自然语言需求，Then 不注入路由、不弹路线确认，与现状行为完全一致。

### F2 测试基线（AC2.x）
- **AC2.1**（U2）：Given gate1=approved 的 intent 进入 Construction，When 编排者执行 Sprint Planning（第 0 步），Then 在派发任何 dev 泳道之前运行既有测试命令并记录基线（总数 / pass / fail，含命令与输出摘要），基线落盘为工件并提交。
- **AC2.2**（U2）：Given 已记录测试基线的 intent，When Construction 完成时编排者运行同一测试命令验证，Then 判定规则为：基线中已存在的失败不计为交付失败（标记为"存量失败"），基线之外新出现的失败判定为回归 BLOCKER，须修复或经人类书面豁免后方可进入 gate2。
- **AC2.3**（U2，负路径）：Given 某 intent 因故未在 Construction 第 0 步记录基线（如中断恢复），When 后续需要验证结论，Then 编排者不得虚构基线；向人类报告"基线缺失"并按开放问题 OQ2 裁决的降级语义处理（显式标注该次验证无基线对照）。
- **AC2.4**（U5，负路径）：Given 一个存量 intent（无基线工件），When 执行 `/aidlc:resume` 续跑，Then 续跑行为与现状一致，不要求回填基线。

### F3 影响面分析（AC3.x）
- **AC3.1**（U3）：Given gate1=approved 的 intent 进入 Sprint Planning，When 编排者为每个 unit 确定涉及文件时，Then 对每个涉及文件扫描其 imports / 被引用方（consumers，含测试引用），受影响方清单与 low / med / high 分级写入该 unit 的"影响面"列。
- **AC3.2**（U3）：Given 某 unit 的影响面含 high 分级项，When 渲染单元表供人类确认时，Then high 项在表格中显式标出，供 A3 拆分确认时人类决策（拆分顺序 / 串行化 / 范围调整）。
- **AC3.3**（U3）：Given 扫描工具不可用或某文件无法解析引用关系，When 执行影响面分析，Then 该文件影响面标为 `unknown` 并计入交付物的"缺口与开放问题"，不得静默省略或猜测填 low。
- **AC3.4**（U5，负路径）：Given 影响面分析因环境原因整体不可用，When 执行 Sprint Planning，Then 流程降级为现状行为（无影响面列），在 plan.md 注明降级事实；不得因影响面缺失而阻断 Construction 起步。

### F4 AC↔测试点覆盖校验（AC4.x）
- **AC4.1**（U4）：Given Inception 三工件齐且进入对齐拍，When 编排者比对 prd.md 的 AC 编号集合与 test-strategy.md 的"映射 AC"列，Then 校验为机械集合运算：每个 AC 编号至少被一条测试点映射；全部覆盖则对齐拍通过。
- **AC4.2**（U4）：Given 存在至少一个 AC 编号没有任何测试点映射，When 执行对齐拍校验，Then 该缺口列为 BLOCKER，不推进 phase 到 gate1；编排者将缺口清单逐字记入 `decisions.md` 并派回 qa 做引用回填（只补映射，不改 AC 语义），回填完成重跑校验直至无缺口。
- **AC4.3**（U4，负路径）：Given test-strategy.md 的"映射 AC"列引用了 prd.md 中不存在的 AC 编号，When 执行对齐拍校验，Then 该幻影编号同样列为 BLOCKER（方向二的引用完整性），处理方式同 AC4.2。
- **AC4.4**（U5，负路径）：Given 一个存量 intent 已处于 construction 或更后阶段（其对齐拍已按旧协议完成），When 执行 `/aidlc:resume`，Then 不强制补跑覆盖校验；该校验仅约束此后新建 / 修订的 Inception 工件。

## 非目标（明确排除）
- **P1 项**：A4 / C10 风险分 + 三值门决策（PASS / CONCERNS / FAIL）；C9 验证回执（机器签发验证证据链）；C10 安全 / NFR 评审视角；A1 项目宪法与合规检查；C11 context 不对称规则（详见 research-digest.md 第二节）。
- **P2 项**：D13 git worktree 多 intent 并行；brownfield-scan 落地；E15 / E16 retro 量化与 AGENTS.md 提案机制；B5 unit 依赖图与波次调度；B8 per-unit 验证强化；D14 unit 间交接工件。
- **不吸收项**（research-digest.md 明确）：118 事件审计法、artifact 指纹链、human-presence guard、33-stage 引擎、BMAD TOML 四层定制。
- A2 澄清扫描（Kiro 歧义分析 / Spec Kit `/clarify` 式系统性 underspecification 扫描）：调研标为"可选"，本 intent 不纳入。
- 修改守卫 hook 的 deny-only / fail-closed 语义；为任何新机制引入 fail-open 路径（intent.md「约束」红线，F1–F4 均不得触碰）。
- 多 intent 并行支持、`/aidlc:on` / `/aidlc:off` 交互形态变更。

## 开放问题（需人类裁决）
- [ ] OQ1：路线字段缺省语义与 express 路线的确切裁剪清单——存量 intent 无 route 字段时缺省按 classic 处理是否可接受？express 路线下 Inception 保留哪些工件、Gate#1 以何种形态执行（合并评审 / 精简评审），需人类拍板。
- [ ] OQ2：F2 测试基线缺失时的降级语义——是阻断进入 gate2，还是允许人类书面豁免继续（类似 tddLockOverride 的先例）？豁免留痕格式需定义。
- [ ] OQ3：F3 影响面分级（low / med / high）的判定规则——按受影响文件数 / 消费方数阈值，还是按人类判断 + AI 建议？architect 需依据裁决制定分级标准。
- [ ] OQ4：F4 校验的适用时机——仅 Inception 对齐拍，还是 Gate#1 复审 / scope 扩展（A2）导致 PRD 修订时也重跑？（本 PRD 默认仅 Inception 对齐拍与修订回填后重跑，扩展场景待裁决。）
- [ ] OQ5：F1 中"轻量 / 重型"的规模判定标准——由编排者按什么规则提议路线（改动文件数预估 / 需求类型关键词）？误判时人类改选是否记为流程学习数据？

# Research Digest: AI 开发流程调研（2026-10-14）

> 用途：本 intent 的输入工件。角色扇出时只读本件 + intent.md，**不互读在制工件**。
> 调研方法：Kiro 官方文档与 Anthropic 官方工程文章在线核验；aidlc-workflows v2.11 与 BMAD v6.12+TEA 经实抓 GitHub/官方文档核验；Spec Kit 部分机制来自官方博客 + 既有知识（GitHub 直连受限，细节置信度略低）。文档中已记录的已知项（brownfield-scan 未实现、多 intent 并行不支持、33-stage 排除）不计入。

## 一、五层盲区清单（插件现状 → 缺口 → 外部实践）

### A 需求与规格层
- **A1 无项目宪法**：AC 可测，但"工件必须遵守的项目级不变量"无落脚点。实践：Spec Kit `constitution.md`（所有下游工件的合规来源）；aidlc-workflows 的 ruleset。
- **A2 澄清是提问不是扫描**：现 ≤3 问。实践：Kiro 在 design 前做歧义/冲突/缺口分析；Spec Kit `/clarify` 对规格做系统性 underspecification 扫描。
- **A3 AC→测试点可追溯无强制校验**：test-strategy 有"映射 AC"列，但没人查"某 AC 一条测试点都没有"。实践：BMAD TEA 可追溯矩阵（需求↔测试映射 + 缺口优先级），矩阵**派生**门决策。
- **A4 风险无量化、门决策二值**：实践：TEA 风险分 = 概率(1-3)×影响(1-3)；9=Critical 直接 FAIL（有缓解也不解禁）；6-8=High 须书面缓解（负责人+日期）；门决策三值 PASS/CONCERNS/FAIL。

### B 计划与实现层
- **B5 单元拆分无依赖图**：并行泳道有共享文件冲突风险。实践：Kiro tasks 依赖图→波次（波内并发、波间串行）；Spec Kit `[P]` 并行标记。
- **B6 无测试基线**：brownfield 下"验证命令通过"分不清"本来就挂"与"新挂的回归"。实践：aidlc-workflows Test Baseline Protocol——改前记录测试总数/pass/fail/coverage，之后新失败=回归。
- **B7 无影响面分析**：拆 unit 不扫 imports/消费方/测试引用。实践：aidlc-workflows Blast Radius Analysis（受影响文件+引用方+low/med/high 分级），改前强制。
- **B8 完成声明无防伪**：模型会在"单测过了/curl 过了"后提前宣布完成。实践（Anthropic）：穷尽式 JSON 特性清单 + 只能翻转 passes 字段 + E2E 真实路径验证 + 每会话固定定向程序（pwd→读进度→读清单→git log→冒烟→动手）。

### C 评审与门控层
- **C9 门批准≠已验证**：验证命令通过是编排者自述，无机器验证证据链。实践：aidlc-workflows `CHECKPOINT_VERIFICATION_RECORDED` 由工具签发、手写无效；批准与验证分离。
- **C10 评审视角缺安全/NFR**：四个 reviewer 无安全（OWASP/注入/鉴权）、无 NFR 域（性能/可用性）。实践：aidlc-workflows NFR 独立 stage；BMAD NFR 按域 PASS/CONCERNS/FAIL/N/A，证据缺失默认 CONCERNS。
- **C11 无 context 不对称规则**：brownfield 下"context 说了没问题"可能被当豁免。实践（BMAD 明文）：context 只能加发现，不能减发现。

### D 流程编排层
- **D12 全生命周期一刀切（最大日常摩擦）**：改个 bug 也走完整 inception。实践：aidlc-workflows 11 个 profile（Express 10/33、Bugfix 8-10/33、Feature 全量），AI 提议+用户确认；BMAD 规模决策树（单会话→build；epic→spec→ticket→build）。
- **D13 多 intent 并行无路径**：实践：git worktree per intent（Anthropic `/batch` 即 5-30 worktree 扇出）；findActiveIntent 按 branch 匹配可解锁。
- **D14 unit 间无交接工件**：每会话有定向注入，但 dev 泳道完成 unit 后无留给下一 unit 的交接（坑、偏离计划的决定）。

### E 度量与自我改进层
- **E15 有数据无度量**：decisions.md 可算打回轮数/门通过率/修订耗时，audit.log 无人消费，retro 纯定性。
- **E16 自我改进闭环是愿望**：retro "沉淀进 AGENTS.md" 无机制。实践：retro 产出 AGENTS.md 修改提案（可审阅 diff）。

## 二、吸收优先级（编排者建议，待 pm/architect/qa 细化）

- **P0（高频痛点、协议层可落地）**：D12 规模分级路由 ｜ B6 测试基线 ｜ B7 影响面 ｜ A3 AC↔测试点覆盖校验 ｜（可选）A2 澄清扫描。
- **P1（门控升级）**：A4/C10 风险分 + 三值门决策 ｜ C9 验证回执 ｜ C10 安全/NFR 评审视角 ｜ A1 宪法合规检查 ｜ C11 不对称规则。
- **P2（架构演进）**：D13 worktree 多 intent ｜ brownfield-scan 落地 ｜ E15/E16 retro 量化+提案 ｜ B5 依赖图波次 ｜ B8 per-unit 验证强化 ｜ D14 交接工件。
- **不吸收**：118 事件审计法、artifact 指纹链、human-presence guard、33-stage 引擎、BMAD TOML 四层定制。

## 三、已核验来源

- Kiro specs/steering 文档（kiro.dev/docs）
- awslabs/aidlc-workflows v2.11：docs/guide/04-phases-and-stages.md、workflow-profiles、05-scopes-and-depth、brownfield.md、audit-format.md
- BMAD v6.12：docs.bmad-method.org（existing-codebases、party-mode、customize、planning-path）；TEA 模块（risk-based-testing、run-trace）
- Anthropic：engineering/effective-harnesses-for-long-running-agents、code.claude.com/docs/en/best-practices
- Spec Kit：github.blog 官方介绍（specify/plan/tasks + 阶段检查点）；constitution/clarify/analyze/checklist 细节为既有知识（未在线复核）

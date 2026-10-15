# Decisions: next-phase

> 人类决策台账（只追加）。回执格式：`GATE-APPROVED <gate> <日期>`（这是说明文字，不是回执）。

## 2026-10-14 澄清拍记录

编排者就三个关键歧义发起表单提问（范围 / 兼容性 / 分级交互），**用户未作答**（系统返回未提供答案）。按"缺信息先提问、不猜人类裁决"原则，以下仅为**编排者建议默认值，非人类裁决**，列入 Gate#1 追认项：

1. **范围**：P0 规划质量包 = D12 规模分级路由（轻量 profile）+ B6 测试基线 + B7 影响面分析 + A3 AC↔测试点覆盖校验（编号见 research-digest.md）
2. **兼容性**：完全兼容存量 intent——v1.0/v1.1 创建的 intent 无新字段也能正常续跑，新机制对存量 opt-in 或自动降级
3. **分级交互**：AI 提议 + 人确认——接入时 AI 按输入判定规模并提议路线，AskUserQuestion 确认后生效，与 auto-route A1 确认合并为一步

若 Gate#1 人审裁决不同，按打回流程修订，以上默认值作废。

## 2026-10-14 Gate#1 审批

人类裁决（AskUserQuestion 选项原文）：**"打回修订（推荐）"**。

依据：reviews/gate1-ai.md（2026-10-14）互审结论 **3 BLOCKER / 7 MAJOR / 18 MINOR**：
- **B1** F4 提取规则 `/\bAC\d+\b/g` 折叠子编号（"AC1.1"→"AC1"）致校验恒通过、名存实亡（qa+architect 独立实测复现×2）
- **B2** PRD 非目标"为任何新机制引入 fail-open 路径（F1–F4 均不得触碰）"与架构 F4 决策 #5 的披露式 fail-open 分支直接矛盾
- **B3** F2/F3 的 P0"单元"测试点伪化——架构落层为纯 prompt 层无被测单元，测试策略却按 .mjs 单元层断言
其余 MAJOR/MINOR 全文见 reviews/gate1-ai.md（M1-M7、m1-m18）。

修订指令（只重跑被点名角色，其余工件不动）：
- **pm**：B2 的 PRD 措辞修订（建议方向：红线精确化为"未经披露的 fail-open / 主路径不得 fail-open"，与 intent.md 原文"新 hook 不得 fail-open 静默失效"对齐，把 F4 已披露分支显式豁免——此建议须复审追认）；M1 使 AC1.2/AC2.3 可测化（裁剪清单与降级语义的编排者默认方案并入 AC 正文，OQ 保留人类追认）；M3 补 OQ（基线命令失败语义、性能预算、flaky 口径）；M7 补两档决策记录与 OQ；相关 MINOR（m2/m3/m5/m6）随修订处理。
- **architect**：B1 补全 F4 提取规格（子编号+扁平双粒度归一、范围词与分隔符单元格排除、小节标题"（AC1.x）"幻影排除、标题按 `^## 验收标准` 前缀匹配、AC4.3 方向二 T−P 的机械处理、先写 state 的顺序绕过与两条早退路径的封堵或披露）；M4 补全 express 触点（gate.md 真值表、party-review SKILL、dev.md、status.md、session-context 回显与非法值回显语义）；M5/M6 规格化（缺失 vs 不可解析的区分、R4 扩展或明示 prompt 纪律+resume 对账）；M7 钉死基线验证命令与计数解析口径。
- **qa**：B3 按裁决后落层重定测试层级与 P0（建议方向：F2/F3 诚实降级为 E2E/流程评审，机械断言只保留真正确定性的部分）；M2 修正映射语义错位（T03/T51/T05/T06/T07）。

产出后 party-review 复审重点核对 B1/B2/B3 消解。

GATE-REJECTED gate1 2026-10-14

## 2026-10-14 Gate#1 复审呈报与 R2 处置

复审互审（reviews/gate1-ai-r2.md）结论：**上轮 3 BLOCKER 全部方向性消解、M1-M7 实质闭合**；但 R1 修订碰撞产生 **1 新 BLOCKER + 7 MAJOR + 15 MINOR**（多为同轮各自新增的文字级矛盾，一句话对齐级）。

编排者将复审结论与处置选项（打回 R2 极小修订 / 带病批准 / 定向裁决）以 AskUserQuestion 呈报，**用户未作答**。按门控铁律——批准必须人类回执（guard-gates R3 强制），编排者绝不代批——本 intent **仍未获得任何门批准**；按建议方向（打回 R2 极小修订）继续修订，裁决方向已定（N1：F4 的 T 集合限定为映射 AC 列逐 token 提取；N2：非法值回显统一到架构原值透传方案；其余见 gate1-ai-r2.md 各条"裁决建议"）。若 R2 后复审仍不通过，按协议升级人类裁决（继续修订或 /aidlc:archive）。

**追认项累计**（下次人类触及本 intent 时须一并裁决）：① 澄清拍三项默认值；② B2 红线精确化措辞；③ OQ1-OQ9；④ 本轮 N1/N2 两个对齐方向。

GATE-REJECTED gate1 2026-10-14

## 2026-10-14 Gate#1 第 3 轮评审审批

复审互审（reviews/gate1-ai-r3.md）结论：R2 点名 15 项中 14 项干净消解、前两轮成果零破坏；新发现 **1 BLOCKER + 2 MAJOR + 14 MINOR**（标点/一行级清扫，无设计矛盾）。趋势：3B/7M/18m → 1B/7M/15m → 1B/2M/14m。

人类裁决（AskUserQuestion 选项原文）：**"打回 R3 清扫（推荐）"**——第 3 轮修订清扫：qa 清映射列注记（消 N-R3-1 BLOCKER）+ architect 连字符入字符类与触点清单补全（消两个 MAJOR）+ pm 两处指引措辞 + 14 条 MINOR 顺手修；编排者预检后再入评审。

R3 修订指令（只重跑被点名角色）：
- **qa**：清扫映射列——6 格（T03/T05/T06/T07/T12/T51）的"（R1 修订：…）"注记移出映射 AC 列（并入场景列或删除），映射格只留编号 token；T06 删"或忽略该字段"残留分支；T53/T55/T56 过期挂起语更新（规格已在 R2 落定）；T54 行号引用更新（L103→L113）。
- **architect**：`-`/`－` 出现在映射列 cell 即整格剔除（M-R3-1）；对齐表补 AC2.4 行；触点清单补 retro 三处（SKILL.md:104-105、SKILL.md:241、ops.md:11）；规格补"映射列括注不计"、映射列定位细节（表头匹配/转义/找不到表头归不可解析）、unavailable=true 时 suites/coverage 键状态、`;` 跨 shell 注记；头部清单补 m-N4。
- **pm**：AC1.7 负分支指引修正（不指 T07 具体行，改为"由流程评审兜底验证"泛指）；AC4.1 Given"三工件齐"收口为"工件齐（classic 三件/express 两件）"并在 OQ1 登记追认。

流程改进采纳（评审建议）：后续无人类裁决的延续以文字记录留痕，不再追加回执行（回执行仅对应真实人类裁决）。

GATE-REJECTED gate1 2026-10-14

## 2026-10-15 Gate#1 终审批准（附带条件）

复审互审（reviews/gate1-ai-r4.md）结论：**零 BLOCKER**——0B / 2M / 5m；趋势 3B/7M/18m → 1B/7M/15m → 1B/2M/14m → 0B/2M/5m。F4 算法三方独立模拟对真实工件 P=21/T=21 双向闭合；存量回归 28+23 实测全绿；M-R3-1 连字符字符类码点级验证、M-R3-2 触点封闭性验证（全插件恰好四处）。

人类裁决（AskUserQuestion 选项原文）：**"批准进门（附带条件，推荐）"**——gate1=approved，phase 进 construction；附带条件作为 Construction 首个动作落地；全部追认项随批准生效。

**批准附带条件**（Construction 首个动作，逐条验收，未落地前不得声称 F4 规格终版）：
1. **M-R4-1**：ac-coverage 回归清单补第 17 项"注记格"场景（映射列含非 token 注记时的解析行为断言）——R3 裁决漏派项，编排者认领为自身执行缺口。
2. **M-R4-2**：F4 规格钉死"整 token 全匹配"语义（`仅匹配第 2 步编号正则的 token` 明确为整 token 全匹配，非子串搜索），m-e 句改写为"括注内合法编号 token 仍会入 T，括注移出映射列是编写纪律而非 hook 行为"。
3. 5 条 MINOR 顺带：m-R4-1 场景计数 15→16 同步（test-strategy T40/L68）；m-R4-2 T54 连字符限定更新（删"字母数字相邻"旧表述，补全角与空格环绕变体）；m-R4-3 行号同步（T53→L112、T55→L111、T54→L121、T56→L135/136）；m-R4-4 route-profile 行归属落地（check-plugin.sh §2 与 ac-coverage 同批补入）；m-R4-5 prd 头部补 R3 修订记录行。

**随批准生效的追认项**（历史累计，全部生效）：
① 澄清拍三项默认值：P0 规划质量包（D12 规模分级路由 + B6 测试基线 + B7 影响面分析 + A3 AC↔测试点覆盖校验）/ 完全兼容存量 intent / AI 提议+人确认分级交互（与 auto-route A1 合并）；
② B2 红线精确化措辞："未经披露的 fail-open；主路径不得依赖 fail-open；fail-open 分支必须在架构文档显式披露并由人类门兜底"——F4 已披露分支（不可解析→allow）为该红线下显式豁免；
③ OQ1-OQ9 按 PRD 所载默认方案生效：OQ1 express 裁剪清单与 Gate#1 执行形态（含 verifier 派发默认值 high 必派/low-med 可省、retro.md 人类可选两个子项）；OQ2 基线缺失显式标注+告警+豁免逐字留痕；OQ3 影响面分级按架构默认阈值（待实现校准）；OQ4 F4 校验限 Inception 对齐拍与修订回填后重跑；OQ5 规模判定规则（含拆分预览条数张力裁决）；OQ6 基线命令失败显式记录不可用；OQ7 性能预算按截断声明；OQ8 flaky 比对口径；OQ9 express/classic 两档（弃 Bugfix 中间档）；及 AC4.1 Given 措辞收口（"三工件齐"→"工件齐"）随 OQ1 追认；
④ 历次对齐方向：F4 的 T 集合限映射 AC 列逐 token 提取（整 token 全匹配）、非法值回显原值透传方案（`route=<原值>(invalid→classic)`）、映射列括注不计（括注移出是编写纪律）。

配额降级记录核验（§8）：本 intent 历次代理失败均按协议重派解决，无内联代行产出，无降级追认项。

结论：gate1 = approved，phase = construction。修订轮次 R1/R2/R3 共 3 轮，第 4 轮评审零 BLOCKER 后批准。

GATE-APPROVED gate1 2026-10-15

## 2026-10-14 Construction：TDD 置锁与 pk5 夹具缺陷待裁决（文字记录，无人类裁决）

按 /aidlc:construct 执行：F2 第 0 步基线记录（51/51，见 state.json.testBaseline）、Sprint Planning（plan.md + units U1-U5）、U1 附带条件内联落地（编排者认领项）、TDD 红灯（dev 提交失败测试 b39fdbc：ac-coverage 32/49 红、route-profile 10/15 红、存量 28+23 未动）、置锁（tddLock=true，tddLockPaths=[ac-coverage, route-profile]）。

**pk5 夹具缺陷（dev 按 TDD 纪律上报，编排者复核证据成立，待人类裁决解锁）**：
- 现象：ac-coverage.test.mjs 48/49 绿，唯一红 pk5。pk5 盘上状态误展开 `...PKBASE`（含 route/testBaseline/unitStatus 三键，与 pk1 盘上状态仅 slug 不同），其新内容缺这三键 → 按已批准架构决策 #11（preserveKeys 键保留）必须 deny，测试却期望 allow；pk1 同构造期望 deny。node 字节级复算：disk-pk1 ≡ disk-pk5（仅 slug），new-pk1 与 new-pk5 唯一差异为不在保留集合的 tddLockOverride。确定性实现无法同时满足两者——夹具编写笔误，非实现缺陷。
- 编排者复核：属实。实现其余全部达标：ac-coverage 48/49、route-profile 15/15、guard-gates 28/28、auto-route 23/23、本 intent 工件 dogfood（phase→gate1 转移）plain allow（P=21/T=21）。U4 文档触点 1-11 已并行落地并提交（40f17f7）。
- 待人类裁决：① 解锁批准（/aidlc:unlock-tests 语义，理由如上）；② 修复方案 A（pk5 新内容补全五保留键、仅去 tddLockOverride——场景变为"丢 tddLockOverride 不拦"，与 pk1 形成边界对照，编排者推荐）或 B（pk5 盘上改 legacy 状态）。解锁→修夹具→49/49→重新上锁→补提交 U2。
- 保守路径（人类未裁决期间）：U2 实现已提交但标记 blocked(pk5-unlock)，unitStatus 如实记录；U3/U5 等不受阻工作继续；gate2 前必须回此决策。

## 2026-10-15 TDD 解锁裁决（pk5 夹具修复）

人类裁决（用户回复原文）：**"选择A方案"**——批准解锁（/aidlc:unlock-tests 语义）并按方案 A 修复 pk5：新内容补全五个保留键（route/testBaseline/unitStatus/tddLockPaths，仅去 tddLockOverride），场景语义为"丢 tddLockOverride 不拦"，与 pk1（丢保留键 → deny）形成边界对照。

执行记录：
1. tddLockOverride = {by: "human", at: 2026-10-15, reason: "pk5 夹具编写笔误（盘上状态误展开 PKBASE）与已批准架构决策 #11 矛盾，字节级证据经编排者复核成立；批准解锁按方案 A 修复夹具"}（tddLock 保持 true）。
2. 修复 scripts/tests/ac-coverage.test.mjs pk5 → 验证 ac-coverage 49/49 + 四套件全绿 + dogfood。
3. 修复完成后清除 override（重新上锁），补提交，U2 = done。

## 2026-10-15 Gate#2 互审呈报与保守打回（文字记录，无人类裁决）

Gate#2 互审（reviews/gate2-ai.md）结论：**1 BLOCKER / 7 MAJOR / ~15 MINOR**；verifier 独立终检 **PASS-WITH-CONCERNS**（5 unit 逐条独立复现、零计划外文件、四套件独立复跑全绿、U3 字节级 v1.1 对比成立）。

- **B1 [pm+qa]** AC5.1/U6 零交付：README.md 与 docs/index.html 未更新（套件计数停在 28+23 构成 AC5.1 明文禁止的"过时描述"），U6 从未进 plan.md，无延期裁决。
- **M1 [三方]** T50/T51 执行主体偏离"人类执行"前提且无追认记录；**M2 [dev]** extractT 不按表边界收口（第二张表可注入假证据）；**M3 [pm]** AC3.4 整体降级落点缺失；**M4 [pm]** AC2.3 标注/告警/豁免留痕落点缺失；**M5 [qa]** T05 悬空未归类；**M6 [qa]** T04 拒绝路径兑现声明虚化；**M7 [qa]** T12/T24 等 P0 降级负路径零执行证据。

编排者以 AskUserQuestion 呈报（打回修订 / 带病批准 / 定向裁决），**用户未作答**。批准须人类回执、编排者绝不代批——gate2 **未获批准**；按建议方向保守打回修订（文字记录留痕，不写回执行）。修订轮 R1（gate2）范围：
1. **B1**：README.md 与 docs/index.html 补 AC5.1 内容（四能力 + 套件计数 28+23+15+49 + auto-route/hook 表同步）——pm 执行；plan.md 补登 U6。
2. **M2**：guard-gates.mjs extractT 表边界收口（遇首个非表行停止收集）——dev 执行；回归场景补第二张表 fixture 需再次解锁，**并入下次人类裁决打包**（先落生产修复与人工验证）。
3. **M3/M4**：SKILL.md 补 AC3.4 整体降级语义与 AC2.3 标注/告警/豁免留痕落点；顺带 SKILL §0 deny 清单补 F4/键保留两项（architect MINOR-1）——编排者内联（精确文本由评审给出）。
4. **M5**：test-strategy T05 归类修正（结构性证据 + pk 组实跑，诚实降级表述）——编排者内联。
5. **M7**：T12/T24 负路径机械补验（基线命令失败 → unavailable=true 实测；影响面扫描降级演示）——编排者 scratch 实测记录。
6. **M1/M6**：人类环补验（真实会话 A1 表单作答/拒绝路径/T50-T51 复跑）——**待人类裁决**：真实会话补验或追认机器模拟结果；随 gate2 复审呈报打包。
7. MINOR 顺带：plan.md 命令连接形态注记；其余（route 回显消毒、P 侧左边界、routeEcho 抽取、.zcode gitignore 等）登记为技术债随 gate2 复审追认。

保守路径影响：gate2 保持 pending（未批准），phase=construction 修订；复审（party-review + verifier）在修订完成后由人类触发 /aidlc:gate。

## 2026-10-15 TDD 解锁裁决（gate2 R1 场景 18 回归锁 + 真实环境核验打包）

人类裁决（用户回复原文）：**"2个任务都请在真实环境重新核验"**——对 R1 计划第 2 条（M2 回归场景 fixture，待解锁打包）与第 6 条（M1/M6 人类环，待裁决形态）一并裁定为：批准解锁补入场景 18（第二张表不注入 T 的回归锁），且真实环境补验（非追认机器模拟结果）。

执行记录：
1. tddLockOverride = {by: "human", at: 2026-10-15, reason: "gate2 R1 M2 回归锁：guard-gates.mjs extractT 表边界收口（commit b271d4d 先落生产修复）需补第二张表 fixture（场景 18）锁定'无映射表头的第二张表不注入 T'；批准解锁按 R1 计划第 2 条执行"}（tddLock 保持 true）。
2. 场景 18 补入 scripts/tests/ac-coverage.test.mjs（fixture：映射表 → 正文段 → 无映射表头的第二张统计表、同列序恰含 AC1.2；断言 deny 点名 AC1.2）→ 验证 ac-coverage 50/50 + 四套件全绿（28/23/15/50）。
3. 真实环境人类环补验（M1/M6 闭环）：真实 A1 表单人类作答原文"进入生命周期（采纳 classic 提议）"→ scratch intent csv-export 创建（route=classic，位于 scratch `$TMP/aidlc-smoke-real/` 下、不污染本仓库）→ 工件+PLAN-CONFIRMED+基线（1/1）→ F4 转移 plain allow（0 字节）；真实 T04 拒绝路径人类作答原文"不进流程直接答复（模拟拒绝）"→ 拒绝路径零残留、需求获直接答复（核验在 scratch 工作区执行，本仓库 docs/aidlc/ 全程仅含 next-phase intent 与 config.json 布局不变）；T51 复验 S1/S2/S5 PASS（无 route= 字样、0 字节静默、preserveKeys deny 列丢失键）；T50-S6 gate1 批准表单已真实呈现但人类未作答——scratch 保留 gate1 pending 作为诚实证据（批准属正式门审职责，设计如此）。
4. 修复完成后清除 override（重新上锁），结果写回 smoke-checklist.md 真实环境核验节，补提交（f218b58）。

## 2026-10-15 Gate#2 复审（R2）互审呈报与修订记录（文字记录，无人类裁决）

复审互审（reviews/gate2-ai-r2.md）结论：**0 BLOCKER / 3 MAJOR / 8 MINOR**——四方 reviewer（pm 首轮派发失败、重派成功）+ verifier（PASS-WITH-CONCERNS）并行；R1 点名项（M2 表边界、M3/M4/§0⑧⑨、M5、B1 主体、M1/M6 真实环境核验）经独立复核全部消解，四套件 116 全绿（qa/verifier 独立复跑）+ check-plugin.sh ALL PASSED + T03 字节级 v1.1 对比复现。

3 项 MAJOR（均三方以上独立同指）与 R2 修订：
1. **MAJOR-1 [四方同指] 文档套件计数 115/49 与实现 116/50 矛盾（AC5.1 判据字面再违例）**：B1 修复 bdf32ec 落在场景 18 提交 2039ac0 之前，R1 自己的 M2 fixture 提交使 B1 修复失效。R2 修订：README.md L59/L69、docs/index.html L308、test-strategy T40、architecture.md 头部注记/回归要求、smoke-checklist 溯源、plan.md U6 验收格全部同步为 116/50；顺带 eval.md L8"两套回归"→"四套回归"（v1.1.0 遗留过时，verifier 点名，计划外一行修）。
2. **MAJOR-2 [四方同指] 场景 18 解锁裁决未逐字入 decisions.md（审计断链）**：state.json history 与 smoke-checklist L101 引用悬空。R2 修订：即本节上方「2026-10-15 TDD 解锁裁决（gate2 R1 场景 18 回归锁 + 真实环境核验打包）」节（含 T04 表述与事实对齐：真实核验在 scratch 工作区执行，本仓库 docs/aidlc/ 布局不变）。
3. **MAJOR-3 [pm+qa] M7 负路径补验无持久化证据**：R1 计划第 5 条仅"recorded in session"。R2 修订：smoke-checklist.md 新增「M7 负路径补验」节——T12 实跑 `node scripts/tests/declared-but-nonexistent.mjs`（真实 MODULE_NOT_FOUND / exit 1）→ unavailable=true schema 落账形态；T24 实跑 `grep -rn 'nonexistent-module' scripts/ plugins/`（0 命中）→ 影响面 unknown + 缺口节登记形态。

MINOR 处置：architecture F4 规格补表边界收口条目 + 回归清单第 18 项（已修）；state.json updatedAt 回退随 gate2 批准 state 写修复、history 末两条乱序追加式不可回改呈报知悉；SKILL §2 AC2.3 对 unavailable 场景的外推列追认项；ac-coverage.test.mjs（TDD 锁定）头注释 1-18 与场景 18 断言加固（`!r.reason.includes('AC1.1')`）打包待人类解锁裁决；场景 18 fix-before-test 无独立 RED 记录知悉（fail-closed 方向 qa/dev 双评审独立验证）。

**追认项打包**（呈 gate2 审批表单一并裁决）：① SKILL §2 AC2.3 补句对 unavailable 场景的外推（OQ6 预设形态）；② TDD 锁内小修打包（头注释 1-18 + 断言加固）——批准解锁或裁决延期；③ history 末两条时间戳乱序知悉；④ fix-before-test 知悉；⑤ T50-S6 scratch gate1 批准步骤人类未作答知悉（正式门审职责，设计如此）。

R2 修订全部为非锁定文件的文档/留痕层改动，零代码改动。四套件 + check-plugin.sh 复跑全绿后随本记录提交。

## 2026-10-15 Gate#2 复审（R2）审批呈报（文字记录，无人类裁决）

编排者以 AskUserQuestion 表单呈报 R2 复审结论（0B / 3M 全消解 / 8m）与审批选项（批准进门·全打包 / 批准进门·②延期 / 打回修订）及追认项①②③④⑤，**用户未作答**。批准须人类回执、编排者绝不代批——gate2 保持 pending（未批准），phase 保持 gate2：R2 修订已完成、无待修订项，追认项②涉及 TDD 锁、无人类裁决不得解锁。待人类再次 /aidlc:gate 或直接作答审批表单。

## 2026-10-15 Gate#2 第三轮复审终检与审批呈报（文字记录，无人类裁决）

verifier 新鲜上下文终检 R2 增量：**PASS-WITH-CONCERNS**——上轮 3 项 MAJOR 逐条独立核验真实消解（计数 116/50 全链零当前态残留；裁决补录节在案、悬空引用消除；M7 两项独立复现与落盘记录一致）；R2 两提交确为零代码改动、TDD 锁定文件未被触碰；四套件 116/116 + check-plugin.sh 由 verifier 独立复跑全绿。verifier 点名 2 处 R2 注记失准（architecture.md 回归清单第 18 项轮次标签 R2→R1、F4 规格条目交叉引用 MAJOR-2→MINOR），编排者已顺手修正（ae79a77，注释级、实质内容经 verifier 核验正确）。

编排者再次以 AskUserQuestion 表单呈报审批（批准进门·全打包 / 批准进门·②延期 / 打回修订）及追认项①②③④⑤，**用户未作答**。批准须人类回执、编排者绝不代批——gate2 保持 pending（未批准），phase 保持 gate2。无待修订项；追认项②涉及 TDD 锁、无人类裁决不得解锁。待人类再次 /aidlc:gate 或直接作答审批表单。

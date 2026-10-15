# Gate#2 AI 互审·R2（2026-10-15，gate2 打回复审第二轮）

> 评审对象：gate2 R1 修订后的全量交付（四方 reviewer + verifier 并行）。复审重点：R1 点名项消解核对 + 独立复核。四方 reviewer-pm 首轮派发失败（模型错误），重派成功，结论独立。

## BLOCKER

（无）

## MAJOR

- **[四方同指：pm+architect+qa+verifier] 用户面文档套件计数 115/49 与实现 116/50 矛盾（AC5.1 判据字面再违例）**——README.md L59/L69 与 docs/index.html L308 写"四套件 115 检查……覆盖 49"，实测 ac-coverage 50/50、四套件合计 116（qa/verifier/pm 三方独立复跑）。根因：B1 修复提交 bdf32ec 落在场景 18 提交 2039ac0 之前，R1 自己的 M2 fixture 提交使 B1 修复失效。plan.md U6 验收格写死"（28+23+15+49）"——pm 建议后续弱化为"计数与实现一致"（修订建议非裁决）。**R2 修订：已同步为 116/50（README×2、index.html、test-strategy T40、architecture 头部/回归要求、smoke-checklist 溯源、plan.md U6 验收格、eval.md"四套回归"）。**
- **[四方同指：pm+architect+qa+dev] 场景 18 解锁的人类裁决原文未逐字入 decisions.md（审计断链）**——state.json history L42 与 smoke-checklist L101 引用"decisions.md 2026-10-15 Gate#2 R1 裁决记录"，但 decisions.md 止于 dbe224c，grep 零命中；对比 pk5 解锁裁决（"选择A方案"）已完整留痕。属 SKILL §1"裁决逐字进 decisions.md"缺口，一行可补。**R2 修订：已补录「2026-10-15 TDD 解锁裁决（gate2 R1 场景 18 回归锁 + 真实环境核验打包）」节，含执行记录四条。**
- **[pm+qa] M7（T12/T24 P0 负路径补验）无持久化证据**——R1 计划第 5 条要求"编排者 scratch 实测记录"，实际仅 state.json history 自述"recorded in session"，grep 全 intent 目录零落盘记录（对比 M2 有场景 18 锁、M1/M6 有 smoke-checklist 真实环境节）。P0 负路径"已验证"声明不可复现。**R2 修订：已实测补录——T12 `node scripts/tests/declared-but-nonexistent.mjs` 真实输出 MODULE_NOT_FOUND/exit 1 → unavailable=true schema 落账形态；T24 `grep -rn 'nonexistent-module' scripts/ plugins/` 0 命中 → 影响面 unknown + 缺口节登记形态。见 smoke-checklist.md「M7 负路径补验」节。**

## MINOR

- **[architect+qa+dev] intent 内部计数连锁过期**——test-strategy T40"17 场景"、architecture 头部注记/回归清单、smoke L91、ac-coverage.test.mjs 头注释"scenarios 1-17"。**R2 已修非锁定部分；ac-coverage.test.mjs（TDD 锁定）头注释 1-17→1-18 与场景 18 断言加固（`!r.reason.includes('AC1.1')`，dev 建议）打包待人类解锁裁决。**
- **[architect] SKILL §2 AC2.3 补句外推至 unavailable 场景**——PRD OQ6 明确"该记未记"与"想记记不了"为两种缺失、处理形态待裁决，R1 补句预设了形态。方向为更多披露、不违红线，**列 gate2 追认项**。
- **[architect] architecture.md F4 规格节未登记 b271d4d 表边界收口行为**——代码注释已文档化、实现 fail-closed 兼容，但架构规格与回归清单未补。**R2 已补（规格条目 + 回归清单第 18 项）。**
- **[architect] state.json updatedAt 回退（01:15→00:55）且 history 末两条乱序**——Rule 4a 放行但污染 mtime 语义；history 追加式不可回改。**updatedAt 随 gate2 批准 state 写修复；history 乱序呈报人类知悉。**
- **[dev] 场景 18 fix-before-test：首个在案证据即 GREEN，无独立 RED 记录**——R1 计划授权"先落生产修复与人工验证"，但承诺的人工验证无独立记录。方向 fail-closed 已由 qa/dev 独立推演验证（旧实现下断言必红），**登记知悉**，随锁定文件打包项一并可由人类裁决补强。
- **[verifier] eval.md L8"两套回归"过时**（v1.1.0 遗留、计划外文件）。**R2 已修"四套回归"。**
- **[qa] T04 零残留表述修正**——smoke-checklist L106 原表述"docs/aidlc/ 仅 config.json + csv-export"与本仓库实态（仅 next-phase）不符；真实核验在 scratch 工作区执行。**R2 已在 decisions.md 补录节与 L106 事实对齐（scratch 执行、本仓库布局不变）。**

## 各角色独立复核结论（R1 消解核对）

- **M2 [architect/dev/qa 三方]**：extractT 表边界收口实现正确——表头定位后遇首个非表行 break，表头前非表行 continue 不误伤；无 off-by-one；Markdown 语法上两张表必有分隔行、无合法误伤路径；dogfood（场景 17b）行为前后一致。场景 18 断言锁规格语义（旧实现下必红）。**消解。**
- **M3/M4/§0⑧⑨ [architect]**：SKILL §0 ⑧⑨、§2 五保留键与 guard-gates.mjs PRESERVE_KEYS/f4Check 三分支逐字对齐；AC3.4/AC2.3 补句与 PRD 原文一致无夸大（外推点见 MINOR-2 追认项）。**消解。**
- **M5 [pm/qa]**：T05 诚实降级成立——guard-gates.mjs 全文 route 零分支读取（4 处命中均为注释/数组/文案，三方独立证实）；pk 组以 `route:'express'` 盘上状态实跑。无测试文件被改断言凑数。**消解。**
- **B1 主体 [pm]**：四能力说明、零运行时变化声明、向后兼容表述合格（bdf32ec 仅 2 文件）。仅计数链失效（见 MAJOR-1）。**主体消解。**
- **M1/M6 真实环境核验 [pm/qa]**：smoke-checklist L95-110 节含真实 A1 作答原文与 T04 拒绝零残留（scratch 工作区），构成 AC1.1/AC1.3 真实人类环证据；T50-S6 BLOCKED 为诚实记录非缺陷。**消解。**
- **四套件实跑**：qa 与 verifier 独立复跑 ac-coverage 50/50 + guard-gates 28/28 + auto-route 23/23 + route-profile 15/15 = 116 全绿；check-plugin.sh ALL CHECKS PASSED；T03 字节级 v1.1 对比复现（session-context 410B≡410B、auto-route 1226B≡1226B）；AC 编号映射 21/21 双向闭合（qa）；转写抽查 5 处逐字一致（verifier）；计划外文件双查零（verifier）。
- **verifier 终检**：PASS-WITH-CONCERNS——U1-U5 VERIFIED；U6 四能力/零运行时变化 VERIFIED，仅计数未同步（R2 已修）；另登记 eval.md 过时（R2 已修）与 units/u6.md 未建（U6 以 plan.md 表行内联规格，可接受）。

## 结论

**0 BLOCKER / 3 MAJOR / 8 MINOR**——三方以上独立同指的 3 项 MAJOR 已全部 R2 修订消解（计数同步、裁决补录、M7 落盘），修订均为文档/留痕层，零代码改动。四套件 + check-plugin.sh 复跑全绿。

**建议人类审批关注点**：
1. gate2 批准（R2 修订后呈报状态）；
2. **追认项打包**：① SKILL §2 AC2.3 补句对 unavailable 场景的外推（OQ6 预设形态，architect MINOR-2）；② TDD 锁内小修打包（ac-coverage.test.mjs 头注释 1-18 + 场景 18 断言加固 `!includes('AC1.1')`）——需解锁裁决或裁决延期；③ state.json history 末两条时间戳乱序知悉（追加式不可回改）；④ fix-before-test 无独立 RED 记录知悉（fail-closed 方向已双评审独立验证）；⑤ T50-S6（scratch gate1 批准步骤人类未作答）知悉——属正式门审职责，设计如此。

# Gate#1 AI 互审（2026-10-14）

> 评审对象：prd.md / architecture.md / test-strategy.md（+ intent.md / research-digest.md / decisions.md）
> 评审角色：reviewer-pm（1B/5M/6m）、reviewer-architect（2B/5M/5m）、reviewer-qa（2B/3M/4m，含实测复现）、reviewer-dev（0B/3M/6m，重派补齐）
> 以下为去重合并结果；每条保留原始评审者署名与证据指针。

## BLOCKER

- **B1 [qa+architect，独立实测复现×2] F4 提取规则退化，机械校验恒通过**
  architecture.md L69-70 规定 `/\bAC\d+\b/g` 提取。实测：`"AC1.1"` 被折叠为 `"AC1"`（`\b` 在数字与 `.` 之间成立），P/T 集合恒为 {AC1..AC4}，即使 AC4.2/4.3/4.4 全部无映射也放行——AC4.1/AC4.2 语义与 T31/T42 断言必然失真。修复须补全提取规格：双粒度归一化、范围词（"AC1.1–AC4.4" 只提端点）、小节标题"（AC1.x）"记法注入幻影裸编号、标题字面量实为 `## 验收标准（可测）`（按全等匹配则 P 恒空→恒 allow）。architect 评估：单改 `AC\d+\.\d+` 丢 SKILL §7 模板的扁平 `**AC1**` 约定；并集方案对本仓库工件立即误 deny。
- **B2 [pm+architect] PRD 非目标红线与架构 F4 fail-open 分支直接矛盾**
  prd.md L46："为任何新机制引入 fail-open 路径（F1–F4 均不得触碰）"；architecture.md 决策 #5（L99）与安全节 L119 却为 F4 设计了"文件缺失/零 AC/解析异常 → allow（fail-open）且静默通过"。按 PRD 批准即禁架构行为，按架构实现即违 PRD。须人类裁决：修订 PRD 措辞（如"未经披露的 fail-open"）并显式追认，或 F4 改 fail-closed。附：L119 类比失实——守卫对损坏 intent 实为 fail-closed（guard-gates.mjs L64-74），"skip 不 fatal"只是路由助手先例。
- **B3 [qa] F2/F3 的 P0 单元测试点伪化（两工件矛盾）**
  test-strategy.md L41 声称 F1-F4 新逻辑落地为 .mjs 纯函数/hook 并将 T10-T15/T20-T24 标单元层（含 T10/T11/T12/T24 四个 P0）；但 architecture.md 落层表 F2/F3 hook 层为"无"、决策 #8 明确 F3"纯 prompt 层无机制强制"——基线记录与影响面扫描由编排者（模型）执行，无确定性被测单元。须二选一：(a) 架构补机制层（确定性脚本）；(b) 策略降级为流程评审/E2E 并重定 P0。

## MAJOR

- **M1 [pm] AC1.2/AC2.3 判定性内容挂起未决 OQ**：AC1.2 的 Then 让渡给 OQ1（"具体裁剪清单以对齐拍协议为准"），AC2.3 挂 OQ2——gate1 时通过/不通过条件尚不存在，实为不可测。
- **M2 [pm+qa+architect] 测试映射语义错位（F4 集合运算防不住、对齐拍语义复核也未抓住的实证）**：T03/T51 映射 AC1.2 实为 AC1.4 语义；T05（express 守卫）挂 AC1.4 实属 AC1.2 域；T06/T07 测的"非法 route 值兜底""路线中途变更"是 PRD 无任何 AC 背书的架构自创语义（architecture L60、决策 #9）。
- **M3 [pm] PRD OQ 清单不完备**：test-strategy 自曝三项未决（基线命令执行失败语义、巨型仓库性能预算、flaky 比对口径）在 OQ1-OQ5 无对应，gate1 将漏裁。
- **M4 [dev] express 改动面不完整**：gate.md 真值表"三工件齐"字面量会把 express intent（2 工件）判"未齐"拒绝进门；party-review SKILL.md、agents/dev.md、status.md 均硬编码 architecture.md；session-context.mjs 不回显 route（route 可观测面缺失，与 T03 措辞矛盾）；route 非法值时回显原样还是 classic 未定义。
- **M5 [architect+qa] F4 规格缺口**：AC4.3 方向二（T−P 幻影）无机械实现但对齐表声称覆盖；"文件缺失→allow"允许先写 state(phase=gate1) 再补工件整体跳过校验（顺序绕过）；brand-new intent（guard-gates.mjs:66）与损坏修复（:69-73）两条早退路径绕过校验；qa 指出两类已披露误提取（正文示例 AC 字样、test-strategy 全文提取假阴性）无负路径测试点。
- **M6 [architect+dev] 覆写保留仅 prompt 层却以"与乐观锁同向"暗示同等保护**：R4 只机械保护 history；testBaseline 被覆写丢失 = 回归门静默失效（弱化方向），resume 对账无 route/testBaseline 恢复规则。建议 R4 确定性扩展或明示仅 prompt 纪律 + resume 对账项。
- **M7 [pm+architect+dev] express 与基线规格未钉死**：两档（express/classic，弃 Bugfix 档）是产品范围决策但无决策记录无 OQ；AC1.2/OQ1 把裁剪限定 Inception，架构决策 #3 却含 Construction/Operations 项且开放问题重开 verifier/retro；F2 验证命令未钉死——本仓库无 package.json，check-plugin.sh 依赖本地 ZCode 二进制（跨环境不可复现），pass/fail 计数仅靠行约定不可机器解析，本 intent 自己加测试套件会触发"基线外新失败=回归"自阻（套件集合漂移）。

## MINOR（18，合并）

m1 [pm] AC1.1"3~6 条拆分预览"与 express 单 unit 张力｜m2 [pm] route 非法值在 PRD 无 AC｜m3 [pm] AC4.4 bounce-back 窄缝（gate1 打回→升级插件→再推进首次触发 F4）｜m4 [pm] 架构 verifier 默认值未进 PRD OQ｜m5 [pm] "既有测试命令"规范来源无落点｜m6 [pm] README/index.html 文档改动无 AC 覆盖｜m7 [architect] 对齐表自称全集缺 AC1.5/AC4.4｜m8 [architect] 基线"第 0 步"时序表述与 SKILL 步骤编号冲突｜m9 [architect] 计数粒度等量置换漏报未披露｜m10 [architect] "回执新鲜度"措辞失准（实为存在性+晚于最近 GATE-REJECTED）｜m11 [dev] 小节标题匹配与 CRLF/BOM 规格缺口｜m12 [dev] OQ3 未决则 T20/T21/T23 断言伪化｜m13 [dev] 存量 plan.md 无影响面列的 resume 兼容声明缺失｜m14 [dev] route 裁决留痕无锚点行，AC1.1 无法机械核对｜m15 [dev] testBaseline schema 无"记录失败"表示，T12 断言无落点且映射宜改 AC2.1｜m16 [qa] T42 dogfood 实操须夹具副本（state 已 gate1）｜m17 [qa] T50/T51 依赖 OQ1-OQ5 未决，E2E 脚本暂无法编写｜m18 [qa] OQ4 修订重跑 F4 无机制锚点未登记。

## 结论

**3 BLOCKER / 7 MAJOR / 18 MINOR**。三条 BLOCKER 均为工件间矛盾或规格不可实现（非方向错误）：B1 使 F4 名存实亡、B2 是红线措辞冲突须人类裁决、B3 是两工件对落层的直接矛盾。正面核实：express 不裁机制强制项、guard-gates 不读 route 字段、F4 扩展点同构、授权三元组完整、AC 集合双向闭合、存量回归 28+23 全绿。

**建议**：打回修订。点名角色——pm（B2 的 PRD 措辞/豁免裁决、M1/M3 OQ 补全、M7 档位决策）、architect（B1 提取规格补全、B3 落层裁决配合、M5 规格缺口、M4 触点、M6/M7 决策）、qa（B3 测试点重定级、M2 映射语义修正）。

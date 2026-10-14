# Smoke Checklist: next-phase（T50 / T51 真实会话执行清单）

> 产出者：tea（U5）　日期：2026-10-14　来源：test-strategy.md T50/T51、units/u5.md、architecture.md 触点清单
> **执行人与时机**：以下两清单由**人类**在 **Gate#2 评审前**执行（CI 无法覆盖真实会话，本清单是 F2/F3 prompt 层纪律的 E2E 兑现载体）。
> **结果记录**：记入本文件（各清单末尾结果表）或逐字记入 `decisions.md`；每步必填"实际观察"与"结论"，不得留空跳过。

## 已知前提（执行前必读）

- **T50 依赖 pk5 解锁裁决完成后执行才有效**：U2 当前 `blocked(pk5-unlock)`（state.json unitStatus），`scripts/tests/ac-coverage.test.mjs` 48/49（已知红：PK 夹具缺陷，待人类按锁协议裁决解锁）。**该裁决完成、套件 49/49 全绿之前，T50 的执行结果无效**。T51 不受影响，可先行执行。
- T50 需要一个新需求样本（建议中等粒度、可拆 3~6 单元的开发类需求——足以让 AI 给出明确的路线提议，又不显然 express）。

## 记录格式（两清单通用）

| 列 | 说明 |
|---|---|
| 步骤号 | 对应清单中的 S 编号 |
| 实际观察 | **截图、hook 输出原文或文件路径引用**（至少其一；不得只写"正常"） |
| 结论 | PASS / FAIL / BLOCKED（前置不满足）/ N-A（写明原因） |

任何一步的观察与"期望观察"不符 → 停止后续步骤，将现象与证据记入结果表，并在 decisions.md 追加条目（gate2 材料引用）。

---

## T50：新 intent 全闭环（正路径，P0）

**场景**（test-strategy T50）：真实会话中新建 intent，走 规模提议 → 人确认 → 基线记录 → 影响面 → AC 覆盖校验 → gate1 全闭环。
**前置**：pk5 解锁裁决完成（ac-coverage 49/49，见"已知前提"）；项目已开启自然语言自动路由（`/aidlc:on`，session-context 显示 `Auto-route: ON`）或已有等价 config；当前无活跃 intent。

| 步骤 | 操作 | 期望观察 |
|---|---|---|
| S1 | 前置确认：确认自动路由已开启、无活跃 intent | session-context 注入含 `Auto-route: ON` 行；无任何 `docs/aidlc/<slug>/` 活跃目录干扰 |
| S2 | 新会话用自然语言提出开发类需求（不敲任何 /aidlc 命令） | 触发 **A1 意图接入确认表单**（AskUserQuestion）：含"识别的意图一句话 + 3~6 条粗粒度拆分预览" + 三选（进入生命周期 / 调整拆分后再进 / 不进流程直接答复）+ **路线提议项（express/classic，AI 依需求粗细给出明确提议）**；确认前**未建任何目录**（docs/aidlc/ 下无新 slug） |
| S3 | 在 A1 表单确认"进入生命周期"并采纳（或明确改选）路线提议 | decisions.md **逐字**记录本次裁决（含路线选择与拆分预览，即 A3 凭据）；骨架工件创建：state.json 存在且 **`route` 字段 = 确认值**，history 首条为创建记录 |
| S4 | classic 全流程抽查（AI 提议 classic 时随步观察；若提议 express，在确认时改选 classic 或另备 express 样本单独跑） | Inception 三工件（prd / test-strategy / architecture）落盘且与 route 表述一致；Sprint Planning：A3 单元表确认回执 `PLAN-CONFIRMED <日期>`；plan.md 含"验证命令"声明段 + Units 表"影响面"列（取值 low/med/high/unknown）；**Construction 第 0 步**：state.json 写入 `testBaseline`（recordedAt/command/suites/total/pass/fail，unavailable=false），且记录时间**先于**任何本 intent 测试文件写入 |
| S5 | 工件齐备推进至 gate1 前，观察 F4 覆盖校验（guard-gates 在 phase→gate1 转移时机械执行） | **无 deny**：test-strategy"映射 AC"列 token 集合与 prd"验收标准"小节 AC 集合双向闭合（该 intent 自己的 P/T 等价物；参考本仓库 dogfood P=21/T=21）；转移输出为 plain allow，无覆盖缺口 / 幻影 / 不可解析披露 |
| S6 | 渲染 gate1 评审表单，人类审批 | 表单呈现三工件评审与 AC 覆盖结论；人类批准后回执 `GATE-APPROVED gate1 <日期>`，state.json phase=construction、gates.gate1=approved |

**结果表（人类填写）**

| 步骤号 | 实际观察（截图 / 引用） | 结论 |
|---|---|---|
| S1 | | |
| S2 | | |
| S3 | | |
| S4 | | |
| S5 | | |
| S6 | | |

执行人：＿＿＿＿　日期：＿＿＿＿　总体结论：＿＿＿＿　遗留问题：＿＿＿＿

---

## T51：存量 intent 零打扰（负路径，P2）

**场景**（test-strategy T51，映射 AC1.4）：真实会话打开存量 intent 续跑——无路由提议打扰、守卫行为与升级前一致。
**前置**：一个 v1.1 时代创建的 intent（state.json **无** `route` / `testBaseline` 字段），或手工构造——复制任一 intent 目录后从 state.json 删除这两个字段（用构造件时在结果表注明"构造件"）。本仓库当前 intent 均含 route 时，用手工构造件。

| 步骤 | 操作 | 期望观察 |
|---|---|---|
| S1 | 新开会话（或先 `/aidlc:status`）打开该存量 intent | session-context 注入**不含任何 `route=` 字样**（字段缺失 → 不追加该行，输出与 v1.1 字节级一致）；Auto-route 行为不变（有 config 显 ON/OFF 行，无 config 无该行） |
| S2 | 用自然语言输入一条与该 intent 相关的开发请求 | **不弹路线确认**：无 A1 表单、无 express/classic 路线提议项（活跃 intent 存在 → 至多走既有 A2 范围判定，该表单也不含路线项）；state.json 保持无 route 字段 |
| S3 | `/aidlc:status` | 正常输出阶段 / 门控 / 工件清单；**无 `route=<值>` 行**（字段缺失不显示该行）；基线区显示"无基线"，**不得**呈现为"已对照" |
| S4 | `/aidlc:resume`（或继续推进任一未完成单元） | 正常续跑：不要求回填基线、不弹确认、不阻断（AC2.4 / T15 语义）；resume 对账不因缺 route / testBaseline 报差异项 |
| S5 | 守卫行为抽查：a) 按 v1.1 方式触发既有守卫（如无回执整体写 state → R3 deny）；b) 整体覆写 state.json 且**漏写既有键**（如漏 unitStatus） | a) deny 行为与升级前一致（guard-gates 不读 route，字段缺失不影响任何守卫判定）；b) **被 deny**（preserveKeys 键保留校验，消息列出丢失键）——这是有意的强化而非行为回归（T03 注记），该观察即符合期望 |
| S6 | 检查全程无文件被意外写入路由 / 基线字段 | state.json 全程仍无 `route` / `testBaseline` 字段；decisions.md 无自动追加的路由裁决记录 |

**结果表（人类填写）**

| 步骤号 | 实际观察（截图 / 引用） | 结论 |
|---|---|---|
| S1 | | |
| S2 | | |
| S3 | | |
| S4 | | |
| S5 | | |
| S6 | | |

执行人：＿＿＿＿　日期：＿＿＿＿　总体结论：＿＿＿＿　遗留问题：＿＿＿＿

---

## 溯源

- T50：test-strategy.md 测试点 T50（AC1.1–AC4.4，E2E（需人工），P0）
- T51：test-strategy.md 测试点 T51（AC1.4，E2E（需人工），P2）
- 经本清单兑现的降级测试点：T01/T02/T04（route 提议 / 确认 / 拒绝 → T50 S2-S3）、T10-T15（基线记录 / 回归对比 / 存量豁免 → T50 S4、T51 S4）、T20/T23/T24（影响面列 / 分级 / 降级 → T50 S4）
- 关联工件：plan.md U5、architecture.md 回归清单 17 场景（对应 ac-coverage 49/49，T50 的机械前提）

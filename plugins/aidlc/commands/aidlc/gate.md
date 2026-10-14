---
description: Run the current AIDLC review gate (AI cross-review + human approval).
argument-hint: "[gate1|gate2]"
skills: [aidlc, party-review]
---

以 `aidlc` skill 的**门控协议**执行当前门。门的推断真值表（`$ARGUMENTS` 显式指定时优先）：

- `phase = gate1` → 执行 Gate#1
- `phase = gate2` → 执行 Gate#2
- `phase = inception` 且工件齐（判据按 `state.json.route`：classic 三件——prd.md/architecture.md/test-strategy.md；express 两件——prd.md/test-strategy.md；route 缺失或非法值一律按 classic）（U4：响应触点 1）→ 视为推进中断，先补齐收尾（提交工件、phase 置 gate1）再执行 Gate#1
- `phase = inception` 且工件未齐（同一 route 判据）→ 拒绝执行，提示先 `/aidlc:resume` 对账
- `phase = construction`（gate2 前置未满足）→ 提示先完成 Construction
- `phase = operations / done / archived` → 拒绝执行（门已过或已完结/终止，不得重写 reviews/ 历史文件）
- 打回后重进门：`gates.gateN = pending`（approved/rejected 是历史记录，重审以新一轮为准）

执行顺序：

1. 调 `party-review` skill 做 AI 交叉评审，产出 `reviews/gateN-ai.md`。
2. 把互审结论汇总呈给用户，用 AskUserQuestion 表单化审批（通过 / 打回+反馈）。
3. **批准时（顺序被 guard-gates hook 强制，颠倒会被 deny）**：
   a. 先把审批结论与反馈**逐字**追加进 `decisions.md`——**用 Write 追加**（读全文→写"全文+追加"；Edit 会被 hook 拒绝）；**转写核对**：表头/枚举/路径等技术字面量必须与 PRD/架构原文逐字一致（转写笔误会被 verifier 抓出）；末行加回执 `GATE-APPROVED gateN <日期>`；
   b. 再更新 `state.json`（`gates.gateN = "approved"`，phase 推进，history 追加）。
   c. **追认项打包**：若 decisions.md 有配额降级期间的代行/解锁记录（见 SKILL §8），在本轮审批中一并列出请人类追认。
4. **打回时**：反馈逐字进 `decisions.md`（Write 追加），**末行加标记 `GATE-REJECTED gateN <日期>`**（hook 依赖它判定回执新鲜度——此后旧回执作废，复审须新回执）；`gates.gateN = "rejected"`；phase 回退（gate1→inception 修订，gate2→construction 修订）；状态保留不重来。修订只重跑被点名的角色，`party-review` 复审时重点核对上轮 BLOCKER 是否消解。修订满 3 轮仍未过 → 升级给用户：继续修订或 `/aidlc:archive` 终止。

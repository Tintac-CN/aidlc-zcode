---
description: Terminate an AIDLC intent with a human-decided reason (archived, not deleted).
argument-hint: "<slug> <why terminating>"
skills: aidlc
---

以 `aidlc` skill 的**终止协议**（§9）执行：把一个 intent 置为 `archived`——中途终止（打回 3 轮不收敛、需求取消、方向推翻），区别于交付完结的 `done`。

$ARGUMENTS

要求：
1. 目标 intent 取 `$ARGUMENTS` 中的 slug；缺失则取活跃 intent 并向用户确认。
2. 终止理由取 `$ARGUMENTS`；缺失则用 AskUserQuestion 向人类询问，**不得自行编造**。
3. 理由**逐字**追加进该 intent 的 `decisions.md`（用 Write：读全文→写"全文+追加"，Edit 会被 hook 拒绝），末行标记 `ARCHIVED <日期>`。
4. 更新 `state.json`：`phase = "archived"`，history 追加一条（why 引用 decisions.md 终止裁决日期）。
5. 回报：归档的 slug、理由摘要、提醒——该 intent 退出活跃位（不再注入会话、不再被 resume 选中），工件链与 decisions.md 原样保留作审计。

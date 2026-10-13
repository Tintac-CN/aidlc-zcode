---
description: Run the current AIDLC review gate (AI cross-review + human approval).
argument-hint: "[gate1|gate2]"
skills: aidlc, party-review
---

以 `aidlc` skill 的**门控协议**执行当前门（未指定则按 `state.json` 的 phase 推断 gate1/gate2）：

$ARGUMENTS

要求：
1. 先调 `party-review` skill 做 AI 交叉评审，产出 `reviews/gateN-ai.md`。
2. 把互审结论汇总呈给用户，用 AskUserQuestion 表单化审批（通过 / 打回+反馈）。
3. 反馈**逐字**追加进 `decisions.md`；通过则推进 phase，打回则回上一阶段修订（状态保留）。

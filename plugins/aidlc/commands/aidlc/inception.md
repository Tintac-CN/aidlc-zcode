---
description: Start an AIDLC intent — Inception phase (parallel PRD / architecture / test strategy).
argument-hint: "<one-line intent>"
skills: aidlc
---

以 `aidlc` skill 的 **Inception 协议**处理本次意图：

$ARGUMENTS

要求：
1. 先建 `docs/aidlc/<slug>/`（intent.md + state.json）。
2. 意图有歧义先提问（最多 3 个关键问题）。
3. 并行调度 pm / architect / qa 三个角色产出三份工件。
4. 完成后报告工件路径并提示用户运行 `/aidlc:gate` 进入设计门。

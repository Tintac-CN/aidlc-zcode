---
description: Start an AIDLC intent — Inception phase (parallel PRD / architecture / test strategy).
argument-hint: "<one-line intent>"
skills: aidlc
---

以 `aidlc` skill 的 **Inception 协议**处理本次意图：

$ARGUMENTS

要求：
1. **分级确认（先于建目录）**（U4：响应触点 8）：AI 依需求粗细**提议路线（express/classic）**，与"进入生命周期"合并在**同一次 AskUserQuestion** 确认（不新增独立提问步骤；用户未选 express 或未确认 → 缺省 classic）；裁决（含路线）逐字记入 `decisions.md` 后才建 intent。
2. 先建 `docs/aidlc/<slug>/`（intent.md + state.json——写入确认后的 `route` 字段）。
3. 意图有歧义先提问（最多 3 个关键问题）。
4. 并行调度角色按 route（U4：route 分支，呼应 SKILL §3.0 规模分级）：classic → pm / architect / qa 三份工件；`route=express` → pm / qa 两份工件（不派发 architect、不产 architecture.md，语义对齐并入 prd.md 内联小节）。
5. 完成后报告工件路径并提示用户运行 `/aidlc:gate` 进入设计门。

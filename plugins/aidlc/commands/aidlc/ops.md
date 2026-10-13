---
description: Run the AIDLC Operations phase (monitoring, deployment, feedback loop).
skills: aidlc
---

以 `aidlc` skill 的 **Operations 协议**执行（前置条件：gate2 已通过）：

要求：
1. 产出监控/告警/部署流水线建议（SLA、阈值、部署窗口由人类决定，用 AskUserQuestion 收集）。
2. 建立回流机制：生产事件与学习写回 `intent.md` 或新 intent。
3. 完结后写 `retro.md`（复盘），phase 置 `done`。

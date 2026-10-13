---
description: Report AIDLC intent status (phase, gates, artifacts, next step).
skills: aidlc
---

以 `aidlc` skill 的**状态查询协议**执行：找到活跃 intent（`docs/aidlc/*/state.json` 最新者），报告：

- slug 与一句话意图
- 当前 phase 与两个门的状态
- 已产出工件清单（含缺失项）
- 下一步建议（该跑哪个命令）

无活跃 intent 时明确说明并列出历史 intent（如有）。

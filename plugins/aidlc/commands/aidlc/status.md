---
description: Report AIDLC intent status (phase, gates, artifacts, next step).
skills: aidlc
---

以 `aidlc` skill 的**状态查询协议**执行：找到活跃 intent（`docs/aidlc/*/state.json` 最新者），报告：

- slug 与一句话意图
- 当前 phase 与两个门的状态
- `route=<值>` 显示行（U4：响应触点 4）：合法值原样（`route=classic`/`route=express`）；非法值 `route=<原值>(invalid→classic)`；字段缺失不显示该行（存量 intent 输出不变）
- 已产出工件清单（含缺失项）——缺失项判定按 route 期望清单（U4：响应触点 4）：classic 三件（prd/architecture/test-strategy）；`route=express` 两件（prd/test-strategy），**不得把 architecture.md 报为缺失/异常**
- 测试基线（U4：响应触点 4/7）：`testBaseline` 缺失或 `unavailable: true` → 显示"无基线 / 基线不可用"，**不得呈现为"已对照"**
- 下一步建议（该跑哪个命令）

无活跃 intent 时明确说明并列出历史 intent（如有）。

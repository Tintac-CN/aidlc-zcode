---
description: Turn on AIDLC auto-route — natural-language requests are routed into the lifecycle automatically (human confirmation gates and all safety guards unaffected).
skills: aidlc
---

开启本项目的 **auto-route**（开关持久化在 `docs/aidlc/config.json`，进 git、跨会话生效）：

1. 读 `docs/aidlc/config.json`（不存在视为 `{}`）。已是 `"autoRouting": true` → 只回显确认，不重复写。
2. 用 **Write** 落盘 `docs/aidlc/config.json`：保留既有键，置 `"autoRouting": true`、`"updatedAt": <当前 ISO 时间>`（`docs/aidlc/` 目录不存在也没关系，Write 会创建）。
3. 回显三件事：
   - **已开启**：此后自然语言提需求即可，不必敲 `/aidlc:inception`——接入前会先展示「意图 + 拆分预览」让人确认；生命周期中疑似超范围的输入会三选确认（扩展/搁置/越轨）；经此入口进入的 intent，单元拆分（plan.md/units）在开发前还需人工确认一次。
   - **门禁不变**：gate1/gate2 的人类审批任何时候都不会自动通过。
   - **守卫不受开关影响**：guard-gates / guard-paths / TDD 锁始终生效。
4. 若存在活跃 intent，附一行其状态（slug/phase/门控），提示可用 `/aidlc:resume` 续跑。

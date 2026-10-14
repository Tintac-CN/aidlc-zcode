---
description: Turn off AIDLC auto-route — back to explicit /aidlc: commands only (active intents stay resumable; safety guards stay on).
skills: aidlc
---

关闭本项目的 **auto-route**（开关持久化在 `docs/aidlc/config.json`）：

1. 读 `docs/aidlc/config.json`。不存在或已是 `"autoRouting": false` → 只回显"本就未开启"，不写文件。
2. 否则用 **Write** 落盘：保留既有键，置 `"autoRouting": false`、`"updatedAt": <当前 ISO 时间>`。
3. 回显三件事：
   - **已关闭**：回到显式 `/aidlc:` 命令模式，普通输入不再被自动路由进流程。
   - **不受影响的部分**：活跃 intent 的状态与工件原样保留，随时 `/aidlc:resume` 续跑；**安全守卫（guard-gates / guard-paths / TDD 锁）依然生效**——关闭的只是路由注入，不是保护。
   - **彻底停用插件**（连守卫一起停）需在客户端禁用/卸载本插件并重启会话。

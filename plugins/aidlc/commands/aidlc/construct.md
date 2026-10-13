---
description: Run the AIDLC Construction phase (plan units, TDD, parallel implementation).
skills: aidlc
---

以 `aidlc` skill 的 **Construction 协议**执行（前置条件：gate1 已通过，否则先提示用户跑 `/aidlc:gate`）：

要求：
1. Sprint Planning：PRD 拆 units → `plan.md` + `units/<n>.md`。
2. TDD 锁：dev 先写失败测试并提交，置 `state.json.tddLock = true`。
3. 并行调度 dev / architect / tea 按 unit 实现。
4. 全 unit 完成 + 验证命令通过后，提示用户运行 `/aidlc:gate` 进入交付门。

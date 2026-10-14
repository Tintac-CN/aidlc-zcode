---
description: Run the AIDLC Construction phase (plan units, TDD, parallel implementation).
skills: aidlc
---

以 `aidlc` skill 的 **Construction 协议**执行（前置条件：gate1 已通过，否则先提示用户跑 `/aidlc:gate`）：

要求：
1. Sprint Planning：PRD 拆 units → `plan.md`（Units 表含"影响面"列、"验证命令"声明段）+ `units/<n>.md`；**第 0 步记录测试基线**——运行声明的验证命令、解析统计、写 `state.testBaseline`，先于任何本 intent 测试文件写入（U4：F2，语义见 SKILL §3 Construction；执行失败或不可解析时按 `unavailable: true` 显式记录，不得虚构 0 fail）。
2. TDD 锁：dev 先写失败测试并提交，置 `state.json.tddLock = true`。
3. 并行调度 dev / architect / tea 按 unit 实现。
4. 全 unit 完成 + 验证前**回归对比**（重跑同一命令对照 `testBaseline`：基线 pass 的用例新失败 = 回归 = BLOCKER；比对范围限 `suites` 清单、排除 `tddLockPaths` 内本 intent 新增测试）+ 验证命令通过后，提示用户运行 `/aidlc:gate` 进入交付门。（U4：F2，语义见 SKILL §3 Construction）

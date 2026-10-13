---
description: Enable the AIDLC TDD lock — test files become contracts, edits are denied until a human-approved unlock.
skills: aidlc
---

以 `aidlc` skill 的 Construction 协议置位 **TDD 锁**：

1. 前置校验：本 intent 的失败测试已提交（`git log` 中能查到测试文件的提交）；未提交则先提交再继续。
2. 更新活跃 intent 的 `state.json`：`tddLock = true`，清除 `tddLockOverride`，`history` 追加一条（why 注明置位时间与对应测试提交）。
3. 回报：锁状态 + 受保护的测试文件范围。

注意：置位后 guard-gates hook 会 **deny** 对测试文件的 Edit/Write；契约本身有错时走 `/aidlc:unlock-tests`。

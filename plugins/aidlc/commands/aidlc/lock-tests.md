---
description: Enable the AIDLC TDD lock — test files become contracts, edits are denied until a human-approved unlock.
skills: aidlc
---

以 `aidlc` skill 的 Construction 协议置位 **TDD 锁**：

1. 前置校验：本 intent 的失败测试已提交（`git log` 中能查到测试文件的提交）；未提交则先提交再继续。
2. **记录锁定范围**：从失败测试提交（`git show --name-only <hash>`）提取测试文件路径，写入 `state.json.tddLockPaths`（数组；相对/绝对路径均可，hook 按后缀匹配、大小写不敏感）。**非空清单 = 只锁这些文件**，不殃及仓库其他测试；留空 = 全仓库测试文件（旧 intent 兼容）。
3. 更新活跃 intent 的 `state.json`：`tddLock = true`，清除 `tddLockOverride`，`history` 追加一条（why 注明置位时间与对应测试提交）。
4. 回报：锁状态 + 受保护的测试文件清单（tddLockPaths）。

注意：置位后 guard-gates hook 会 **deny** 对清单内测试文件的 Edit/Write；契约本身有错时走 `/aidlc:unlock-tests`。

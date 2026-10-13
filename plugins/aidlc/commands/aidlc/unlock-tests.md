---
description: Human-approved unlock of the AIDLC TDD lock — records the reason in decisions.md before allowing test edits.
argument-hint: "<why the contract needs to change>"
skills: aidlc
---

经人类批准解锁 **TDD 锁**（这是对"测试即契约"的例外，必须留痕）：

1. 解锁理由取 `$ARGUMENTS`；缺失则用 AskUserQuestion 向人类询问，不得自行编造。
2. 把解锁决定**逐字**记入活跃 intent 的 `decisions.md`：日期、UNLOCK-TESTS 标记、人类给出的理由原文。
3. 更新 `state.json`：写入 `tddLockOverride = { "by": "human", "at": "<日期>", "reason": "<理由>" }`（保持 `tddLock = true`，override 存在即放行测试改动）。
4. 回报：override 内容 + 提醒——修完契约后用 `/aidlc:lock-tests` 重新上锁（会清除 override）。

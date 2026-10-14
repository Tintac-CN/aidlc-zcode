---
description: Resume the active AIDLC intent from its saved state.
argument-hint: "[slug]"
skills: aidlc
---

以 `aidlc` skill 的**续跑协议**执行：读取指定（或最新）intent 的 `state.json` 与 `decisions.md`，从断点继续当前阶段的四拍仪式。

$ARGUMENTS

要求：先复述当前状态（阶段/门控/已完成工件），再继续执行；不凭记忆，一切以落盘状态为准。

对账差异表增补以下披露行（U4：响应触点 6；intent 无对应字段时跳过该行——存量 intent 零变化）：

- **preserveKeys deny 提示**：写 state 被键保留校验 deny → 提示重读磁盘 state、完整保留既有键（`route`/`testBaseline`/`unitStatus`/`tddLock`/`tddLockPaths`）后整体重写；损坏修复后 state 缺这些键之一而 phase 已过对应阶段 → 列差异行呈示人类。
- **route 变更留痕核对**：`state.route` 与 `decisions.md` 路线裁决记录不一致 → 差异项（route 变更仅限 gate1 批准前、须人类裁决逐字留痕）。
- **基线命令不一致差异项**：`testBaseline.command` 与 plan.md"验证命令"声明不一致 → 列差异项；对账时呈示 `testBaseline.recordedAt` 与对应 git 提交。
- **"损坏修复路径 F4 未重跑"披露行**：修复后 state 声称 `phase ≥ gate1` 而 F4 未随修复重跑 → 差异表必须列出该行，并在 gate1 人审呈示。

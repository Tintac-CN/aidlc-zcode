# Intent: next-phase

> 创建：2026-10-14　状态：inception

## 一句话意图
根据调研结果，开始推进插件到下一个阶段（用户原话，逐字保留）

## 问题与期望
- **要解决的问题**：2026-10-14 对主流 AI 开发流程（AWS Kiro、awslabs/aidlc-workflows v2.11、BMAD v6.12+TEA、Anthropic 工程实践、Spec Kit）的调研识别出插件在五个层次的盲区（详见 research-digest.md：规格 A1-A4、计划 B5-B8、门控 C9-C11、编排 D12-D14、度量 E15-E16），需要人类确认范围后落地一组改进。
- **期望的结果**：插件能力提升到下一个版本；改进经 AIDLC 流程交付（设计门 → Construction → 交付门）；守卫 hook 语义不破坏；存量用户零行为变化。

## 受影响系统/用户
- 插件本体 `plugins/aidlc/`（skills / commands / agents / hooks）
- 回归基建 `scripts/tests/`、`scripts/check-plugin.sh`、`.github/workflows/`
- 文档 `README.md`、`docs/design.md`、GitHub Pages `docs/index.html`
- 存量用户与存量 intent（兼容性要求待澄清）

## 约束
- 守卫 hook 的 deny-only 与 fail-closed 语义不可破坏（design.md D2/D3）；新 hook 不得 fail-open 静默失效。
- 升级对未启用新功能的用户零行为变化（v1.1 auto-route 确立的 opt-in 惯例延续）。
- 回归底线：guard-gates 28 场景 + auto-route 23 场景全绿；新增机制须配新增回归。
- 本 intent 是插件的自用进化（dogfooding），工件落在本仓库 `docs/aidlc/next-phase/`。

## 开放问题（需人类裁决）
- [ ] 本次改进范围（P0 / P1 / P2 哪些进入）
- [ ] 存量 intent 与存量用户的兼容性要求
- [ ] 规模分级（profile 路由）的交互形态——若纳入范围

## 来源
- `research-digest.md`（2026-10-14 调研固化件，角色扇出时必读）

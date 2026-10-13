---
name: party-review
description: AI cross-review orchestration for AIDLC gates. Use when a review gate (gate1/gate2) is reached and artifacts need cross-examination by multiple role perspectives before human approval. Fans out read-only reviewer subagents in parallel and consolidates findings into reviews/gateN-ai.md.
---

# Party Mode 互审（AI 交叉评审）

门控前的 AI 互审：多角色并行交叉评审工件，抓**硬性不一致**；人类随后只审语义。

## 流程

1. **确定评审对象**：从活跃 intent 的 `state.json` 判断当前门（gate1 → 评审 `prd.md`/`architecture.md`/`test-strategy.md`；gate2 → 评审代码 diff、`plan.md` 完成度、测试结果）。
2. **并行扇出**（Agent 工具，一次消息多个调用）——**派 reviewer 系列角色**（`reviewer-pm`/`reviewer-architect`/`reviewer-qa`/`reviewer-dev`），它们**没有 Edit/Write 工具**（只读是机制保证，不靠 prompt）；**不要派生产角色**（pm/architect/qa/dev 带 Write，是产出用的）：
   - `reviewer-pm`：需求覆盖 / AC 可测性 / 边界场景遗漏 / 非目标边界。
   - `reviewer-architect`：三方语义一致性 / 数据模型支撑 / 错误处理 / 安全 / brownfield 一致性。
   - `reviewer-qa`：AC 覆盖与编号核对 / 负路径 / P0 充分性 / 断言与设计一致。
   - `reviewer-dev`：可实现性 / 隐藏依赖 / 技术债 / 测试可写性。
   - gate2 时另加 `verifier`：新鲜上下文对照 `plan.md` 逐 unit 核对实际 diff（含计划外文件双查）。
   - 调度消息仍按 SKILL §5 契约五要素（intent 路径/读清单/输出协议/检查清单来源/完成判据），评审的"输出"是回报文本（`REVIEWER-<ROLE>-DONE <B>/<M>/<m>`），不写文件。
3. **汇总**：把各角色发现合并去重，按严重度排序（BLOCKER / MAJOR / MINOR），写入 `reviews/gateN-ai.md`（由编排者落盘，reviewer 不写文件），格式：

```markdown
# Gate#N AI 互审（日期）
## BLOCKER
- [reviewer-architect] PRD 说 DELETE，架构假设软删除，测试期待 404 —— 三方不一致，需先裁决语义
## MAJOR
- ...
## MINOR
- ...
## 结论
N 个 BLOCKER / M 个 MAJOR —— 建议人类审批关注点：...
```

## 规则

- 互审**只读不改**：reviewer 系列无 Edit/Write 工具（机制层）；Bash 仍可写文件，调度消息注明"只读命令，禁止重定向/落盘"（prompt 层兜底）。
- 每条发现必须**引用证据**（文件+小节/行为描述），不空泛评价。
- 典型硬伤模式（重点查）：PRD↔架构↔测试三方语义不一致、验收标准不可测、**AC 编号对不上/引用虚构**、数据模型缺字段、错误处理/边界遗漏、安全（鉴权/密钥）缺失。
- 汇总后**必须**呈给用户做人类审批（AskUserQuestion），互审不能替代人审。

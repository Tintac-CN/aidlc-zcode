---
name: party-review
description: AI cross-review orchestration for AIDLC gates. Use when a review gate (gate1/gate2) is reached and artifacts need cross-examination by multiple role perspectives before human approval. Fans out read-only reviewer subagents in parallel and consolidates findings into reviews/gateN-ai.md.
---

# Party Mode 互审（AI 交叉评审）

门控前的 AI 互审：多角色并行交叉评审工件，抓**硬性不一致**；人类随后只审语义。

## 流程

1. **确定评审对象**：从活跃 intent 的 `state.json` 判断当前门（gate1 → 评审 `prd.md`/`architecture.md`/`test-strategy.md`；gate2 → 评审代码 diff、`plan.md` 完成度、测试结果）。
2. **并行扇出**（Agent 工具，一次消息多个调用，**只读**）：
   - `pm` 视角：PRD 与架构/测试策略是否覆盖全部需求？验收标准可测吗？
   - `architect` 视角：架构与 PRD 语义一致吗（如删除 vs 软删 vs 归档）？数据模型支撑用户故事吗？
   - `qa` 视角：测试策略覆盖验收标准与负路径吗？P0 风险都有对策吗？
   - `dev` 视角：可实现吗？有隐藏依赖或技术债吗？
   - gate2 时另加 `verifier`：新鲜上下文对照 `plan.md` 逐 unit 核对实际 diff。
3. **汇总**：把各角色发现合并去重，按严重度排序（BLOCKER / MAJOR / MINOR），写入 `reviews/gateN-ai.md`，格式：

```markdown
# Gate#N AI 互审（日期）
## BLOCKER
- [architect] PRD 说 DELETE，架构假设软删除，测试期待 404 —— 三方不一致，需先裁决语义
## MAJOR
- ...
## MINOR
- ...
## 结论
N 个 BLOCKER / M 个 MAJOR —— 建议人类审批关注点：...
```

## 规则

- 互审**只读不改**（调度消息会注明"禁止 Edit/Write"）；发现的问题报告，不修复。
- 每条发现必须**引用证据**（文件+小节/行为描述），不空泛评价。
- 典型硬伤模式（重点查）：PRD↔架构↔测试三方语义不一致、验收标准不可测、**AC 编号对不上/引用虚构**、数据模型缺字段、错误处理/边界遗漏、安全（鉴权/密钥）缺失。
- 汇总后**必须**呈给用户做人类审批（AskUserQuestion），互审不能替代人审。

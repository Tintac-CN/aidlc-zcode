# aidlc-zcode

> 🏠 **主页/教程**：https://tintac-cn.github.io/aidlc-zcode/ （介绍 · 安装 · 快速开始 · 完整生命周期教程 · 命令参考 · FAQ）

把 AWS **AI-DLC**（AI-Driven Development Life Cycle）方法论以 **ZCode 原生插件**落地：三阶段双门控流水线 + 角色子代理 + 工件链审计 + 流程守卫。

> 设计定稿：[docs/design.md](docs/design.md)（v1.0，含 D1–D10 决策清单与 POC 判定表）
> POC 参照实现：[poc/aidlc-poc/](poc/aidlc-poc/)（机制验证用，已冻结）

## 工作流

```
/aidlc:inception <意图>     → 并行产出 PRD / 架构 / 测试策略
  ═══ Gate#1 设计门 ═══      → AI 互审（party-review）+ 人类审批
/aidlc:construct            → 拆 units、测试基线、TDD 锁、并行实现
  ═══ Gate#2 交付门 ═══      → 互审 + verifier 终检 + 人类审批
/aidlc:ops                  → 监控/部署 + 事件回流闭环
```

- 工件落 `docs/aidlc/<slug>/`，一工件一提交 = 审计链；`state.json` 支持跨会话续跑。
- **自动路由模式（v1.1，默认关闭）**：`/aidlc:on`（或对开启状态说 "aidlc on"）后，自然语言提需求即可进入流程——接入前先展示「意图 + 拆分预览」让人确认；生命周期中疑似超范围的输入会三选确认（扩展 / 搁置 backlog / 越轨留痕）；经此入口进入的 intent，单元拆分（plan.md/units）开发前还需人工确认一次。开关存项目级 `docs/aidlc/config.json`（进 git、跨会话）；**开关只控制路由注入，守卫不受影响**。
- **规模分级路由（v1.2 新增）**：接入确认时 AI 按规模提议 `express`（裁剪档：不派 architect、不产 architecture.md——语义对齐并入 prd.md 内联小节、gate1 评审压缩单轮两件、允许单 unit、retro 人类可选）或 `classic`（全量档）两档，与"进入流程"确认合并为一次 AskUserQuestion，人确认后 `route` 字段记入 `state.json`（缺失/非法值一律按 classic 全量兜底）。**express 只裁文档与评审轮次：门控人类回执、decisions.md 逐字留痕、TDD 锁、全部守卫 hook、测试基线、覆盖校验一项不裁。**
- **测试基线（v1.2 新增）**：Construction 第 0 步先运行声明命令记录基线（总数/pass/fail + 命令原文落 `state.json` 的 `testBaseline`）；交付验证时**基线之外的新失败 = 回归**，基线中已有的失败记为"存量失败"不误判；命令失败或输出不可解析时显式记"基线不可用"（`unavailable`），不虚构 0 fail。
- **影响面分析（v1.2 新增）**：Sprint Planning 为每个 unit 扫描涉及文件的 imports/引用方，plan.md 单元表新增「影响面」列（`low` / `med` / `high` / `unknown`），high 项在拆分确认时显式标出，`unknown`（无法解析）不得静默猜测。
- **AC↔测试点覆盖校验（v1.2 新增）**：Inception 完成、phase→gate1 转移时，guard-gates hook 机械比对 prd.md 的 AC 编号集合与 test-strategy.md 的「映射 AC」列——缺口（AC 无测试点）或幻影（映射引用不存在的 AC）一律 deny，不可测需求进不了 Gate#1。
- 十个角色子代理：六个生产角色 `pm` / `architect` / `dev` / `qa` / `tea` / `verifier` + 四个**只读互审角色** `reviewer-pm` / `reviewer-architect` / `reviewer-qa` / `reviewer-dev`（无 Edit/Write 工具，互审只读是机制保证不靠提示词）。
- Hooks（共 6：5 守卫 + 1 路由）守卫：`.env`/密钥路径写拦截（deny）、Gate#1 前禁写 Construction 工件（deny）、TDD 锁（deny，可按 `tddLockPaths` 限定范围）、门控回执校验（`GATE-APPROVED`/`GATE-REJECTED` 轮次语义）、state.json/decisions.md 只追加+乐观锁+禁 Edit、损坏 state.json fail-closed、**（v1.2）AC↔测试点覆盖校验**（phase→gate1 转移时机械比对，缺口/幻影 deny）、**（v1.2）state.json 覆写键保留**（整体覆写丢失既有 `route`/`testBaseline`/`unitStatus`/`tddLock`/`tddLockPaths` 键 deny，值变更放行）、Stop 审计日志、SessionStart 状态预热注入；另有 `auto-route.mjs`（UserPromptSubmit，v1.1）只注入路由上下文、不拦操作。
  **定位声明**：hooks 是流程约束（防手滑/强制仪式），不是安全边界；强边界请放 CI/分支保护层。

## 安装（ZCode）

**前置要求**：Node.js ≥ 16（hooks 通过 PATH 上的 `node` 运行；缺失时 hook 报错 = 守卫静默失效）。

本地目录方式：

```
zcode plugins marketplace add D:\OneDrive\CodingMem\aidlc-zcode
zcode plugins install aidlc@aidlc-zcode
```

或在 ZCode 客户端 **Plugin Marketplace → Add** 粘贴本仓库路径/GitHub URL。

## 使用

```
/aidlc:inception 给内部工具加一个导出 CSV 的功能
/aidlc:status
/aidlc:gate
/aidlc:construct
/aidlc:ops
/aidlc:resume
```

自动路由（可选，默认关）：`/aidlc:on` 开启后直接说"给内部工具加一个导出 CSV 的功能"即可，无需敲命令；`aidlc off` 或 `/aidlc:off` 关回显式命令模式。

## 开发

- 插件源码：[plugins/aidlc/](plugins/aidlc/)
- 发布自检一键脚本（node 探测 + hook 语法 + 回归四套件 115 检查（守卫 28 / 自动路由 23 / route 分级 15 / 覆盖校验 49）+ validate + 三列表；**hook 脚本语法错误 = fail-open 静默失去保护**，必须检查）：
  ```
  bash scripts/check-plugin.sh
  ```
- CI：push/PR 自动跑守卫回归套件（`.github/workflows/plugin-tests.yml`）。
- 更新插件需 **bump version**（`plugin.json` 与 `marketplace.json` 同步改）才会触发 update；**更新/卸载插件后重启 ZCode**，否则运行中的会话仍挂着旧 hook（会持续报 hook.run.failed）。
- 发布到 GitHub：`scripts/publish-github.sh`（需 `gh auth login` 一次）。

## 状态

v1.2（unreleased，未发布）—— **规模分级路由 + 交付质量三件套**。① 规模分级路由：接入确认时 AI 提议 `express` / `classic` 两档、一次确认后 `route` 字段记入 `state.json`（缺失/非法按 classic 全量兜底；express 只裁文档与评审轮次，机制强制项零裁剪）；② 测试基线：Construction 第 0 步记录（总数/pass/fail + 命令），新失败 = 回归、存量失败不误判，命令失败显式记 `unavailable` 不虚构 0 fail；③ 影响面分析：plan.md 单元表「影响面」列（low/med/high/unknown）；④ AC↔测试点覆盖校验：phase→gate1 转移时 guard-gates 机械比对（缺口/幻影 deny），另加 state.json 覆写键保留校验（五保留键）。存量 intent（v1.0/v1.1）零行为变化：无 route 字段按 classic 走、无基线退化为现状、不强制补跑新校验。回归扩为四套件 **28+23+15+49 = 115 检查**（`scripts/tests/` 下 guard-gates / auto-route / route-profile / ac-coverage），另附 T50/T51 真实会话 smoke。本条目为文档同步（Gate#2 打回修订 R1 的 B1 项）：**本次 README 与 docs/index.html 的改动只更新说明文字，不改变任何 hook/skill 运行时行为**；版本号 bump 由发布流程负责。

v1.1.0 —— **自动路由模式**。`/aidlc:on|off` 或自然语言 "aidlc on/off" 切换（默认关，升级零行为变化）；开启后自然语言直接进流程，附三重人工确认：意图接入确认、超范围输入三选、单元拆分确认（仅自动路由入口）；门禁与全部守卫不受开关影响。新增 UserPromptSubmit hook（`auto-route.mjs`），回归 23 场景（`scripts/tests/auto-route.test.mjs`）。

v1.0.0 —— **正式版**。v0.3.0 全部新机制经真实会话 smoke 验证：4 个 reviewer 角色并行互审（抓出预埋缺陷）、GATE-REJECTED 打回→修订→新回执重审全链路、decisions.md 纯 Write 追加链（零 Edit）、`/aidlc:archive` 终止归档；TDD 锁范围改并集累积；回归 28 场景。

v0.3.0 —— 二轮审核修复：审计文件禁 Edit（防 old_string 篡改历史）、门控回执轮次语义（打回后旧回执作废）、损坏 state.json fail-closed（可修复不自锁）、TDD 锁按 `tddLockPaths` 限定作用域、isTestFile 补 Java/C#/Ruby/Rust 惯例、路径匹配大小写不敏感、只读 reviewer 角色系列、`/aidlc:archive` 终止协议、CI 回归、Node 前置声明。

v0.2.0 —— **全生命周期实战验证完毕**（inception→gate1→construction→gate2→operations→done 闭环跑通）。含配额降级协议（SKILL §8）、per-unit 断点续跑（state.json unitStatus）、verifier 检查清单固化（双查计划外文件）。

## License

MIT

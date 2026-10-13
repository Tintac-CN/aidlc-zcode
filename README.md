# aidlc-zcode

> 🏠 **主页/教程**：https://tintac-cn.github.io/aidlc-zcode/ （介绍 · 安装 · 快速开始 · 完整生命周期教程 · 命令参考 · FAQ）

把 AWS **AI-DLC**（AI-Driven Development Life Cycle）方法论以 **ZCode 原生插件**落地：三阶段双门控流水线 + 角色子代理 + 工件链审计 + 流程守卫。

> 设计定稿：[docs/design.md](docs/design.md)（v1.0，含 D1–D10 决策清单与 POC 判定表）
> POC 参照实现：[poc/aidlc-poc/](poc/aidlc-poc/)（机制验证用，已冻结）

## 工作流

```
/aidlc:inception <意图>     → 并行产出 PRD / 架构 / 测试策略
  ═══ Gate#1 设计门 ═══      → AI 互审（party-review）+ 人类审批
/aidlc:construct            → 拆 units、TDD 锁、并行实现
  ═══ Gate#2 交付门 ═══      → 互审 + verifier 终检 + 人类审批
/aidlc:ops                  → 监控/部署 + 事件回流闭环
```

- 工件落 `docs/aidlc/<slug>/`，一工件一提交 = 审计链；`state.json` 支持跨会话续跑。
- 十个角色子代理：六个生产角色 `pm` / `architect` / `dev` / `qa` / `tea` / `verifier` + 四个**只读互审角色** `reviewer-pm` / `reviewer-architect` / `reviewer-qa` / `reviewer-dev`（无 Edit/Write 工具，互审只读是机制保证不靠提示词）。
- Hooks 守卫：`.env`/密钥路径写拦截（deny）、Gate#1 前禁写 Construction 工件（deny）、TDD 锁（deny，可按 `tddLockPaths` 限定范围）、门控回执校验（`GATE-APPROVED`/`GATE-REJECTED` 轮次语义）、state.json/decisions.md 只追加+乐观锁+禁 Edit、损坏 state.json fail-closed、Stop 审计日志、SessionStart 状态预热注入。
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

## 开发

- 插件源码：[plugins/aidlc/](plugins/aidlc/)
- 发布自检一键脚本（node 探测 + hook 语法 + 守卫回归 26 场景 + validate + 三列表；**hook 脚本语法错误 = fail-open 静默失去保护**，必须检查）：
  ```
  bash scripts/check-plugin.sh
  ```
- CI：push/PR 自动跑守卫回归套件（`.github/workflows/plugin-tests.yml`）。
- 更新插件需 **bump version**（`plugin.json` 与 `marketplace.json` 同步改）才会触发 update；**更新/卸载插件后重启 ZCode**，否则运行中的会话仍挂着旧 hook（会持续报 hook.run.failed）。
- 发布到 GitHub：`scripts/publish-github.sh`（需 `gh auth login` 一次）。

## 状态

v0.3.0 —— 二轮审核修复：审计文件禁 Edit（防 old_string 篡改历史）、门控回执轮次语义（打回后旧回执作废）、损坏 state.json fail-closed（可修复不自锁）、TDD 锁按 `tddLockPaths` 限定作用域、isTestFile 补 Java/C#/Ruby/Rust 惯例、路径匹配大小写不敏感、只读 reviewer 角色系列、`/aidlc:archive` 终止协议、CI 回归、Node 前置声明。

v0.2.0 —— **全生命周期实战验证完毕**（inception→gate1→construction→gate2→operations→done 闭环跑通）。含配额降级协议（SKILL §8）、per-unit 断点续跑（state.json unitStatus）、verifier 检查清单固化（双查计划外文件）。

## License

MIT

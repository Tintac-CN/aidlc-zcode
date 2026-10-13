# aidlc-zcode

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
- 六个角色子代理：`pm` / `architect` / `dev` / `qa` / `tea` / `verifier`（约束前置在各自定义中）。
- Hooks 守卫：`.env`/密钥路径写拦截（deny）、TDD 锁下测试文件改动警告、Stop 审计日志、SessionStart 状态预热注入。
  **定位声明**：hooks 是流程约束（防手滑/强制仪式），不是安全边界；强边界请放 CI/分支保护层。

## 安装（ZCode）

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
- 发布自检（`plugins validate` 不查组件路径，必须跑三条 list）：
  ```
  zcode plugins validate plugins/aidlc
  zcode plugins list | grep aidlc
  zcode skills list | grep aidlc
  zcode commands list
  ```
- 更新插件需 **bump version**（`plugin.json` 与 `marketplace.json` 同步改）才会触发 update。
- 发布到 GitHub：`scripts/publish-github.sh`（需 `gh auth login` 一次）。

## 状态

v0.1.0 —— v1 里程碑（Inception→Gate#1 端到端）。Construction/Operations 已有骨架，待实战打磨。

## License

MIT

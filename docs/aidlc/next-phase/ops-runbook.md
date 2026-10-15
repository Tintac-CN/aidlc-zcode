# Ops Runbook: next-phase（AIDLC 插件 v1.2）

> 产出者：编排者（Operations 阶段）　日期：2026-10-15　前置：gate2 approved（GATE-APPROVED gate2 2026-10-15）
> 本 intent 交付物为 ZCode 插件（无服务端），监控面 = GitHub CI + 用户报告渠道。SLA/阈值/发布窗口以 decisions.md 2026-10-15 Operations 人类裁决为准。

## 可观测面与监控

- **GitHub Actions CI**（`.github/workflows/plugin-tests.yml`）：push/PR 自动跑——node 探测 + hook 脚本语法（`node --check`）+ manifest validate + 三列表发现 + 四套件回归（guard-gates 28 / auto-route 23 / route-profile 15 / ac-coverage 50 = 116）。**hook 脚本语法错误 = fail-open 静默失去保护**，故 CI 的语法段是最高优先监控点。
- **本地自检**：`bash scripts/check-plugin.sh`（发布前必跑，口径与 CI 一致）。
- **用户报告渠道**：GitHub issues；典型信号——`hook.run.failed`（插件更新/卸载后未重启 ZCode 时运行中的会话挂旧 hook，属已知噪声，排查时先问是否重启）、守卫未触发（预期 deny 却放行——疑似 hook 注册/语法问题，按 P0 处理）、F4 误 deny（映射列记法漂移被整格剔除造成缺口误报——修复路径是改正工件，非绕过守卫）。

## 告警阈值与响应 SLA（人类裁决 2026-10-15）

| 事件级别 | 定义 | 响应 |
|---|---|---|
| **立即** | CI 红（plugin-tests.yml 任一段失败）；用户报告 hook 失效/守卫未触发 | 当日修复或回滚（git revert + bump 补丁版本） |
| **周处理** | 其他 issue、文档过时、增强请求 | backlog 排期 |

## 发布流水线

1. **发布前**：`bash scripts/check-plugin.sh` 全绿；README.md 与 docs/index.html 描述与实际能力/计数一致（v1.2 教训：计数漂移曾造成 AC5.1 违例——发布前 grep 核对套件计数）。
2. **版本 bump**：`plugins/aidlc/.zcode-plugin/plugin.json` 与 `marketplace.json` 同步改版本号（不一致不触发 update）。
3. **提交推送**：CI 绿为准入；GitHub Pages 站点（docs/index.html）随发布同步。
4. **用户侧升级**：`zcode plugins update aidlc@aidlc-zcode`（或应用内插件市场更新）+ **重启 ZCode**（否则运行中的会话仍挂旧 hook，持续报 hook.run.failed）。

## 回滚策略

- 代码级回滚：`git revert <commit>` + bump 补丁版本（如 1.2.1）发布。
- 契约级风险（F4/TDD 锁/preserveKeys 等守卫行为回归）：**优先回滚而非热修**——守卫失效期间的全部写路径失去审计保护，窗口越短越好。
- 数据/状态风险：用户项目内 `docs/aidlc/<slug>/state.json` 由守卫的 history 乐观锁与 preserveKeys 保护；如修复需动 state 结构，必须随补丁版本提供迁移说明。

## 事件响应流程

1. 复现（CI 日志 / 用户最小复现仓库）。
2. 判定级别（上表）；立即级事件当日给出修复或回滚。
3. 修复走 TDD：失败测试先行 →（必要时）TDD 锁 → 实现至绿 → 四套件全绿发布。
4. 事后：**生产事件与学习写新 intent 的 intent.md**（不在已完结 intent 上追加）；值得流程化改进的进 backlog 或下轮调研。

## 已知技术债（截至 v1.2.0）

- route 回显消毒（控制字符）、P 侧左边界、routeEcho 抽取复用、`.zcode/` 目录 gitignore——登记于 gate2 R1 记录，均非阻塞项。
- 文档套件计数表述建议弱化（"四套件（guard-gates/auto-route/route-profile/ac-coverage）"替代绝对数字，避免每次场景增减引发连锁同步）。

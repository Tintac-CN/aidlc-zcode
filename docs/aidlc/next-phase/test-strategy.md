# Test Strategy: next-phase

> 产出者：qa　日期：2026-10-14　来源：intent.md + prd.md　修订：对齐拍引用回填与裁决同步（AC 语义与既有测试点行为描述不变）

## 测试点清单

| # | 映射 AC | 场景（正/负路径） | 层级 | 优先级 |
|---|---|---|---|---|
| T01 | AC1.1 | 正：新 intent 接入，AI 按规模提议 express，人确认后 state.json 写入 route=express 且 history 追加一条路由决策记录 | 单元 | P0 |
| T02 | AC1.1 | 正：大规模输入提议 classic，确认后写入 route=classic；两条路线的写入结构一致 | 单元 | P1 |
| T03 | AC1.2 | 负：存量 intent 的 state.json 无 route 字段——session-context / auto-route / guard-gates 三个 hook 的输出与 v1.1 完全一致（零行为变化，opt-in 惯例延续） | 单元 | P0 |
| T04 | AC1.3 | 负：用户拒绝 AI 提议的路线——不得写入 route 字段、不得进入分级后的简化流程；再次提议必须重新走确认 | 单元 | P0 |
| T05 | AC1.4 | 负：route=express 生效时，guard-gates 的回执门控（R3 无回执 DENY / 过期回执 DENY）与 TDD 锁（R2 锁内测试文件 DENY）仍然全部拦截——express 不削弱任何守卫 | 单元 | P0 |
| T06 | AC1.4 | 负：route 字段为非法值/错误类型（如 `"route": "turbo"`、`"route": 1`）——按 classic 兜底或忽略该字段，hook 不崩溃、不 fail-open | 单元 | P1 |
| T07 | AC1.4 | 负：路线中途变更（express→classic）——state.json 的 R4 history 乐观锁与 R6 Edit 拒绝语义不变，变更须留痕 | 单元 | P2 |
| T08 | AC1.5 | 负：`autoRouting=false` / `config.json` 缺失 / JSON 畸形三类配置——A1 接入不注入路由提议、不弹路线确认，state.json 不含 route 字段，流程与 v1.1 行为完全一致 | 单元 | P0 |
| T10 | AC2.1 | 正：Construction 第 0 步执行约定测试命令并记录基线（total/pass/fail + 时间戳）到约定工件位置，格式可被后续比对机器读取 | 单元 | P0 |
| T11 | AC2.2 | 正：变更后重跑并 diff 基线——新出现的失败标记为回归；基线中已存在的失败不标记为回归 | 单元 | P0 |
| T12 | AC2.3 | 负：基线记录时测试命令本身失败（非零退出 / 命令不存在 / 超时）——显式记录"基线不可用"并告警，不得静默当作 0 fail 通过 | 单元 | P0 |
| T13 | AC2.3 | 负：比对时基线文件缺失或损坏——显式报错，不得视为"全部通过、无回归" | 单元 | P1 |
| T14 | AC2.2 | 负：基线与重跑之间测试总数变化（新增用例）——计数口径明确：新增 pass 不算回归，新增 fail 算回归，总数变化本身有说明 | 单元 | P1 |
| T15 | AC2.4 | 负：存量 intent（无基线工件）执行 resume——不要求回填基线、不弹确认、不阻断，续跑行为与现状一致 | 单元 | P0 |
| T20 | AC3.1 | 正：对夹具仓库执行影响面扫描，输出受影响文件 + 引用方清单；unit 模板含影响面列且取值限定 low/med/high | 单元 | P1 |
| T21 | AC3.2 | 负：巨型仓库（构造大规模文件数/深引用链夹具或 mock）——扫描在时限内完成或按上限截断并显式声明截断，不得 OOM / 挂死 / 静默漏报 | 单元 | P1 |
| T22 | AC3.3 | 负：扫描途中遇不可解析文件 / 二进制 / 循环软链——跳过并计数，不中断整体扫描 | 单元 | P2 |
| T23 | AC3.2 | 正：分级正确性——多引用方文件判 high，孤立文件判 low，中间档判 med | 单元 | P2 |
| T24 | AC3.4 | 负：影响面扫描整体不可用（工具缺失 / 环境异常）——Sprint Planning 降级为现状行为（无影响面列），plan.md 注明降级事实，不得阻断 Construction 起步 | 单元 | P0 |
| T30 | AC4.1 | 正：PRD 的 AC 编号全集均被测试点映射——校验通过并输出覆盖关系 | 单元 | P0 |
| T31 | AC4.2 | 负：某 AC 无任何测试点映射——检出缺口并输出 BLOCKER（含缺失 AC 编号清单），不得降级为警告 | 单元 | P0 |
| T32 | AC4.3 | 负：测试点映射了 PRD 中不存在的 AC 编号（陈旧映射）——检出并告警，防止"假覆盖" | 单元 | P1 |
| T33 | AC4.1 | 负：AC 编号重复或格式非法——检出，不误判为已覆盖 | 单元 | P2 |
| T34 | AC4.4 | 负：存量 intent 已处于 construction 或更后阶段 resume——不强制补跑 AC 覆盖校验；该校验仅约束此后新建 / 修订的 Inception 工件 | 单元 | P1 |
| T40 | AC1.2 / 全局 | 负（回归底线）：guard-gates 28 场景 + auto-route 23 场景全绿——F1-F4 任何改动不得破坏存量守卫与路由语义 | 集成 | P0 |
| T41 | AC1.1–AC4.4（全量回归） | 正：check-plugin.sh 纳入全部新增测试套件；plugin-tests.yml CI 同步执行（新套件进 §2 回归段） | 集成 | P1 |
| T42 | AC4.2 | 正：F4 覆盖校验接入真实链路（guard-gates.mjs 在 phase→gate1 转移时机械校验），对本仓库 docs/aidlc/next-phase/ 工件（首个 dogfood 对象）跑通，BLOCKER 真实阻断流程 | 集成 | P1 |
| T50 | AC1.1–AC4.4 | 正：真实会话 smoke——新 intent 走 规模提议→人确认→基线记录→影响面→AC 覆盖校验→gate1 全闭环 | E2E（需人工） | P1 |
| T51 | AC1.2 | 负：真实会话打开存量 intent 续跑——无路由提议打扰、守卫行为与升级前一致 | E2E（需人工） | P2 |

## 分层策略

- **单元**：F1–F4 的全部新逻辑落地为 `.mjs` 纯函数/hook 脚本，测试沿用现有夹具风格——`os.tmpdir()` 临时目录 + `cp.execSync` 子进程喂 stdin JSON、断言 stdout/exit code（参照 guard-gates.test.mjs / auto-route.test.mjs）。建议新增套件：`scripts/tests/route-profile.test.mjs`（F1）、`test-baseline.test.mjs`（F2）、`blast-radius.test.mjs`（F3）、`ac-coverage.test.mjs`（F4）。**不测**：LLM 提议质量与措辞（属 prompt 工程，走人工评审）、真实大仓库扫描（用夹具/mock 替代）。
- **集成**：check-plugin.sh 扩展跑全部新套件并保留存量两套件；plugin-tests.yml 的 CI 步骤同步纳入；F4 校验以本 intent 自身工件做 dogfood 首跑。**不测**：hook 内部分支（单元层已覆盖），集成层只验链路与退出码。
- **E2E**：核心闭环（tea 在 Construction 细化）——真实 ZCode 会话人工 smoke，覆盖 T50/T51 两条；CI 无法覆盖真实会话，依赖人工执行并记录结果。

## 缺口与开放问题

### 已裁决（对齐拍同步，原开放项关闭）

- [x] **基线存储位置**：已裁决——基线存 `state.json.testBaseline`（单一事实源），T10/T13 实现形态以此为准。
- [x] **F4 校验的强制点**：已裁决——guard-gates.mjs 在 phase→gate1 转移时机械校验（缺口 deny / 不可解析 allow），T42 按此编写。

### 开放问题（保留待裁决）

- [ ] **express 路线的门控弱化边界（触及 §0 守卫承诺）**：若 PRD 拍板 express 可跳过 gate 回执或 TDD 锁，将违反 design.md D2/D3 与 state.mjs 注释"routing can be turned off, guards cannot"的既定语义。T05 当前按"仍强制"编写；若裁决弱化，该测试点须重写且必须由人类显式裁决留痕——这是本策略最大的开放风险。
- [ ] **基线命令失败的语义未定**：阻断 Construction 还是降级告警继续？T12 按"显式记录不可用 + 告警"占位，待 PRD/architect 裁决后可能需要加严为阻断。
- [ ] **"巨型仓库"无量化标准**：T21 需要 PRD 给出性能预算（文件数上限 / 时限阈值），否则只能测"不挂死"，无法测"够快"。
- [ ] **flaky 测试的基线比对口径未定义**（重试 / 标记 / 计入？），T14 只覆盖计数变化场景，flaky 场景待 PRD 补充后增补测试点。
- [ ] **E2E 依赖人工**：T50/T51 无法进 CI，需 tea 在 Construction 细化执行脚本与记录格式；若本期无人力执行，两条 E2E 将沦为声明式覆盖。

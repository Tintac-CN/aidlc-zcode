# Plan: next-phase

> 产出者：编排者（Sprint Planning）　日期：2026-10-14　前置：gate1 approved（GATE-APPROVED gate1 2026-10-15）
> 验证命令（AC2.5 规范来源）：本单元声明 `node scripts/tests/guard-gates.test.mjs` 与 `node scripts/tests/auto-route.test.mjs` 分立执行（POSIX/Windows 通用），后续新增套件按 T41 纳入 check-plugin.sh §2。

## 测试基线（F2，Construction 第 0 步记录）

- 记录时间：2026-10-14T16:53Z　基线提交：52b85b4
- 命令：`node scripts/tests/guard-gates.test.mjs`（28 pass / 0 fail）；`node scripts/tests/auto-route.test.mjs`（23 pass / 0 fail）——分立执行，尾行交叉核对一致
- state.json.testBaseline 已同步（suites 限定比对范围；本 intent 新增套件按决策 #6 排除在回归比对外）

## Units

| # | Unit | 目标 | 涉及文件 | 影响面 | 测试 | 验收 |
|---|---|---|---|---|---|---|
| U1 | 附带条件与规格收口（GATE-APPROVED 附带条件 1-3） | architecture.md 补场景 17（注记格）+ 整 token 全匹配语义钉死 + m-e 句改写 + 计数 17 连锁 + route-profile 行声明；test-strategy T40 计数/L68 登记/T54 限定/T53/T55/T56 行号；prd 头部补 R3 记录行 | docs/aidlc/next-phase/architecture.md、test-strategy.md、prd.md | med（规格源，U2 实现与 ac-coverage 断言依赖；引用方=本 intent 角色） | 人工核对 + 编排者预检（差异对清单） | 决策所列附带条件逐条在盘；scenario 17 与整 token 语义可被 U2 测试引用 |
| U2 | F4 机械校验 + R4 键保留（机制层核心） | guard-gates.mjs：phase→gate1 转移时映射列提取比对（双粒度/整格剔除/占位排除/前缀匹配/T−P deny/缺失 deny/不可解析 allow+披露）+ 绕过路径 a/c 封堵 + preserveKeys 键保留扩展（R4 同构） | plugins/aidlc/hooks/scripts/guard-gates.mjs | high（存量守卫核心；引用方=guard-gates.test.mjs 28 场景、CI、全部门流程；改坏=守卫失效） | ac-coverage.test.mjs（TDD 先行）+ 存量 28 场景不破坏 | 新套件全绿 + 存量 28 全绿 + 本 intent 工件 dogfood（模拟转移不 deny） |
| U3 | F1 route 回显（机制层） | auto-route.mjs 路由契约头追加 `route=` 只读回显（三态语义：缺失不追加/非法 `route=<原值>(invalid→classic)`/合法原样）；session-context.mjs 同构追加 | plugins/aidlc/hooks/scripts/auto-route.mjs、session-context.mjs | med（引用方=auto-route.test.mjs 23 场景 + session-context 段） | route-profile.test.mjs（TDD 先行）+ 存量 23 场景不破坏 | 新套件全绿 + 存量 23 全绿 + 缺失 route 时输出与 v1.1 字节级一致（T03） |
| U4 | 协议文档改造（prompt 层全量触点 1-11） | SKILL.md（§2 route/testBaseline/覆写保留/§3 分级接入+A1 扩展+Construction 第 0 步与验证+对齐拍语义+影响面步骤/§4 resume 对账与显示/§7 plan 模板加列）+ inception.md/gate.md 真值表/construct.md/status.md/resume.md/ops.md retro 分支 + party-review SKILL 工件清单按 route + dev.md 必读清单 | plugins/aidlc/skills/aidlc/SKILL.md、commands/aidlc/{inception,gate,construct,status,resume,ops}.md、skills/party-review/SKILL.md、agents/dev.md | high（协议源文件，全部命令运行时引用；无机制测试——按架构触点清单 1-11 逐点施工可控） | 流程评审（gate2 互审 + E2E smoke T50） | 触点 1-11 逐点落盘；与 U2/U3 机制行为表述一致；存量 intent 语义零变化声明在位 |
| U5 | 集成接线与 E2E 清单 | check-plugin.sh §2 增 route-profile/ac-coverage 两行（第四步裁决落地 m-R4-4）；plugin-tests.yml 同步；T50/T51 smoke 执行清单（ tea 细化步骤与记录格式） | scripts/check-plugin.sh、.github/workflows/plugin-tests.yml、docs/aidlc/next-phase/smoke-checklist.md（新） | med（引用方=发布流程、CI；改坏=自检失真） | bash check-plugin.sh 实测（含新套件四行） | 自检全链路绿（node 探测+语法+四套件+validate+三列表）；smoke 清单可操作 |

## 执行顺序与并行泳道

- **U1（编排者内联，decisions.md 2026-10-15 已认领附带条件）** → 完成后放开并行：
- 泳道 A（dev）：U2（TDD：先写 ac-coverage.test.mjs 失败测试→置锁→实现至绿）→ U3（同法 route-profile.test.mjs）
- 泳道 B（architect）：U4（依赖 U1 规格终版，与泳道 A 并行）
- 泳道 C（tea）：U5（依赖 U2/U3 套件存在；smoke 清单产出后由人类在 Gate#2 前执行 T50/T51）
- TDD 锁范围（预计）：`scripts/tests/ac-coverage.test.mjs`、`scripts/tests/route-profile.test.mjs`（失败测试提交后置锁，并集累积）

## TDD 锁记录

- 失败测试提交：<待 U2/U3 测试提交后回填>　置位：<待 /aidlc:lock-tests 后回填>

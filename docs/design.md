# AIDLC-ZCode 集成设计（定稿 v1.0）

> 版本：v1.0（定稿）　日期：2026-10-13
> 前序：v0.1 初稿 → v0.2 POC 修订 → **v1.0 定稿**（POC 端到端验证通过，3 项假设推翻后修订）
> 定位：把 AWS AI-DLC 方法论以 **ZCode 原生插件**形式落地；团队经本地 marketplace 安装使用。
> POC 参照实现：`plugins/aidlc-poc/`（已安装为 `aidlc-poc@dev-aidlc-poc` v0.1.1，其 SessionStart 注入与 `poc-verifier` 子代理已在真实会话中激活）。

---

## 0. 定稿决策清单（D1–D10）

| # | 决策 | 依据 |
|---|---|---|
| D1 | 实现基座 = **自包含 ZCode 插件**；BMAD/AIDLC 只贡献模式，不作运行时依赖 | BMAD v7 仍 alpha；POC 证明原生机制足够 |
| D2 | 门控语义一律用 **`deny` / `exit-2`**，禁用 `ask` | POC：headless 下 `ask` 无 permission client 退化为软拒绝，agent 绕走 Bash |
| D3 | hooks 定位 = **流程约束（限速带）**，非安全边界；强边界放 CI/分支保护/OS 沙箱 | POC：子串匹配可被运行时构造路径绕过 |
| D4 | 写保护锁 **`Edit\|Write` 的 `file_path` 结构化字段**；读写分档，只拦写不拦读 | POC：Bash 文本匹配既可绕过又误拦 `ls`/`cat` |
| D5 | 互审 = **Agent 工具并行扇出**；dynamic workflows 仅作 Construction 并行泳道可选项 | 杀鸡不用牛刀；扇出已实测可调度 |
| D6 | 不依赖 `disable-model-invocation`（**不支持**）；触发控制靠命令不绑定 skill + description 措辞 | POC：bundle 计数 0 |
| D7 | 插件根路径：hook 内用 `CLAUDE_PLUGIN_ROOT`（env 有值）；skill/脚本内用 **skill base directory**（metadata 前导给出），**不从 Bash env 读** | POC：该变量只在 hook 进程有值 |
| D8 | 工件落 `docs/aidlc/<slug>/` + `state.json` 跨会话续跑；一工件一提交 = 审计链 | Anthropic playbook 工件链模式 |
| D9 | 配置三层 = 插件基座 → workspace（`AGENTS.md` + `.zcode/`）→ user（`~/.zcode/`） | ZCode 原生 discovery 顺序，语义同 BMAD 三层 |
| D10 | BMAD 钉 v6.12 模式作参照；`awslabs/aidlc-workflows` 引擎列为 v2 企业级演进 | 调研结论 |
| D11 | **auto-route = opt-in 路由注入**：开关存项目级 `docs/aidlc/config.json`（缺失/畸形一律视为 off）；UserPromptSubmit hook 只**注入路由契约**、不做分类、不写文件——判定、确认表单与 config 写入全部由模型执行；开关短语由 hook 确定性正则预筛（短输入 ≤80 字符），误匹配由模型侧二次判定兜底；**开关只控路由注入，守卫 hook 不读开关** | 升级零行为变化（升级安全）；hook 误判不可逆所以只注入；路由（便利层）与守卫（约束层）职责分离 |

---

## 1. 方案评审记录（v0.1 → v0.2）

对"BMAD 骨架 + AI-DLC 门控 + Anthropic 守卫"原方案的评审结论：

| # | 原设计 | 问题 | 修订 |
|---|---|---|---|
| R1 | 靠 `npx bmad-method install` 装配 BMAD 运行时 | v7 alpha、v6 安装器写大量自有目录，绑定第三方运行时 | 不依赖 BMAD 安装器，原生重实现其**模式**（→ D1） |
| R2 | dynamic workflows 编排互审 | 重型机制，需用户确认脚本 | 降级为 Agent 扇出（→ D5） |
| R3 | 角色 agent 能否随插件分发（未确认） | 不确定性 | **POC 证实可行** ✅ |
| R4 | hooks 迁入 `.zcode/config.json` 且需 `hooks.enabled:true` | 那是配置式 hooks 的要求 | 插件 hooks **自动启用**，零配置 ✅ |
| R5 | hook 原始 stdout 注入上下文 | stdout 走**严格 JSON 校验** | 改用 `hookSpecificOutput.additionalContext` ✅ |
| R6 | 未区分个人/团队覆盖 | ZCode 有原生多级 discovery | 用原生机制实现三层（→ D9） |

**保留**：三层分离定位（方法论/实施框架/运行时）、工件链+门控核心、skills 管一致性 + hooks 管强制性。

## 2. POC 验证记录（2026-10-13）

**方法**：逆向 CLI bundle（`resources/Kimi/zcode.cjs`）取得精确 schema → 搭 `aidlc-poc` 插件（1 skill / 1 command / 1 subagent / 4 hooks）→ 本地 marketplace add/validate/install/update 全链路 → **headless `zcode -p` 端到端实测** → 真实会话激活复验。

**判定表**：

| 假设 | 判定 | 证据 |
|---|---|---|
| 插件可带 skills/commands/agents/hooks 且全部被发现执行 | ✅ 成立 | `plugins list`: skills:1, commands:1, hooks:4；本会话可见 `poc-verifier` agent 类型与 SessionStart 注入 |
| 命令嵌套目录 → `/ns:cmd`；`$ARGUMENTS` 替换 | ✅ 成立 | `commands list` 显示 `/aidlc-poc:run [anything]`；bundle 含 `$ARGUMENTS`/`$\d` 替换与 `` !`cmd` `` 注入 |
| 插件 subagent 可被主 agent 调度，tools 限制生效 | ✅ 成立 | `poc-verifier`（`tools:[Read]`）返回定长结论行，无 shell 可用 |
| 插件 hooks 自动启用（无需 `hooks.enabled`） | ✅ 成立 | 未改任何 config，4 hooks 全部触发 |
| PreToolUse `deny` 在 yolo 下硬阻断 | ✅ 成立 | 守卫 deny 后 Write 未落盘；**hook 优先级高于 yolo** |
| `exit-2` 硬阻断 | ✅ 成立 | 同样拦截，文件未创建 |
| SessionStart `additionalContext` 注入模型上下文 | ✅ 成立 | 模型逐字引用注入文本；本轮真实会话亦出现 |
| Stop hook 触发且 stdin 含响应全文 | ✅ 成立 | 捕获 `responseText`/`toolCallCount` 等 |
| hook 进程有 PLUGIN_ROOT/PROJECT_DIR env 且继承父 env | ✅ 成立 | env 捕获文件实测有值；自设 `AIDLC_GUARD_MODE` 可传入 |
| `disable-model-invocation` | ❌ 推翻 | bundle 计数 0（→ D6） |
| `ask` 决策可用 | ❌ 推翻 | headless 无 permission client → 软拒绝 + agent 绕走 Bash（→ D2） |
| hooks 是安全边界 | ❌ 推翻 | 运行时构造路径（`f="poc""-prot""ected"".txt"`）绕过并落盘；误拦只读 `ls`/`cat`（→ D3/D4） |
| `plugins validate` 查组件路径 | ⚠️ 不查 | `skills:"C:/outside"`、`"../../escape"`、不存在目录均判 valid；只查 JSON+name 正则 |
| headless CLI 可用于自动化 | ✅ 成立 | `zcode -p "..." --mode yolo` 全程可用 |

**POC 未覆盖（留给 v0 地基实测）**：Stop 的 `continue`/block 续跑交互；`PermissionRequest` 事件与 `permission_suggestions`；PreToolUse `updatedInput` 改写工具输入；Desktop 交互式 `ask` 呈现；项目级 subagents 目录位置。

## 3. 设计目标与范围

**目标**：① `/aidlc` 系列命令驱动可复现流水线：Inception → Gate#1 → Construction → Gate#2 → Operations；② 每阶段产出结构化工件并提交，形成审计链；③ 门控两层：AI 互审（快、抓硬伤）+ 人类审批（慢、判语义）；④ 约束前置 + 确定性拦截（流程级）；⑤ 团队可安装、版本化，个人可覆盖。

**范围**：交付 ZCode 插件 `aidlc` + 本地 dev marketplace；覆盖 greenfield 与 brownfield（先扫出 context card）。

**非目标**：重型 Web 协作平台（`sample-collaborative-ai-dlc`）；引擎级 33-stage 状态机（`aidlc-workflows`，列 v2 演进）；替代 CI/CD 或代码审查系统。

## 4. 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│  用户入口（ZCode 会话）                                        │
│   /aidlc:inception  /aidlc:construct  /aidlc:gate  /aidlc:ops  │
└───────────────┬─────────────────────────────────────────────┘
                │  命令加载 → 触发编排 skill
┌───────────────▼─────────────────────────────────────────────┐
│  编排层：aidlc 插件（skills + commands + hooks + agents）      │
│  skills/aidlc/            主编排：阶段流转、门控、工件写入       │
│  skills/party-review/     互审编排：Agent 扇出角色 → 汇总       │
│  skills/brownfield-scan/  遗留代码库 → context card            │
│  agents/  pm architect dev qa tea verifier                     │
│  hooks/   guard-paths  guard-tests  audit-log                  │
└───────────────┬─────────────────────────────────────────────┘
                │  产出工件 + 审计事件
┌───────────────▼─────────────────────────────────────────────┐
│  工件层（仓库内，版本化）docs/aidlc/<slug>/                     │
│    intent.md prd.md architecture.md test-strategy.md plan.md  │
│    units/ reviews/ decisions.md audit.log retro.md state.json │
└───────────────┬─────────────────────────────────────────────┘
                │  约束与上下文
┌───────────────▼─────────────────────────────────────────────┐
│  配置层：插件基座 → <repo>/AGENTS.md（团队）→ ~/.zcode/（个人）  │
└─────────────────────────────────────────────────────────────┘
```

## 5. ZCode 能力映射（全部实测）

| 需求 | ZCode 机制 | 实测 |
|---|---|---|
| 入口命令 | `commands/aidlc/*.md` → `/aidlc:inception` 等；frontmatter `description`/`argument-hint`/`skills` | ✅ |
| 命令参数 | 正文 `$ARGUMENTS`（另支持 `$1`、`` !`cmd` ``） | ✅ |
| 编排逻辑 | `skills/<name>/SKILL.md`（frontmatter `name`/`description`） | ✅ |
| 角色 agent | manifest `agents` → `agents/*.md`（frontmatter `name/description/model/thoughtLevel/tools/color`） | ✅ |
| 确定性门控 | 插件 `hooks/hooks.json` **自动启用**；7 事件；`PreToolUse` `permissionDecision` 或 `exit-2` 阻断（优先于 yolo） | ✅ |
| 上下文注入 | `hookSpecificOutput.additionalContext`（SessionStart 等） | ✅ |
| 路径变量 | hooks.json `args` 内 `${CLAUDE_PLUGIN_ROOT}`；hook 进程 env 同名变量 + `CLAUDE_PROJECT_DIR` | ✅ |
| 团队/个人覆盖 | discovery：plugin < workspace < user | ✅（机制确认） |
| 常驻约束 | `<repo>/AGENTS.md`、`~/.zcode/AGENTS.md` | ✅ |
| 分发 | 本地 marketplace（`plugins marketplace add <dir>` → `install` → `update` 需 bump version） | ✅ |
| 自动化验证 | headless `zcode -p "..." --mode yolo` | ✅ |

## 6. 插件目录设计

```
plugins/
  marketplace.json                      # dev marketplace（source: ./aidlc）
  aidlc/
    .zcode-plugin/plugin.json
    skills/
      aidlc/SKILL.md                    # 主编排 skill
      aidlc/stage-protocols.md          # 各阶段仪式
      party-review/SKILL.md             # 互审编排（Agent 扇出）
      brownfield-scan/SKILL.md          # 遗留扫描 → context card
    commands/
      aidlc/
        inception.md  construct.md  gate.md
        ops.md  status.md  resume.md
    agents/
      pm.md  architect.md  dev.md  qa.md  tea.md  verifier.md
    hooks/
      hooks.json
      scripts/
        guard-paths.mjs   guard-tests.mjs   audit-log.mjs
    templates/                          # 工件模板
      intent.md  prd.md  architecture.md  test-strategy.md  plan.md  retro.md
    README.md
```

**`plugin.json`（定稿）**

```json
{
  "name": "aidlc",
  "version": "0.1.0",
  "description": "AI-DLC workflow: inception → gate → construction → gate → operations, with role agents and deterministic guardrails.",
  "description_i18n": { "zh-CN": "AI-DLC 工作流：Inception→门控→Construction→门控→Operations，含角色 Agent 与流程守卫。" },
  "author": { "name": "Your Team" },
  "license": "MIT",
  "skills": "skills",
  "commands": "commands",
  "agents": "agents",
  "hooks": "hooks/hooks.json"
}
```

> 注意（POC 教训）：`plugins validate` **不查**组件路径存在性/包含性——组件路径错误只能在运行时发现（`skills list`/`commands list`/`plugins list`），发布前用这三条命令自检。

## 7. 工作流设计

### 7.1 主流程（一个 intent 的完整生命周期）

```
/aidlc:inception <一句话意图>
  ├─ 解析意图 → docs/aidlc/<slug>/intent.md（问题/期望/受影响系统/约束/开放问题）
  ├─ Agent 并行扇出：pm → prd.md ｜ architect → architecture.md ｜ qa → test-strategy.md
  └─ 产出 → Gate#1

  ═══ Gate#1：设计门 ═══
  ├─ AI 互审（party-review skill）：pm/architect/qa/dev 交叉评审三份工件
  │    → reviews/gate1-ai.md（硬性不一致清单，如"PRD 说 DELETE、架构假设软删、测试期待 404"）
  ├─ 人类审批：AskUserQuestion 表单化（Looks correct / Request changes）
  │    → decisions.md 追加决策记录（rejected/revised 反馈逐字保留）
  └─ 未通过 → 回 Inception 修订（state.json 保留状态，不重来）

/aidlc:construct
  ├─ Sprint Planning：拆 units → plan.md + units/<n>.md
  ├─ 并行实现（每 unit 一条泳道；可选 dynamic workflows）：
  │    dev → TDD（先提交失败测试，guard-tests 锁测试文件）
  │    architect → IaC/基础设施    tea → E2E/性能测试
  └─ 产出 → Gate#2

  ═══ Gate#2：交付门 ═══
  ├─ AI 互审 + verifier agent（新鲜上下文终检，对照 plan.md 查 diff）
  │    → reviews/gate2-ai.md
  ├─ 人类审批 + 实测演示（cdk synth / npm test 干净）
  └─ 通过 → Operations

/aidlc:ops
  └─ 监控配置、告警阈值、部署流水线（人类定 SLA/阈值/窗口）
       → 回流：事件/学习写回 intent.md（闭环）
```

### 7.2 阶段仪式（原子化，不可跳步）

每阶段固定四拍：**提问 → 工件 → 评审 → 门控**。AI 缺信息先 `ask`（对话内提问，非 hook）；产出工件后才评审；评审意见逐字进 `decisions.md`；门控未过不得进下一阶段；**自主权从不推断**——一次"按推荐走"只对该阶段有效。

### 7.3 双层门控分工

| 层 | 谁 | 抓什么 | 成本 |
|---|---|---|---|
| AI 互审 | 角色 agents 交叉 | 硬性不一致、契约冲突、遗漏 | 低（每次工件产出后） |
| 人类审批 | 全角色（人在环） | 语义、业务判断、风险取舍 | 高（仅 Gate 处） |

## 8. 角色 Agent 设计

六个角色，`agents/<name>.md` 随插件分发；约束**前置**写入 agent 正文（BMAD `persistent_facts` 思想）。

| Agent | 职责 | 常驻约束（示例） | tools |
|---|---|---|---|
| `pm` | 意图→PRD、用户故事、验收标准 | MVP 优先；不发明需求；缺信息就提问 | Read, Write, Grep |
| `architect` | 逻辑/物理架构、数据模型、IaC 骨架 | 技术栈锁定不辩论；遵循既有模式（brownfield）；最小权限 | Read, Write, Bash |
| `dev` | TDD 实现，测试即契约 | 先写失败测试；不改测试文件；边界校验前置 | Read, Write, Edit, Bash |
| `qa` | 测试策略、验收用例（P0/P1/P2 风险排序） | 覆盖验收标准；负路径必测 | Read, Write |
| `tea` | E2E、性能测试 | 生命周期测试；可量化目标 | Read, Write, Bash |
| `verifier` | 终检（**新鲜上下文**，区别于全程 feedback loop） | 只读；只报告不修；对照 plan.md 查 diff | Read, Bash |

## 9. Hooks 设计（定稿版）

> **定位声明（对用户诚实）**：hooks 是**流程约束**——防手滑、强制仪式、锁测试文件；**不是对抗蓄意绕过的安全边界**。强边界在 CI/分支保护/OS 沙箱层。

`hooks/hooks.json`：

```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [ { "type": "process", "command": "node",
          "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/scripts/session-context.mjs"], "timeoutMs": 5000 } ] }
    ],
    "UserPromptSubmit": [
      { "hooks": [ { "type": "process", "command": "node",
          "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/scripts/auto-route.mjs"], "timeoutMs": 5000 } ] }
    ],
    "PreToolUse": [
      { "matcher": "Edit|Write", "hooks": [ { "type": "process", "command": "node",
          "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/scripts/guard-paths.mjs"], "timeoutMs": 5000 } ] }
    ],
    "PostToolUse": [
      { "matcher": "Edit|Write", "hooks": [ { "type": "process", "command": "node",
          "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/scripts/guard-tests.mjs"], "timeoutMs": 5000 } ] }
    ],
    "Stop": [
      { "hooks": [ { "type": "process", "command": "node",
          "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/scripts/audit-log.mjs"], "timeoutMs": 5000 } ] }
    ]
  }
}
```

**auto-route（UserPromptSubmit，v1.1 新增，D11）**

- `auto-route.mjs`：`docs/aidlc/config.json` 的 `autoRouting:true` 时注入路由契约（活跃 intent 摘要 + 五步判定：开关短语→状态提问→A1 接入确认→A2 超范围三选→门禁永不自动）；off（含 config 缺失/畸形）= 静默零注入。开关短语（`aidlc on/off`、`开启/关闭 aidlc|自动路由`，≤80 字符，词边界防 "aidlc onboarding" 误判）**在任何状态下都识别**——否则 off 态只能靠 `/aidlc:on` 上车；识别后仍由模型二次确认是切换还是提问。hook 只注入，**从不写文件、从不改状态**。
- `session-context.mjs`（v1.1 增强）：项目曾 toggled 过开关（config.json 存在）时追加一行 `Auto-route: ON/OFF`；auto-route 开启但无活跃 intent 时也注入一行模式提示（v1.0 对此完全静默）。
- 回归：`scripts/tests/auto-route.test.mjs`（23 场景：OFF 三态静默、开关短语中英文/边界、路由契约携带 intent 上下文、输出 schema 严格性、无 prompt 字段容错）。

**守卫规则（按 POC 结论定稿）**

1. `guard-paths.mjs`（PreToolUse，`Edit|Write`）：按 `tool_input.file_path` **结构化匹配**保护路径（测试文件、`.env`、`infra/**`、`migrations/**`）→ `permissionDecision:"deny"`（或 `exit-2`）。**不匹配 Bash 文本**（可绕过且误拦读）。
2. `guard-tests.mjs`（PostToolUse）：TDD 模式下检测"实现改动是否同时改了测试文件" → `additionalContext` 提示违规（供 Stop 汇总）。
3. `audit-log.mjs`（Stop）：stdin 的 `responseText`/`toolCallCount` 追加到 `docs/aidlc/<slug>/audit.log`。
4. `session-context.mjs`（SessionStart）：注入当前 intent 的阶段/门控状态摘要（从 `state.json` 读），实现"续跑预热"。

**I/O 契约（实测，严格遵守）**

- 输出首选 `hookSpecificOutput`（判别联合，按 `hookEventName`）：`PreToolUse` → `permissionDecision: allow|ask|deny` + `permissionDecisionReason`（+可选 `updatedInput`）；`SessionStart`/`UserPromptSubmit`/`PostToolUse`/`PostToolUseFailure` → `additionalContext`；`Stop` → `decision`。
- 顶层可用：`additionalContext`/`additional_context`/`systemMessage`/`reason`/`suppressOutput`/`continue`/`decision`。
- 退出码：`0` 通过 / `2` 阻断 / 其他为错误；stdout 非法 JSON 或**多余键**即失败。
- 输入：camelCase + snake_case 双套键（`tool_name`/`toolName`、`tool_input`/`toolInput`、`hook_event_name`、`session_id`、`permission_mode`、`cwd`、`transcript_path`）。
- 环境：hook 进程有 `CLAUDE_PLUGIN_ROOT`/`ZCODE_PLUGIN_ROOT`/`CLAUDE_PROJECT_DIR` 并继承父 env；**主 agent Bash shell 无这些变量**（skill 内从 base directory 解析）。
- 跨平台：`type:"process"`（参数向量，不过 shell）。

## 10. 状态与工件存储

```
docs/aidlc/<slug>/
  state.json          # 阶段/门控状态/已过门记录（跨会话续跑）
  intent.md  prd.md  architecture.md  test-strategy.md  plan.md
  units/<n>.md
  reviews/gate1-ai.md  reviews/gate2-ai.md
  decisions.md        # 人类决策 + 逐字反馈（审计核心）
  audit.log           # Stop hook 追加
  retro.md
```

`state.json` 支撑 `/aidlc:status`、`/aidlc:resume` 跨会话续跑（呼应"每阶段开新会话防上下文残留"）。每工件一次提交 → 提交链即审计链。

## 11. 配置分层

| 层 | 位置 | 内容 | 优先级 |
|---|---|---|---|
| 基座 | 插件 `agents/`、`skills/` | 角色定义、编排逻辑、守卫 | 最低 |
| 团队 | `<repo>/AGENTS.md` + `<repo>/.zcode/` | 技术栈、约定、保护路径、门控策略 | 中 |
| 个人 | `~/.zcode/AGENTS.md` + 个人 skill 覆盖 | 个人偏好 | 最高 |

## 12. 实施路线（POC 后修订）

**v0 — 地基（半天）**
- 仓库 `AGENTS.md` 瘦身版（≤1 页）。
- 一条命令验证闭环（`npm run verify` = test + lint + build）。
- `guard-paths` + `guard-tests` 上线（结构化字段匹配版）。
- `verifier` agent + **补测 POC 未覆盖项**（Stop continue、PermissionRequest、updatedInput）。
- evals 雏形：`/aidlc:eval` 对 AGENTS.md/skills/hooks 变更跑 3–5 个真实任务回归。

**v1 — 最小可用流水线（2–3 天）**
- 插件骨架（从 `aidlc-poc` 演进：更名 `aidlc`，bump version 触发 update）。
- `/aidlc:inception`、`/aidlc:gate`、`/aidlc:status` + 编排 skill。
- `pm`/`architect`/`qa` 三角色 + `party-review`（Agent 扇出）。
- 工件模板 + `state.json` + SessionStart 续跑预热。
- 端到端跑一个真实小需求（Inception→Gate#1）。

**v2 — 完整生命周期 + 演进**
- `/aidlc:construct`、`/aidlc:ops`、`/aidlc:resume`；`dev`/`tea`；Construction 并行泳道（可选 dynamic workflows）。
- `brownfield-scan` + context card；审计日志、retro。
- 演进选项：贡献 `harness/zcode` 到 `awslabs/aidlc-workflows`（企业级 33-stage/审计/profiles 场景）。

## 13. 风险与边界

| 风险 | 处置 |
|---|---|
| hooks 可被蓄意绕过 | 已定位为流程约束（D3）；强边界在 CI/分支保护；文档明示 |
| `ask` 语义不可靠 | 一律 `deny`/`exit-2`（D2） |
| `plugins validate` 不查组件路径 | 发布前跑 `skills list`/`commands list`/`plugins list` 自检 |
| 插件更新不生效 | bump version 才触发 `update`（POC 实测）；文档写明 |
| BMAD v7 alpha 变动 | 仅作参照，无运行时依赖（D1） |
| 方法论适用边界 | 不适用：开放技术选型、模糊 brief、强耦合遗留代码（AWS 博客自述） |
| 模型不守仪式（跳步/自作主张） | 编排 skill 明文四拍 + Stop 审计 + decisions.md 追责；evals 回归 |

## 14. 验收标准（v1）

1. 本地 marketplace 可添加，插件可安装并默认启用（`plugins list` 显示 skills/commands/agents/hooks 计数）。
2. `/aidlc:inception <需求>` 产出 `intent.md`/`prd.md`/`architecture.md`/`test-strategy.md`。
3. `party-review` 并行调度 ≥3 个角色 agent，汇总出 `reviews/gate1-ai.md`。
4. Gate#1 人类审批通过/打回，反馈逐字进 `decisions.md`，打回后状态保留可续。
5. `guard-paths` 对受保护路径的 `Edit|Write` 返回 `deny` 且文件未落盘；`guard-tests` 能提示测试违规。
6. `/aidlc:status` 正确反映阶段与门控状态；跨会话 `/aidlc:resume` 可续跑（SessionStart 预热生效）。
7. 全流程在一个真实小需求上跑通 Inception→Gate#1。

---

## 附录 A：hook I/O 契约实测样本

**PreToolUse stdin（节选）**：
```json
{"hook_event_name":"PreToolUse","tool_name":"Write",
 "tool_input":{"file_path":"...","content":"hello\n"},
 "permission_mode":"yolo","cwd":"...","session_id":"...",
 "riskLevel":"medium","sideEffectScope":"workspace",
 "transcript_path":"...","tool_use_id":"..."}
```

**deny 输出（实测生效，优先于 yolo）**：
```json
{"hookSpecificOutput":{"hookEventName":"PreToolUse",
 "permissionDecision":"deny","permissionDecisionReason":"..."}}
```

**SessionStart 注入输出（实测进入模型上下文）**：
```json
{"hookSpecificOutput":{"hookEventName":"SessionStart",
 "additionalContext":"AIDLC-POC: session context injected via SessionStart hook."}}
```

**UserPromptSubmit 注入输出（v1.1，脚本级回归验证 schema；客户端 stdin 字段名未实测，`prompt`/`userPrompt`/`user_prompt`/`message` 容错读取，缺字段时仅跳过开关短语识别、照常注入路由契约）**：
```json
{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit",
 "additionalContext":"[AIDLC auto-route: ON] …路由契约…"}}
```
客户端真实 stdin 样本待首次 smoke 后回填于此。

## 附录 B：与参考资料对应

| 设计要素 | 来源 |
|---|---|
| Inception/Construction/Operations 三阶段、Review Gate、Bolts/Units | AWS AI-DLC |
| 角色化 agent、约束前置、并行产出、Party Mode、TDD 契约、brownfield context card、每阶段开新会话 | BMAD Method + AWS 中国博客《From Spec to Ship》 |
| 工件链即审计链、hooks 作门、skills 顾问/hooks 强制、verifier 新鲜上下文、evals | Anthropic《AI-native SDLC playbook》 |
| 插件/命令/agent/hook/marketplace 机制与全部实测契约 | ZCode 官方 plugin-creator/zcode-guide + 本 POC |

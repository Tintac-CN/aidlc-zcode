# aidlc 插件整体审核报告（v0.1.0）

> 日期：2026-10-13　方法：三路并行独立审核（编排逻辑 / ZCode 机制 / 角色与守卫对抗性）+ 主审核员交叉复核与关键发现独立验证
> 评分：编排逻辑 4/10　·　机制正确性 B-　·　角色与守卫 4.5/10
> **修复状态（2026-10-13，v0.1.1）：P0 四项 + P1 九项中的文本类七项已修复并实测；详见文末"修复记录"。**

---

## ✅ 修复记录（2026-10-13，v0.1.1，commit dffe79b）

| 项 | 状态 | 实现 |
|---|---|---|
| P0-1 模板路径不可达 | ✅ 已修 | 6 个模板全文内联进 SKILL.md §7，调度消息随发，角色零路径依赖 |
| P0-2 mtime 违反 updatedAt 语义 | ✅ 已修 | findActiveIntent 按 `state.updatedAt` 排序（mtime 兜底），跳过 `phase=done`，单 intent 异常隔离 |
| P0-3 门控可跳过/状态可伪造 | ✅ 已修 | 新增 `guard-gates.mjs`（PreToolUse Edit\|Write）：未过 gate1 禁写 plan.md/units；state.json 写 approved 需 decisions.md 的 `GATE-APPROVED <gate>` 回执 |
| P0-4 TDD 锁是警告且无人置位 | ✅ 已修 | 锁升级为 deny（guard-gates 规则2）；新增 `/aidlc:lock-tests`（校验测试已提交后置位）与 `/aidlc:unlock-tests <理由>`（人类理由→decisions.md→tddLockOverride） |
| P1-1 状态机 rejected 卡死/推断表缺失 | ✅ 已修 | gate.md 写明推断真值表（6 相位全覆盖）+ rejected 转移 + 复位 pending + 3 轮升级 |
| P1-2 半完成态无对账 | ✅ 已修（协议层） | resume 第一步四方对账（state/磁盘/git/decisions）+ 差异修复规则写入 SKILL §4 |
| P1-3 并行隐性依赖 | ✅ 已修（对齐拍） | Inception 增加第 4 拍"对齐拍"：编排者比对 AC 编号与语义对齐表，错位派回回填；party-review 把编号对不上列为必查 |
| P1-4 调度契约缺输出半边 | ✅ 已修 | SKILL §5 调度消息五要素（含模板全文）+ `ROLE-DONE <path> <hash>` / `ROLE-FAIL` 回报协议，编排者只认标记 |
| P1-5 verifier 无 Write 却要落盘 | ✅ 已修 | verifier 改为纯报告，reviews/gate2-ai.md 由编排者写入 |
| P1-6 guard-paths 误伤（B 报告的 secrets-manager 断言经复核**不成立**，正则本就不匹配中缀段）| ✅ 顺手加固 | `.env.example/.sample/.template` 白名单；新增 .envrc/id_rsa/id_ed25519/*.p12/*.pfx/*.jks/.netrc/.aws//docker config.json |
| P1-7 skills 逗号多值存疑 | ✅ 已改 | gate.md 改 YAML 数组 `skills: [aidlc, party-review]`，commands list 验证解析正常 |
| P1-8 pm/qa 无 Bash 无法 mkdir | ✅ 已修 | 编排者先建目录+state 骨架再扇出（SKILL §3 显式化） |
| P1-9 "decisions.md hook 会拦"谎言 | ✅ 已修 | 删除谎言；SKILL.md 顶部新增 §0 守卫边界声明（六条诚实边界） |
| P2 audit-log `join(statePath,'..')` | ✅ 已修 | 改 `dirname(statePath)` |
| P2 isTestFile 盲区 | ✅ 已修 | 覆盖 `test_*.py`/`*_test.py`/`*_test.go`/`Tests.java|kt|cs`/`spec/` 目录 |

**修复后实测**：guard-gates 全部 9 个规则场景单测通过（含反斜杠 Windows 路径、override 放行、回执放行）；headless 真会话中强制 Write plan.md → 模型收到 deny 全文原样引用、文件未落盘 ✅；`/aidlc:status` 按 §4 对账协议正确发现"工件未提交/phase 落后"并预告 guard-gates 拦截 ✅。

**审核后新发现（实测，重要）**：
- 🔴 **Hook 脚本错误 = fail-open**：语法错误的 hook 会让该次调用**静默放行**（error ≠ block）。教训：hook 脚本必须保持极简并单测；未来考虑在 CI 里对 hooks/\*\*.mjs 跑 `node --check`。
- 🟡 本会话曾出现 56 条 `hook.run.failed`：根因是会话中途卸载/迁移了 POC 插件，运行中会话仍挂着陈旧 hook（脚本路径已消失）。**安装/卸载插件后应重启应用**，否则残留 hook 持续报错（fail-open，无实害但是噪音）。
- 🟡 B 报告的"secrets-manager 误拦"经正则复核为**误报**（`secrets?([\\/]|$)` 不匹配 `secrets-manager` 中缀段），但扩充密钥路径的建议仍被采纳。

**未修复（遗留到下一批）→ 第二批修复记录（2026-10-13，v0.1.2）**：
- ✅ state.json 并发保护机制层落地：history 只追加的乐观锁（guard-gates R4：整体覆写丢失任一 history 条目即 deny）；decisions.md 只追加保护（R5：覆写必须是新建或纯追加）；session-context 直接注入 decisions.md 最近 15 行（人类裁决必达，不再只是"提示去读"）；intent 创建时初始化 decisions.md 骨架；新增 `scripts/check-plugin.sh`（hook 语法 + validate + 三列表一键自检，防 fail-open）。9 个新场景单测全过。
- ✅ `description_i18n` 字段名确认支持（官方 presentations 插件同名用法，无需改）。
- ✅ headless 前置条件：协议层已收敛到 gate.md 推断真值表（拒绝+指引）。
- ✅ audit-log 的 Stop 字段 `responseText` 在冒烟中实测有效。
- 遗留：`/aidlc:eval` 回归任务集（v1 后续）。

---

## 原始审核结论（存档）
> 总评：**架构方向正确，但处于"happy path 叙述"阶段——所有约束的可信度 = 模型纪律性，无机制兜底。修完 P0 才能跑通核心流程。**

---

## 执行摘要

插件骨架（三阶段双门控 + 六角色 + 工件链 + 限速带守卫）方向正确，冒烟测试也证明 happy path 能产出高质量工件。但审核发现一个系统性问题：**除 guard-paths 对 Edit/Write 的硬拦外，其余所有"铁律""不可协商""hook 会拦"都只是 markdown 文字**，没有机制在模型违规时介入。长上下文/被催促/对抗输入下这些约束会衰减。冒烟中"工件产出但未提交、phase 未推进"的半完成态，正是这些缺失的必然结果而非意外。

**四个必须先修的致命问题（P0）**：

| # | 问题 | 后果 |
|---|---|---|
| P0-1 | SKILL.md 让角色"从模板写工件"但**模板路径不可达**（markdown 正文 `${CLAUDE_PLUGIN_ROOT}` 不展开，SKILL 也没给路径） | Inception 第一步就卡住或自由发挥 |
| P0-2 | `findActiveIntent` 用 **mtime** 选活跃 intent，违反 SKILL.md 自己声明的 **updatedAt** 语义 | 多 intent/历史 intent 被 touch 时注入错误状态、警告错误 intent |
| P0-3 | **门控完全可跳过**：写 `plan.md`/`units/` 前无 hook 校验 gate1 已通过；state.json 模型可直接改写伪造 approved | 模型可直接进 Construction，无任何强制 |
| P0-4 | **TDD 锁只是警告不是锁**：dev 改测试只收 PostToolUse additionalContext 警告，可继续；且没人置位 tddLock | dev 核心铁律无强制；锁可能永远不上 |

---

## P0 — 发布前必须修（会导致核心流程失败）

### P0-1　模板路径不可达（B 报告 · skill 模板引用 D 级）
- **现象**：`skills/aidlc/SKILL.md:44` "从模板写 intent.md"，但 `${CLAUDE_PLUGIN_ROOT}` 在 markdown 正文不展开（已实测），SKILL 全文未给任何可解析路径（验证：SKILL 内无 `templates/` 引用）。
- **修法（选一，推荐第 1 个）**：
  1. **把 6 个模板内容直接内联进 SKILL.md**（每个 <600B，最稳，角色零文件依赖）。
  2. SessionStart hook 的 additionalContext 注入 `CLAUDE_PLUGIN_ROOT` 真实路径前缀，SKILL 让角色用它拼路径。
  3. 由编排者 Read 模板后把内容传给角色（编排者知道插件安装目录吗？—— 不可靠，放弃）。

### P0-2　findActiveIntent 用 mtime 违反 updatedAt 语义（B 报告 · state.mjs）
- **现象**：`state.mjs:37-42` 用 `statSync().mtimeMs` 比较，SKILL.md:38 却声明"`updatedAt` 最新者"。mtime 会被 touch/备份/原子写改变，与内容字段不一致。
- **修法**：解析 JSON 后按 `state.updatedAt` 排序，mtime 仅在解析失败时兜底；`statSync` 单个失败 try/catch 跳过不拖垮整体。

### P0-3　门控可跳过 + 状态可伪造（C 报告 5.1/5.2，已独立验证：无任何 hook 校验 gate）
- **现象**：写 `docs/aidlc/*/plan.md`、`units/*` 前无 hook 查 `state.gates.gate1==="approved"`；模型可直接 Edit state.json 把 gate1 改 approved，无审计。
- **修法**：新增 `guard-gates.mjs`（PreToolUse，matcher `Write`）：
  - 写 `plan.md`/`units/**` → 校验 gate1 approved，否则 deny 提示先 `/aidlc:gate`；
  - 写测试文件且 `tddLock===true` → deny，除非 `tddLockOverride`（人批准）未过期；
  - 写 `state.json` 且把 `gates.*` 改 `approved` → deny，要求走专用批准命令。

### P0-4　TDD 锁无强制 + 无人置位（C 报告 3.1/3.4，A 报告印证）
- **现象**：guard-tests 是 PostToolUse 警告可无视；`state.tddLock=true` 没有命令/hook/自动化置位，全靠模型记得——模型忘了锁就永远不上。
- **修法**：升级为 PreToolUse deny（并入 guard-gates）；提供 `/aidlc:lock-tests` 命令置位 + 校验测试已有提交；`/aidlc:unlock-tests <reason>` 写 override。

---

## P1 — 决定真实项目可用性（不修会卡/误伤）

| # | 问题（来源） | 修法 |
|---|---|---|
| P1-1 | **状态机打回后卡死**：rejected 后 phase 不回落，gate 推断表在 inception/operations/done 相位未定义（A 1/2） | 补 rejected 转移表 + 非法相位拒绝文案 + 推断回显确认 |
| P1-2 | **半完成态无对账**：inception 超时→工件落盘未提交、phase 未推进，resume 只"读 state"无法发现（A 3/6，冒烟已复现） | 写"对账与恢复"协议：resume 第一步做 state/磁盘/git/decisions 四方比对，工件落盘+commit+回报 hash 定为不可分割完成判据 |
| P1-3 | **并行产出隐性依赖**：architect/qa 纯并行时只基于一句话 intent 猜，AC 编号在 PRD 未定前虚构、无回填机制（A 4，冒烟证实 architect 先于 PRD） | 两阶段扇出（pm→prd 先出，architect/qa 再并行）或保留全并行加"对齐拍"回填引用，party-review 把"编号对不上"列为必查硬伤 |
| P1-4 | **角色调度契约缺输出半边**：无调度消息模板、无 ROLE-DONE 回报协议（验证：SKILL/commands 全文无 DONE 协议），"三工件齐"靠自然语言猜（A 5） | 定义调度消息模板（intent 路径/读清单/写路径/模板/完成判据）+ 回报协议 `ROLE-DONE <hash>` / `ROLE-FAIL`，编排者只认标记 |
| P1-5 | **verifier 无 Write 却要写 gate2-ai.md**（B，agents/verifier.md） | 编排者收集 verifier 文本回报后自己写汇总文件（保持 verifier 纯报告语义） |
| P1-6 | **guard-paths 过度匹配**：`secrets?` 把 `src/secrets-manager/client.ts` 正常源码目录也 deny（B，已验证正则） | 收紧为 `(^|[\\/])\.secrets?` 或改 warn；扩充 `.envrc`/`id_rsa`/`*.p12`/`.npmrc`/`.netrc` 等真实私钥路径 |
| P1-7 | **`skills: aidlc, party-review` 逗号多值可能不 trim**：第二个 skill 静默丢失，gate 失去互审（B；官方插件全部只用单值，无逗号先例） | 改 YAML 数组 `skills: [aidlc, party-review]`，或实测确认 trim |
| P1-8 | **pm/qa 无 Bash 无法 mkdir 但需写嵌套路径工件**；`mkdir` 依赖未实测的 Write 自动建父目录行为（B） | 由编排者先 mkdir + 写 state.json 骨架，再扇出角色只写文件 |
| P1-9 | **SKILL.md 谎称 "decisions.md hook 会拦"**（C 2.1，已验证：无任何 hook 碰 decisions.md，那行只是提示文字） | 删除该句或真加保护；SKILL.md 顶部加"守卫边界声明"一节（见下） |

---

## P2 — 打磨项

- **audit-log 依赖未实测的 Stop stdin 字段**（`responseText` 等三键，B）：先实测打印 stdin keys；同时落关键 tool 的 file_path 列表而非只截 400 字符文本。
- **audit-log 路径用 `join(statePath,'..')`**（B/C 均提）：改 `dirname(statePath)` 更直白。
- **decisions.md 无初始化、覆盖不全**：澄清问答/ops 参数/TDD 豁免/修订折中都不进 decisions.md（A 7）：随 intent.md 模板初始化；所有 AskUserQuestion 决策统一落 decisions.md。
- **state.json 并发**：两会话读-改-写必丢 history（A 1）：乐观锁（读磁盘比 updatedAt）或约定仅编排者主线程可写、角色禁触。
- **headless 前置条件死锁**：construct/gate/ops "提示用户"在 cron/CI 无对端（B）：headless 下前置不满足应非零退出写明原因。
- **git 提交主体/消息格式/分支策略未定义**（A 3）：编排者统一 `git add <具体路径>`、message 模板 `aidlc(<slug>): <phase>/<artifact>`、开工前查工作区干净。
- **`description_i18n` 字段名可能不被 ZCode 识别**（B）：validate 不报错静默丢弃，实测确认 i18n 规范。
- **isTestFile 盲区**：不覆盖 `test_*.py`/`*_test.go`/`Tests.java`（B/C 均提）：扩充正则或声明仅 JS/TS。
- **agent thoughtLevel 全空**：dev/verifier 重推理角色建议 `thoughtLevel: high`。
- **session-context 只提示"去读 decisions.md"不强制**（C 5.4）：把 decisions.md 最近 20 行直接注入 additionalContext。

---

## 修复优先级路线

**P0 阻断（修完核心流程才能跑通）——约 1 天**
1. 模板内联进 SKILL.md（P0-1）
2. findActiveIntent 改 updatedAt 排序（P0-2）
3. 新增 guard-gates.mjs 堵门控跳过+状态伪造+TDD 锁（P0-3/P0-4，一个 30 行 hook 堵三洞）
4. 删除/修正 SKILL.md "hook 会拦" 谎言 + 加守卫边界声明（P1-9）

**P1 可用性（决定实战能否用顺）——约 2 天**
5. 状态机补全（rejected 转移 + gate 推断真值表）（P1-1）
6. 对账与恢复协议写进 resume/SKILL（P1-2）
7. inception 依赖顺序决策：两阶段扇出 + 角色调度契约（含回报协议）（P1-3/P1-4）
8. verifier 汇总改编排者写、guard-paths 正则收紧、skills 数组、编排者 mkdir（P1-5/6/7/8）

**P2 打磨 —— 随用随改**

---

## 审核给架构的肯定

- 三阶段双门控、AI 互审+人审分工、工件链即审计链、角色约束前置——方向都对，冒烟产出质量也高。
- guard-paths 的 deny 机制、SessionStart 注入、双命名 hook 契约——机制层用法正确（B 评 hooks 结构 A 级）。
- "hooks 是限速带非安全边界"的定位在 README 里已诚实声明——**但 SKILL.md 正文没有同步这句，且出现"hook 会拦"的反向谎言，这是当前最伤信任的一处**。

## 一句话结论

**这不是推倒重来，而是把"文字承诺"落地为"机制强制"。** 骨架保留，按上面 P0→P1 顺序把 4 个致命洞和 9 个可用性问题修掉，插件就能从"演示能跑"变成"实战敢用"。

---

# 第二轮审核（v0.2.0 → v0.3.0）

> 日期：2026-10-13　方法：全量通读（5 hooks + SKILL + 9 命令 + 6 角色 + party-review + 回归套件）+ 针对性验证（POC Stop payload 复核、templates 引用 grep、大小写/正则实测）
> 范围：不限于 AIDLC 原文，含补充设计。**修复状态：P1 五项 + P2 六项 + P3 四项全部落地，回归 26/26 绿。**

## 发现清单与修复

| # | 严重度 | 发现 | 修复 |
|---|---|---|---|
| 1 | P1 | **Edit 可篡改 decisions.md/state.json**：Rule 4/5 只校验 Write 覆写；Edit 的 old_string 可命中文件任意位置，等于改写审计历史（删回执、改 history） | 新增 Rule 6：两文件**禁 Edit**，强制走 Write（decisions 前缀校验 + state 乐观锁） |
| 2 | P1 | **回执无轮次语义**：打回重审时旧 `GATE-APPROVED` 回执仍满足校验，复审无需新人类审批 | 回执行序判定：`GATE-REJECTED gateN` 行之后的旧回执作废；gate.md 打回流程补 `GATE-REJECTED` 标记行 |
| 3 | P1 | **state.json 损坏 = 守卫静默失效**：loadIntent null → 回退活跃 intent（错误套用他门状态）或直接放行 | fail-closed：损坏 intent 路径全部 deny，唯一放行"Write 重写该 state.json"（仍过回执校验）——可修复不自锁 |
| 4 | P1 | **TDD 锁全仓库作用域**：锁 intent A 时改无关模块测试也被 deny | `state.json.tddLockPaths[]`：非空只锁清单内路径（后缀匹配、大小写不敏感）；空=全仓库（兼容旧 intent） |
| 5 | P1 | **isTestFile 漏主流惯例**：`FooTest.java`/`FooTests.cs`/`_spec.rb`/`_test.rs` 不匹配 | 补 `(Test\|Tests).(java\|kt\|cs)`、`_test.(go\|rs\|rb)`、`_spec.(rb\|js\|ts)` |
| 6 | P2 | SKILL.md 两处"§8 模板"引用错位（模板在 §7，§8 是降级协议） | 改 §7 |
| 7 | P2 | templates/ 目录与 §7 内联模板双源漂移（且零运行时消费者） | 删除 templates/（单一真源=SKILL §7） |
| 8 | P2 | docs/aidlc 路径正则无 /i：Windows 大小写变体绕过 Rule 1/3/5 | 全部加 /i（slugOfPath 同步） |
| 9 | P2 | guard-tests 在解锁窗口误报（不区分 override） | 分支：override 时改提醒重锁（顺带解决 override 无过期、忘重锁裸奔） |
| 10 | P2 | 无终止机制：打回 3 轮"升级人类"后无命令承载；废弃 intent 永占活跃位 | `/aidlc:archive`：decisions 留痕 + phase=archived；findActiveIntent 跳过 archived |
| 11 | P2 | 互审"只读"纯靠 prompt，pm/architect/qa 却带 Write；gate2 需看 diff 却无 Bash | 4 个只读 reviewer 角色（无 Edit/Write 工具+检查清单）；party-review 改派 reviewer；生产角色去互审节 |
| 12 | P3 | 无 CI：回归只能手动 | `.github/workflows/plugin-tests.yml`（push/PR 自动跑语法+26 场景） |
| 13 | P3 | Node 运行时依赖未声明（hook 报错=fail-open） | README/主页前置声明 + check-plugin node 探测 |
| 14 | P3 | session-context 不注入 unit 进度 | 注入 `Units: n/m done; pending: ...` |
| 15 | P3 | audit-log 字段名疑似猜测 | **撤回**：POC 捕获的 Stop payload 证实 responseText/turnId/toolCallCount 真实存在，实现正确 |

## 未采纳（有意不做）

- **agents 钉 model/thoughtLevel**：模型 id 因宿主/套餐而异，钉死会在用户机器上断链；留作宿主侧配置。
- **userConfig 自定义保护路径**：hook 进程读取用户配置的管道未经证实，先不引入未验证机制。

## 修复后实测

- 回归套件 15 → **26 场景全绿**（新增：Edit 篡改×2、回执轮次×2、损坏 fail-closed×3、锁作用域×2、Java/Ruby 惯例×2、大小写×1、archived×1）。
- `bash scripts/check-plugin.sh` 全过（node 探测 + 语法 + 回归 + validate + 三列表）。

---

# 第三轮审核（v0.3.0 → v1.0.0 正式版）

> 日期：2026-10-13　方法：运行时探针实测（不止读代码）+ 真实会话 smoke（headless yolo，覆盖全部 v0.3.0 新机制）
> 结论：**可发布正式版**；建议项 2 个先行修复后以 1.0.0 发布。

## 发现与处置

| # | 严重度 | 发现 | 处置 |
|---|---|---|---|
| 1 | 中 | tddLockPaths 重跑置锁会**覆盖**旧清单——多 unit 场景先前 unit 的保护被顶掉或不设防 | 协议改**并集累积**（lock-tests.md + SKILL §2）：范围只增不减 |
| 2 | 小 | guard-tests 双分支（契约警告/重锁提醒）未进回归套件，CI 抓不住其回归 | 补 2 场景（26→28），断言消息特征 |
| 3 | 流程风险 | v0.3.0 四个新机制只有单测级验证，未跑真实会话 | **smoke 全过**（见下） |
| 4 | 小 | audit.log 永远未跟踪，status/resume 对账反复报噪音 | SKILL 建骨架步骤补 `.gitignore docs/aidlc/*/audit.log` 指引 |

## Smoke 实录（aidlc-smoke 项目，version-bump intent，9 提交）

- **Run A 互审**：reviewer-pm/-architect/-qa/-dev 四角色并行派发全部成功，`REVIEWER-*-DONE B/M/m` 格式回报，30 条原始发现去重 5 BLOCKER（含预埋的"AC2 不可测"与"架构擅自闭环开放问题"）；未碰 state/decisions。
- **Run B 打回→复审**：GATE-REJECTED 标记 → 修订（代行留痕）→ 重进门 pending → 新回执 GATE-APPROVED → state 推进 construction。decisions 四次提交构成**纯前缀追加链（零 Edit）**，history 无丢失，hook 新鲜度校验放行新回执。
- **Run C 归档**：`/aidlc:archive` → ARCHIVED 标记 + phase=archived + history 第 5 条；session-context 实测不再注入。

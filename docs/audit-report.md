# aidlc 插件整体审核报告（v0.1.0）

> 日期：2026-10-13　方法：三路并行独立审核（编排逻辑 / ZCode 机制 / 角色与守卫对抗性）+ 主审核员交叉复核与关键发现独立验证
> 评分：编排逻辑 4/10　·　机制正确性 B-　·　角色与守卫 4.5/10
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

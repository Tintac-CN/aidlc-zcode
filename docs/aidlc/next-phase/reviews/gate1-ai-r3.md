# Gate#1 AI 互审 · 第 3 轮（R2 修订后，2026-10-14）

> 基线：reviews/gate1-ai-r2.md（N1-N8 + 15 minor）
> 评审角色：reviewer-pm（0/1/7）、reviewer-architect（1/0/4，脚本级推演）、reviewer-qa（1/0/3，实测复现）、reviewer-dev（0/2/6）
> 消解面：R2 点名 15 项中 14 项干净消解；上轮已确认项（决策 #5/#11/#12、express 五触点、preserveKeys 同构性）零破坏；存量回归 28+23 实测全绿；幻影方向（T−P）实测为空。

## 新 BLOCKER

- **N-R3-1 [architect+qa 独立实测复现] 映射列内 R1 行内注记的 em dash 触发整格剔除，本 intent 下次推进必被自己的 F4 门 deny**：test-strategy.md 映射 AC 列 6 格（T03/T05/T06/T07/T12/T51）残留 R1 注记"（R1 修订：响应 M2**——**…）"，其 em dash（U+2014）命中 R2 新文法字符类 `[–—~～]` → 六格整格剔除 → **P−T = {AC1.4, AC1.6, AC1.7} ≠ ∅ → deny**（AC1.4 唯一证据 T03/T51、AC1.6 唯一证据 T06、AC1.7 唯一证据 T07 恰好全被毒化）。反向实现（不剔注记格）则注记 prose（"原 AC1.2/原 AC1.4"）逐 token 入 T——两种合理实现分别得 deny 与带污染的 pass，确定性破坏。**修复（编排者裁决：方案 a）：qa 清扫映射列——注记移出映射列（场景列或删除），映射格只留编号 token；ac-coverage 回归清单补"注记格"场景。**不选文法收窄（b）：会重新打开 R1-N1 的 prose 误报口。

## 新 MAJOR

- **M-R3-1 [dev] 整格剔除文法漏空格环绕半角连字符**：`AC1.1 - AC4.4` 型 cell——`-` 不在字符类、不满足"字母/数字相邻"、空格是合法分隔符 → 被当纯多 token 格两端各自入 T → 假覆盖，与"宁可少算"承诺相反。**修复：`-`/`－` 出现在映射列 cell 即整格剔除**（合法分隔白名单本不含连字符，无副作用）。
- **M-R3-2 [dev] 触点清单缺 express retro 分支落点**：决策 #3 ④"Operations 的 retro.md 改为人类可选"已被 AC1.2 法典化，但触点清单 8 项无一一覆盖 retro 三处现状代码：`SKILL.md:104-105`（完结判据硬性要求 retro 落盘）、`SKILL.md:241`（§7 模板）、`commands/aidlc/ops.md:11`。照单施工到 Operations 才会冒出新触点。

## 新 MINOR（合并 14）

AC2.4 对齐表缺行（pm M-1/architect m-Q2/dev m-a，21 条中 20 条有行）｜T06"或忽略该字段"残留（pm m1，统一裁决后无此分支）｜AC1.7 负分支指引指向 T07 不吻合（pm m2，T07 为单元层正向场景）｜T54 引用"架构 L103"行号漂移（pm m3/architect m-A，实为 L113）｜T53/T55/T56"依赖 architect R1 落定"挂起语过期（pm m4/qa m-Q1）｜check-plugin.sh 缺 route-profile 行（pm m5/dev m-b/qa m-Q3，N10 只裁了 ac-coverage 第三行）｜架构 R2 头部漏列 m-N4（pm m6）｜decisions.md 无人类决策对应的 GATE-REJECTED 回执行（pm m7——流程改进项：后续无人类裁决时以文字记录替代回执行）｜`;` 分隔跨 shell 语义注记（dev m-c）｜映射列定位细节（表头匹配/cell 转义/找不到表头归不可解析）（dev m-d）｜映射列内"括注不计"规格句（dev m-e）｜unavailable=true 时 suites/coverage 键状态未定义（dev m-f）｜AC4.1 Given"三工件齐"express 永假（architect m-D，R1 既有，随 OQ1 收口措辞）。

## 结论

趋势收敛：3B/7M/18m → 1B/7M/15m → **1B/2M/14m**，且本轮 BLOCKER 是标点级清扫（注记 em dash 误伤），MAJOR 均为一行修复（连字符入字符类；触点清单补三处）。无设计矛盾、无方向分歧。**建议：打回 R3 清扫级修订**（qa 清映射列 + architect 连字符/对齐表/触点 + pm 两处指引措辞），编排者预检后即可再入评审。修订轮次已达 2 轮（R1/R2），R3 为第 3 轮——按协议若 R3 后评审仍未过，升级人类裁决（继续修订或 /aidlc:archive）。

# Gate#2 AI 互审（2026-10-15）

> 评审对象：交付 diff `d9e6093..HEAD`（16 文件 +1029/−38）、plan.md 完成度、测试结果、T50/T51 smoke
> 评审角色：reviewer-pm（1/3/2）、reviewer-architect（0/0/5）、reviewer-qa（1/4/4）、reviewer-dev（0/1/5）、**verifier（PASS-WITH-CONCERNS 0/1/0，重派成功）**
> 正面结论先行：verifier 独立复现全部 5 unit 验收（含 U3 字节级 v1.1 对比 1226B≡1226B、dogfood 双向闭合、check-plugin 全链路绿）、**零计划外文件**、四套件独立复跑 28/23/15/49 全绿、TDD 链条真实（红 b39fdbc → 锁 → 裁决 → 修复 → 重锁）；"express 不削弱守卫"经 grep 证实；文档触点 1-11 与机制行为无矛盾措辞。

## BLOCKER

- **B1 [pm+qa] AC5.1/U6 零交付且零处置记录**：prd.md AC5.1（U6）要求 README.md 与 docs/index.html 反映四项新能力；全量 diff **不含两文件**——README 状态段止于 v1.1.0 自动路由、index.html hook 表止于 auto-route(v1.1)，套件计数（28+23）已与实现（28+23+15+49）不符，构成 AC5.1 明文禁止的"与实现矛盾的过时描述"；architecture.md 的替代落点（SKILL 发布清单）同样未兑现；**U6 从未进 plan.md**（units 仅 U1-U5，T58 无 unit 认领——F4 编号闭合证明映射不证明交付）；decisions.md 无延期/降范围裁决。**修复或人类显式裁决延期留痕，二者必居其一。**

## MAJOR

- **M1 [pm+qa+verifier 三方] T50/T51 执行主体偏离且无追认**：清单明文"由人类执行"，实际"编排者代执行（机器模拟）"，decisions.md 无授权记录；AC1.1/AC1.3 的人类环（AskUserQuestion 作答/拒绝路径）证据为被约束方自证。verifier 建议：gate2 人类审批时**亲自执行 T50/T51 或逐字追认机器模拟结果**。
- **M2 [dev] extractT 不按表边界收口**：guard-gates.mjs:172-193 表头定位后，小节内**后续任何** `|` 行都按该列收集——同小节第二张表（无"映射 AC"表头）恰含 AC 编号时**静默补齐真实缺口 → 假覆盖过门**，违反"宁可少算"自述不变量（本仓库工件即多表风格，dogfood 未踩中属侥幸）；ac-coverage 无第二张表 fixture。修复：遇首个非表行停止收集，补 fixture。
- **M3 [pm] AC3.4 整体降级语义落点缺失**：SKILL 只有逐文件 `unknown`（AC3.3），"扫描整体不可用 → 无影响面列 + plan.md 注明降级事实、不阻断起步"（T24，P0）零落点。
- **M4 [pm] AC2.3 落点缺失**：SKILL 把"存量无字段（AC2.4，降级正确）"与"本 intent 该记未记（AC2.3，须显式标注'无基线对照'+告警+豁免逐字留痕）"合并为同一静默降级，OQ2 追认项未兑现。
- **M5 [qa] T05 悬空**：route=express 下守卫不削弱的"单元 P0"无机械兑现（grep T05 零命中）也未诚实降级——结构性证据在（guard-gates 不读 route + pk 组实跑 express 盘状态），归类修正即可。
- **M6 [qa] T04 拒绝路径兑现声明虚化**：溯源表声称 T04→T50 S2-S3 兑现，实际无拒绝场景记录（S3 仅"采纳 classic"、无 express 样本）。
- **M7 [qa] T12/T13/T14/T24 降级负路径零执行证据**（T12/T24 为 P0 风险级）：无基线命令失败→unavailable 实测、无影响面降级演示。

## MINOR（合并 15）

architect：SKILL §0 deny 清单未纳入 F4/R4 键保留两项（宪章低估强制面）｜小节边界正则容差不对称（T 侧 `\s*` 宽于规格、P 侧精确；方向 fail-closed）｜resume bullet 未复述基线显示｜resume 四条 vs 触点 6"三类"枚举漂移｜state.testBaseline.command `;` 字面与 plan"分立执行"不一致（自家对账规则将报差异，需补注或重录）。
dev：route 回显原值未做控制字符消毒（低危，复用 `[\\x00-\\x1f]` 替换一行）｜P 侧 token 子串扫描无左边界（MAC1 类注入幻影，fail-closed，规格层观察）｜routeEcho 双点复制取舍未登记（建议 decisions.md 一行或抽 lib/state.mjs）｜（与 architect 重叠 2 条合并）。
pm：plan.md 命令连接形态缺注记（同 command `;` 条）｜T50 S4 未覆盖 high 显式标出与 unknown 的 E2E。
qa：T51 S3/S4 证据等级弱（规则文本核验替代行为观察，已披露）｜T03 断言"标记缺失+锚点行"非严格字节全等（实质覆盖到位）｜T33（编号重复检出）无场景（Set 去重可辩护，无回归锁）｜T30"输出覆盖关系"/T07 措辞与 deny-only 静默放行不一致。
verifier INFO：`.zcode/` 未入 .gitignore（从未入库，无泄漏）。

## 结论

**1 BLOCKER / 7 MAJOR / ~15 MINOR**。机制层交付质量高且经 verifier 独立复现；BLOCKER 是文档交付整条遗漏（AC5.1/U6），MAJOR 中 3 条（M3/M4/M5）为协议文本一行级补齐、2 条（M6/M7）为负路径补验、M2 为一处代码收口+fixture、M1 需人类知情裁决。**建议：打回修订**——机械可补项（B1 文档、M2 收口、M3/M4 文本、M5 归类、M7 补验）一轮完成；M1/M6 的人类环补验随复审呈报裁决（真实会话补验或追认机器模拟）。

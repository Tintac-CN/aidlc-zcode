---
description: Run the AIDLC plugin's own regression suite (guard hooks, manifests, discovery). Use when changing the plugin's skills/hooks/agents/commands, or when auditing that protections still fire.
skills: aidlc
---

执行 **aidlc 插件自检与回归**（本命令用于插件源码仓库 `aidlc-zcode`，在其他项目里运行时提示先切到源码仓库）：

1. 运行 `bash scripts/check-plugin.sh`（hook 脚本语法 node --check + manifest validate + 三列表发现）。
2. 运行 `node scripts/tests/guard-gates.test.mjs`（守卫规则回归：门控顺序/TDD 锁/回执严格格式/乐观锁/只追加）。
3. 汇总输出：通过/失败计数；任何 FAIL 都要给出失败场景与怀疑原因。
4. 提醒：hook 脚本出错会 **fail-open（静默失去保护）**，任何语法或行为回归都按 P0 处理。

// AIDLC UserPromptSubmit hook (auto-route, opt-in): when docs/aidlc/config.json
// has "autoRouting": true, inject a routing contract so natural-language
// requests enter the lifecycle without typing /aidlc: commands. The hook only
// INJECTS context — it never classifies on the model's behalf and never writes
// files. OFF (default, incl. missing/malformed config) = silent pass, zero
// injection. Toggle phrases are detected deterministically here so "aidlc on"
// works even while OFF; the model makes the final call (a question about the
// feature is not a toggle) and performs the config write via the Write tool.
import { readStdin, parseInput, projectDir, findActiveIntent, readAutoConfig, emit } from './lib/state.mjs';

const input = parseInput(readStdin());
const root = projectDir(input);
const cfg = readAutoConfig(root);
const prompt = String(input.prompt ?? input.userPrompt ?? input.user_prompt ?? input.message ?? '');
const toggle = detectToggle(prompt);

if (toggle) emit(toggleContract(toggle, cfg));

if (!cfg.on) emit(null); // default: not opted in, stay silent

emit(routeContract(findActiveIntent(root)));

// Toggle requests are short phrases, not prose. Separator class covers
// "aidlc: on" / "aidlc，开启". Long prompts containing these words are almost
// never toggles — capped at 80 chars to keep detection conservative.
function detectToggle(prompt) {
  const p = prompt.trim();
  if (!p || p.length > 80) return null;
  const sep = "[\\s:：,，]*";
  const word = "(?:aidlc|自动路由|auto[\\s-]?route)";
  // Trailing (?:\b|$): \b never matches after a CJK char (「…自动路由」ends
  // non-word), so "$" covers CJK endings and \b covers ASCII ones.
  if (new RegExp(`(?:^|\\b)aidlc\\b${sep}on(?:\\b|$)`, 'i').test(p)
    || new RegExp(`(?:^|[\\s:：,，])开启${sep}${word}(?:\\b|$)`, 'i').test(p)
    || new RegExp(`(?:^|\\b)aidlc\\b${sep}开启`, 'i').test(p)) return 'on';
  if (new RegExp(`(?:^|\\b)aidlc\\b${sep}off(?:\\b|$)`, 'i').test(p)
    || new RegExp(`(?:^|[\\s:：,，])关闭${sep}${word}(?:\\b|$)`, 'i').test(p)
    || new RegExp(`(?:^|\\b)aidlc\\b${sep}关闭`, 'i').test(p)) return 'off';
  return null;
}

function toggleContract(target, cfg) {
  const current = cfg.on ? 'on' : 'off';
  return {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: [
        `[AIDLC 开关请求] AUTOROUTE-TARGET=${target}，AUTOROUTE-CURRENT=${current}（源 docs/aidlc/config.json）。`,
        '先判定这句话是否真的是切换开关：若是提问/讨论（如「开启后会发生什么」），只解释，不改任何文件。',
        '确认是切换：读取 docs/aidlc/config.json（不存在视为 {}），用 Write 落盘（保留其他键）：置 "autoRouting": ' + (target === 'on') + '、"updatedAt": <当前 ISO 时间>；已处于目标状态则只回显确认，不重复写。',
        '回显要点：ON=自然语言需求自动进入 AIDLC 流程（接入确认/拆分确认/超范围三选，见 aidlc skill §3.0）；OFF=仅显式 /aidlc: 命令；两种状态下安全守卫（guard-gates/guard-paths/TDD 锁）均不受开关影响、始终生效。'
      ].join('\n')
    }
  };
}

function routeContract(active) {
  const lines = [
    '[AIDLC auto-route: ON] 本条用户消息适用自动路由；显式 /aidlc: 命令（若用户敲了）永远优先。'
  ];
  if (active) {
    const s = active.state || {};
    const g = s.gates || {};
    let head = `活跃 intent：${active.slug}@${s.phase ?? 'unknown'}（gate1=${g.gate1 ?? 'pending'}, gate2=${g.gate2 ?? 'pending'}`;
    const us = s.unitStatus;
    if (us && typeof us === 'object' && Object.keys(us).length) {
      const ids = Object.keys(us);
      head += `，units ${ids.filter(k => us[k] === 'done').length}/${ids.length} done`;
    }
    lines.push(head + '）。');
  } else {
    lines.push('活跃 intent：无。');
  }
  lines.push(
    '处理前先加载 aidlc skill（取 §3.0 协议全文），再对【用户这条消息】依序判定：',
    '1) 开关请求（aidlc on/off 类短语）→ 按开关协议切换 docs/aidlc/config.json 并回显，跳过以下判定。',
    '2) 状态/进度类提问 → 依据 state.json 直接回答，不进流程、不写文件。',
    '3) 开发类需求且无活跃 intent → 先展示「识别的意图一句话 + 3~6 条粗粒度拆分预览」，AskUserQuestion 让人确认（进入生命周期 / 调整拆分 / 不进流程直接答复）；确认后才建 intent 走 Inception（§3.0-A1）。',
    '4) 有活跃 intent：输入落在范围内 → 继续当前阶段协议；疑似超范围 → AskUserQuestion 三选：扩展当前 intent / 搁置 backlog / 越轨直改并留痕（§3.0-A2）；判定不了一律按超范围处理。',
    '5) gate1/gate2 审批与 A3 拆分确认永远由人类表单裁决，任何模式下不得自动通过或代答。'
  );
  return {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: lines.join('\n')
    }
  };
}

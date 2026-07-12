import { commandAttribute } from "./shared.ts";

export function renderCrisisInterruption(): string {
  return `
    <main id="main-content" class="crisis-layout" tabindex="-1">
      <section class="crisis-content" aria-labelledby="crisis-title">
        <p class="eyebrow">需要立即关注</p>
        <h1 id="crisis-title">先停一下</h1>
        <p class="crisis-lead">你写的内容可能表示你正处于危险中。此刻不会继续整理。</p>
        <div class="crisis-actions" aria-labelledby="immediate-help-title">
          <h2 id="immediate-help-title">如果危险就在现在</h2>
          <p>联系当地紧急服务</p><p>请身边可信任的人陪着你</p><p>不要独处</p>
        </div>
        <p class="crisis-limit">此刻不能判断风险，也不能替代紧急帮助。</p>
        <button class="primary-action" type="button" data-crisis-return ${commandAttribute("crisis-return")}>我已看到，返回</button>
        <button class="text-action" type="button" data-crisis-clear ${commandAttribute("crisis-clear")}>清除刚才的内容</button>
      </section>
    </main>
  `;
}

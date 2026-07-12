import type { OrganizedReflection } from "../domain.ts";
import type { ActivityState } from "../model.ts";
import {
  commandAttribute,
  escapeHtml,
  feedbackText,
  inputIdAttribute,
} from "./shared.ts";

export function renderCurrentActivity(
  state: ActivityState<OrganizedReflection>,
): string {
  if (state.result) {
    return `
      <main id="main-content" class="activity-layout result-layout" tabindex="-1">
        <section class="activity-intro" aria-labelledby="activity-title">
          <p class="eyebrow">This Moment</p>
          <h1 id="activity-title">此刻的我</h1>
          <p>这是根据你明确写下的内容所做的整理。</p>
        </section>
        <section class="activity-work reflection-preview" aria-label="整理结果">
          <div class="source-block"><h2>原始信息</h2><p>${escapeHtml(state.input)}</p></div>
          <div class="reflection-section"><h2>我正在感受</h2><p>${escapeHtml(state.result.feelings)}</p></div>
          <div class="reflection-section"><h2>我在担心</h2><p>${escapeHtml(state.result.worries)}</p></div>
          <div class="reflection-section"><h2>我现在希望</h2><p>${escapeHtml(state.result.hopes)}</p></div>
          <div class="preview-actions">
            <button class="primary-action" type="button" data-copy-current ${commandAttribute("copy-current")}>确认并复制</button>
            <button class="secondary-action" type="button" data-revise-current ${commandAttribute("revise-current")}>返回修改</button>
            <p class="action-feedback" role="status" aria-live="polite">${feedbackText(state.copyFeedback)}</p>
          </div>
        </section>
      </main>
    `;
  }

  return `
    <main id="main-content" class="activity-layout" tabindex="-1">
      <section class="activity-intro" aria-labelledby="activity-title">
        <p class="eyebrow">This Moment</p><h1 id="activity-title">此刻的我</h1>
        <p>写下此刻最想整理的感受。</p>
      </section>
      <section class="activity-work" aria-label="此刻的我输入">
        <label for="current-input">此刻，你最想整理什么？</label>
        <textarea ${inputIdAttribute("current-input")} rows="8">${escapeHtml(state.input)}</textarea>
        ${state.inputError ? '<p class="field-error" role="alert">请先写下你此刻想整理的内容。</p>' : ""}
        <p class="privacy-note">内容只留在当前页面，刷新或关闭后不会保留。</p>
        <button class="primary-action" type="button" data-submit-current ${commandAttribute("submit-current")}>确认并整理</button>
      </section>
    </main>
  `;
}

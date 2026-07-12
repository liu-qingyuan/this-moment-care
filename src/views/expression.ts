import type { ExpressionActivityState } from "../model.ts";
import {
  commandAttribute,
  escapeHtml,
  feedbackText,
  inputIdAttribute,
} from "./shared.ts";

export function renderExpressionActivity(state: ExpressionActivityState): string {
  if (state.draft !== undefined) {
    return `
      <main id="main-content" class="activity-layout result-layout" tabindex="-1">
        <section class="activity-intro" aria-labelledby="activity-title">
          <p class="eyebrow">This Moment</p><h1 id="activity-title">我想和某个人说</h1>
          <p>请确认整理后的话仍然是你的意思。</p>
        </section>
        <section class="activity-work expression-preview" aria-label="表达草稿预览">
          <div class="source-block">
            <h2>想对谁说</h2><p>${escapeHtml(state.audience)}</p>
            <h2 class="source-subheading">我最想说</h2><p>${escapeHtml(state.input)}</p>
          </div>
          <div class="draft-editor">
            <label for="expression-draft">整理后的话</label>
            <textarea ${inputIdAttribute("expression-draft")} rows="8">${escapeHtml(state.draft)}</textarea>
            <p class="privacy-note">请确认这些话仍然是你的意思。</p>
          </div>
          <div class="preview-actions">
            <button class="primary-action" type="button" data-copy-expression ${commandAttribute("copy-expression")}>确认并复制</button>
            <button class="secondary-action" type="button" data-revise-expression ${commandAttribute("revise-expression")}>返回修改</button>
            <p class="action-feedback" role="status" aria-live="polite">${feedbackText(state.copyFeedback)}</p>
          </div>
        </section>
      </main>
    `;
  }

  return `
    <main id="main-content" class="activity-layout" tabindex="-1">
      <section class="activity-intro" aria-labelledby="activity-title">
        <p class="eyebrow">This Moment</p><h1 id="activity-title">我想和某个人说</h1>
        <p>写下对象和你最想表达的原话，只整理成一份草稿。</p>
      </section>
      <section class="activity-work expression-form" aria-label="表达内容输入">
        <label for="expression-audience">想对谁说</label>
        <input class="text-input" ${inputIdAttribute("expression-audience")} type="text" value="${escapeHtml(state.audience)}" />
        ${state.fieldError === "audience" ? '<p class="field-error" role="alert">请先写下想对谁说。</p>' : ""}
        <label for="expression-input">我最想说</label>
        <textarea ${inputIdAttribute("expression-input")} rows="7">${escapeHtml(state.input)}</textarea>
        ${state.fieldError === "input" ? '<p class="field-error" role="alert">请先写下最想说的话。</p>' : ""}
        <p class="privacy-note">不访问联系人，不发送；内容只留在当前页面。</p>
        <button class="primary-action" type="button" data-submit-expression ${commandAttribute("submit-expression")}>确认并整理</button>
      </section>
    </main>
  `;
}

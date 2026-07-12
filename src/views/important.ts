import type { ImportantActivityState } from "../model.ts";
import {
  commandAttribute,
  escapeHtml,
  feedbackText,
  inputIdAttribute,
} from "./shared.ts";

const importantIndexAttribute = (index: number): string =>
  `data-important-index="${index}"`;

export function renderImportantActivity(state: ImportantActivityState): string {
  if (state.previewAll) {
    return `
      <main id="main-content" class="activity-layout result-layout" tabindex="-1">
        <section class="activity-intro" aria-labelledby="activity-title">
          <p class="eyebrow">This Moment</p><h1 id="activity-title">对我重要的事情</h1>
          <p>这是当前会话中整理的全部内容。</p>
        </section>
        <section class="activity-work reflection-preview" aria-label="重要事项最终预览">
          ${state.matters.map((matter) => `<article class="important-item"><h2>${escapeHtml(matter.what)}</h2><p class="item-label">为什么重要</p><p>${escapeHtml(matter.why)}</p></article>`).join("")}
          <div class="preview-actions">
            <button class="primary-action" type="button" data-copy-important ${commandAttribute("copy-important")}>确认并复制</button>
            <button class="secondary-action" type="button" data-back-important ${commandAttribute("back-important")}>返回修改</button>
            <p class="action-feedback" role="status" aria-live="polite">${feedbackText(state.copyFeedback)}</p>
          </div>
        </section>
      </main>
    `;
  }

  return `
    <main id="main-content" class="important-page" tabindex="-1">
      <section class="activity-intro" aria-labelledby="activity-title">
        <p class="eyebrow">This Moment</p><h1 id="activity-title">对我重要的事情</h1>
        <p>一次整理一件事，只在当前页面保留。</p>
      </section>
      <div class="important-workspace">
        <section class="important-list" aria-labelledby="important-list-title">
          <h2 id="important-list-title">当前会话</h2>
          ${state.matters.length === 0 ? '<p class="empty-state">还没有整理任何事情。</p>' : state.matters.map((matter, index) => `<article class="important-item"><h3>${escapeHtml(matter.what)}</h3><p class="item-label">是什么</p><p>${escapeHtml(matter.what)}</p><p class="item-label">为什么重要</p><p>${escapeHtml(matter.why)}</p><button class="text-action" type="button" ${importantIndexAttribute(index)} ${commandAttribute("edit-important")}>修改</button></article>`).join("")}
          ${state.matters.length > 0 ? `<button class="secondary-action" type="button" data-preview-important ${commandAttribute("preview-important")}>预览全部并复制</button>` : ""}
        </section>
        <section class="important-editor" aria-labelledby="important-editor-title">
          <h2 id="important-editor-title">${state.editingIndex === undefined ? "还想记下什么？" : "修改这件重要的事"}</h2>
          <label for="important-input">写下一件事，以及你明确写出的重要原因</label>
          <textarea ${inputIdAttribute("important-input")} rows="8">${escapeHtml(state.input)}</textarea>
          ${state.inputError ? '<p class="field-error" role="alert">请先写下想整理的事情。</p>' : ""}
          <p class="privacy-note">可以用“因为”明确分开事情和原因。</p>
          <button class="primary-action" type="button" data-submit-important ${commandAttribute("submit-important")}>${state.editingIndex === undefined ? "添加一件重要的事" : "保存修改"}</button>
        </section>
      </div>
    </main>
  `;
}

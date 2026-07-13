import type { UnderstandingActivityState } from "../model.ts";
import {
  commandAttribute,
  escapeHtml,
  feedbackText,
  inputIdAttribute,
} from "./shared.ts";

export function renderUnderstandingActivity(
  state: UnderstandingActivityState,
): string {
  if (state.boundaryNotice) {
    return `
      <main id="main-content" class="activity-layout boundary-layout understanding-boundary-layout" tabindex="-1">
        <section class="activity-intro" aria-labelledby="activity-title">
          <p class="eyebrow">This Moment</p><h1 id="activity-title">帮我理解</h1>
          <p>这里只处理医生已经说过的话或医疗说明文字。</p>
        </section>
        <section class="activity-work boundary-notice" aria-labelledby="boundary-title">
          <h2 id="boundary-title">这里不能替你判断</h2>
          <p>此刻不能判断疾病、预后或治疗，也不能替你选择治疗方案。</p>
          <p>请输入医生原话或医疗说明文字，我们可以帮助你区分解释、不确定内容和待确认问题。</p>
          <button class="secondary-action" type="button" data-revise-understand ${commandAttribute("revise-understand")}>返回修改</button>
        </section>
      </main>
    `;
  }

  if (state.result) {
    return `
      <main id="main-content" class="activity-layout result-layout understanding-result-layout" tabindex="-1">
        <section class="activity-intro" aria-labelledby="activity-title">
          <p class="eyebrow">This Moment</p><h1 id="activity-title">帮我理解</h1>
          <p>原话、解释和仍需确认的内容保持分开。</p>
        </section>
        <section class="activity-work reflection-preview" aria-label="解释结果">
          <div class="source-block"><h2>原始信息</h2><p>${escapeHtml(state.input)}</p></div>
          <div class="reflection-section"><h2>通俗解释</h2><p>${escapeHtml(state.result.plainLanguage)}</p></div>
          <div class="reflection-section uncertainty-section"><h2>还不能确定</h2><p>${escapeHtml(state.result.uncertainty)}</p></div>
          <div class="reflection-section confirmation-section"><h2>可以向医护确认</h2><p>${escapeHtml(state.result.confirmationQuestion)}</p></div>
          <p class="privacy-note result-privacy">内容只留在当前页面，刷新或关闭后不会保留。</p>
          <div class="preview-actions">
            <button class="primary-action" type="button" data-copy-understand ${commandAttribute("copy-understand")}>确认并复制</button>
            <button class="secondary-action" type="button" data-revise-understand ${commandAttribute("revise-understand")}>返回修改</button>
            <p class="action-feedback" role="status" aria-live="polite">${feedbackText(state.copyFeedback)}</p>
          </div>
        </section>
      </main>
    `;
  }

  return `
    <main id="main-content" class="activity-layout input-layout understanding-input-layout" tabindex="-1">
      <section class="activity-intro" aria-labelledby="activity-title">
        <p class="eyebrow">This Moment</p><h1 id="activity-title">帮我理解</h1>
        <p>输入医生原话或医疗说明文字，我们只帮助你读得更清楚。</p>
      </section>
      <section class="activity-work" aria-label="医疗说明文字输入">
        <label for="understand-input">医生原话或医疗说明</label>
        <textarea ${inputIdAttribute("understand-input")} rows="8">${escapeHtml(state.input)}</textarea>
        ${state.inputError ? '<p class="field-error" role="alert">请先输入需要理解的文字。</p>' : ""}
        <p class="privacy-note">不上传文件，不判断疾病；内容只留在当前页面。</p>
        <button class="primary-action" type="button" data-submit-understand ${commandAttribute("submit-understand")}>确认并解释</button>
      </section>
    </main>
  `;
}

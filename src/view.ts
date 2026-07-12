import {
  activities,
  type ApplicationState,
  type CommandId,
  type InputId,
} from "./model.ts";

const commandAttribute = (command: CommandId): string =>
  `data-command="${command}"`;

const inputIdAttribute = (inputId: InputId): string => `id="${inputId}"`;

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character]!,
  );
}

function renderCurrentActivity(state: ApplicationState): string {
  if (state.current.result) {
    return `
      <main id="main-content" class="activity-layout result-layout" tabindex="-1">
        <section class="activity-intro" aria-labelledby="activity-title">
          <p class="eyebrow">This Moment</p>
          <h1 id="activity-title">此刻的我</h1>
          <p>这是根据你明确写下的内容所做的整理。</p>
        </section>

        <section class="activity-work reflection-preview" aria-label="整理结果">
          <div class="source-block">
            <h2>原始信息</h2>
            <p>${escapeHtml(state.current.input)}</p>
          </div>
          <div class="reflection-section">
            <h2>我正在感受</h2>
            <p>${escapeHtml(state.current.result.feelings)}</p>
          </div>
          <div class="reflection-section">
            <h2>我在担心</h2>
            <p>${escapeHtml(state.current.result.worries)}</p>
          </div>
          <div class="reflection-section">
            <h2>我现在希望</h2>
            <p>${escapeHtml(state.current.result.hopes)}</p>
          </div>
          <div class="preview-actions">
            <button class="primary-action" type="button" data-copy-current ${commandAttribute("copy-current")}>确认并复制</button>
            <button class="secondary-action" type="button" data-revise-current ${commandAttribute("revise-current")}>返回修改</button>
            <p class="action-feedback" role="status" aria-live="polite">${
              state.current.copyFeedback === "success"
                ? "已复制"
                : state.current.copyFeedback === "error"
                  ? "复制失败，请手动选择文字。"
                  : ""
            }</p>
          </div>
        </section>
      </main>
    `;
  }

  return `
    <main id="main-content" class="activity-layout" tabindex="-1">
      <section class="activity-intro" aria-labelledby="activity-title">
        <p class="eyebrow">This Moment</p>
        <h1 id="activity-title">此刻的我</h1>
        <p>写下此刻最想整理的感受。</p>
      </section>

      <section class="activity-work" aria-label="此刻的我输入">
        <label for="current-input">此刻，你最想整理什么？</label>
        <textarea ${inputIdAttribute("current-input")} rows="8">${escapeHtml(state.current.input)}</textarea>
        ${
          state.current.inputError
            ? '<p class="field-error" role="alert">请先写下你此刻想整理的内容。</p>'
            : ""
        }
        <p class="privacy-note">内容只留在当前页面，刷新或关闭后不会保留。</p>
        <button class="primary-action" type="button" data-submit-current ${commandAttribute("submit-current")}>确认并整理</button>
      </section>
    </main>
  `;
}

function renderCrisisInterruption(): string {
  return `
    <main id="main-content" class="crisis-layout" tabindex="-1">
      <section class="crisis-content" aria-labelledby="crisis-title">
        <p class="eyebrow">需要立即关注</p>
        <h1 id="crisis-title">先停一下</h1>
        <p class="crisis-lead">你写的内容可能表示你正处于危险中。此刻不会继续整理。</p>

        <div class="crisis-actions" aria-labelledby="immediate-help-title">
          <h2 id="immediate-help-title">如果危险就在现在</h2>
          <p>联系当地紧急服务</p>
          <p>请身边可信任的人陪着你</p>
          <p>不要独处</p>
        </div>

        <p class="crisis-limit">此刻不能判断风险，也不能替代紧急帮助。</p>
        <button class="primary-action" type="button" data-crisis-return ${commandAttribute("crisis-return")}>我已看到，返回</button>
        <button class="text-action" type="button" data-crisis-clear ${commandAttribute("crisis-clear")}>清除刚才的内容</button>
      </section>
    </main>
  `;
}

function renderUnderstandingActivity(state: ApplicationState): string {
  if (state.understanding.boundaryNotice) {
    return `
      <main id="main-content" class="activity-layout boundary-layout" tabindex="-1">
        <section class="activity-intro" aria-labelledby="activity-title">
          <p class="eyebrow">This Moment</p>
          <h1 id="activity-title">帮我理解</h1>
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

  if (state.understanding.result) {
    return `
      <main id="main-content" class="activity-layout result-layout" tabindex="-1">
        <section class="activity-intro" aria-labelledby="activity-title">
          <p class="eyebrow">This Moment</p>
          <h1 id="activity-title">帮我理解</h1>
          <p>原话、解释和仍需确认的内容保持分开。</p>
        </section>

        <section class="activity-work reflection-preview" aria-label="解释结果">
          <div class="source-block">
            <h2>原始信息</h2>
            <p>${escapeHtml(state.understanding.input)}</p>
          </div>
          <div class="reflection-section">
            <h2>通俗解释</h2>
            <p>${escapeHtml(state.understanding.result.plainLanguage)}</p>
          </div>
          <div class="reflection-section uncertainty-section">
            <h2>还不能确定</h2>
            <p>${escapeHtml(state.understanding.result.uncertainty)}</p>
          </div>
          <div class="reflection-section confirmation-section">
            <h2>可以向医护确认</h2>
            <p>${escapeHtml(state.understanding.result.confirmationQuestion)}</p>
          </div>
          <div class="preview-actions">
            <button class="primary-action" type="button" data-copy-understand ${commandAttribute("copy-understand")}>确认并复制</button>
            <button class="secondary-action" type="button" data-revise-understand ${commandAttribute("revise-understand")}>返回修改</button>
            <p class="action-feedback" role="status" aria-live="polite">${
              state.understanding.copyFeedback === "success"
                ? "已复制"
                : state.understanding.copyFeedback === "error"
                  ? "复制失败，请手动选择文字。"
                  : ""
            }</p>
          </div>
        </section>
      </main>
    `;
  }

  return `
    <main id="main-content" class="activity-layout" tabindex="-1">
      <section class="activity-intro" aria-labelledby="activity-title">
        <p class="eyebrow">This Moment</p>
        <h1 id="activity-title">帮我理解</h1>
        <p>输入医生原话或医疗说明文字，我们只帮助你读得更清楚。</p>
      </section>

      <section class="activity-work" aria-label="医疗说明文字输入">
        <label for="understand-input">医生原话或医疗说明</label>
        <textarea ${inputIdAttribute("understand-input")} rows="8">${escapeHtml(state.understanding.input)}</textarea>
        ${
          state.understanding.inputError
            ? '<p class="field-error" role="alert">请先输入需要理解的文字。</p>'
            : ""
        }
        <p class="privacy-note">不上传文件，不判断疾病；内容只留在当前页面。</p>
        <button class="primary-action" type="button" data-submit-understand ${commandAttribute("submit-understand")}>确认并解释</button>
      </section>
    </main>
  `;
}

function renderExpressionActivity(state: ApplicationState): string {
  if (state.expression.draft !== undefined) {
    return `
      <main id="main-content" class="activity-layout result-layout" tabindex="-1">
        <section class="activity-intro" aria-labelledby="activity-title">
          <p class="eyebrow">This Moment</p>
          <h1 id="activity-title">我想和某个人说</h1>
          <p>请确认整理后的话仍然是你的意思。</p>
        </section>

        <section class="activity-work expression-preview" aria-label="表达草稿预览">
          <div class="source-block">
            <h2>想对谁说</h2>
            <p>${escapeHtml(state.expression.audience)}</p>
            <h2 class="source-subheading">我最想说</h2>
            <p>${escapeHtml(state.expression.input)}</p>
          </div>
          <div class="draft-editor">
            <label for="expression-draft">整理后的话</label>
            <textarea ${inputIdAttribute("expression-draft")} rows="8">${escapeHtml(state.expression.draft)}</textarea>
            <p class="privacy-note">请确认这些话仍然是你的意思。</p>
          </div>
          <div class="preview-actions">
            <button class="primary-action" type="button" data-copy-expression ${commandAttribute("copy-expression")}>确认并复制</button>
            <button class="secondary-action" type="button" data-revise-expression ${commandAttribute("revise-expression")}>返回修改</button>
            <p class="action-feedback" role="status" aria-live="polite">${
              state.expression.copyFeedback === "success"
                ? "已复制"
                : state.expression.copyFeedback === "error"
                  ? "复制失败，请手动选择文字。"
                  : ""
            }</p>
          </div>
        </section>
      </main>
    `;
  }

  return `
    <main id="main-content" class="activity-layout" tabindex="-1">
      <section class="activity-intro" aria-labelledby="activity-title">
        <p class="eyebrow">This Moment</p>
        <h1 id="activity-title">我想和某个人说</h1>
        <p>写下对象和你最想表达的原话，只整理成一份草稿。</p>
      </section>

      <section class="activity-work expression-form" aria-label="表达内容输入">
        <label for="expression-audience">想对谁说</label>
        <input class="text-input" ${inputIdAttribute("expression-audience")} type="text" value="${escapeHtml(state.expression.audience)}" />
        ${
          state.expression.fieldError === "audience"
            ? '<p class="field-error" role="alert">请先写下想对谁说。</p>'
            : ""
        }
        <label for="expression-input">我最想说</label>
        <textarea ${inputIdAttribute("expression-input")} rows="7">${escapeHtml(state.expression.input)}</textarea>
        ${
          state.expression.fieldError === "input"
            ? '<p class="field-error" role="alert">请先写下最想说的话。</p>'
            : ""
        }
        <p class="privacy-note">不访问联系人，不发送；内容只留在当前页面。</p>
        <button class="primary-action" type="button" data-submit-expression ${commandAttribute("submit-expression")}>确认并整理</button>
      </section>
    </main>
  `;
}

function renderImportantActivity(state: ApplicationState): string {
  if (state.important.previewAll) {
    return `
      <main id="main-content" class="activity-layout result-layout" tabindex="-1">
        <section class="activity-intro" aria-labelledby="activity-title">
          <p class="eyebrow">This Moment</p>
          <h1 id="activity-title">对我重要的事情</h1>
          <p>这是当前会话中整理的全部内容。</p>
        </section>
        <section class="activity-work reflection-preview" aria-label="重要事项最终预览">
          ${state.important.matters
            .map(
              (matter) => `
                <article class="important-item">
                  <h2>${escapeHtml(matter.what)}</h2>
                  <p class="item-label">为什么重要</p>
                  <p>${escapeHtml(matter.why)}</p>
                </article>
              `,
            )
            .join("")}
          <div class="preview-actions">
            <button class="primary-action" type="button" data-copy-important ${commandAttribute("copy-important")}>确认并复制</button>
            <button class="secondary-action" type="button" data-back-important ${commandAttribute("back-important")}>返回修改</button>
            <p class="action-feedback" role="status" aria-live="polite">${
              state.important.copyFeedback === "success"
                ? "已复制"
                : state.important.copyFeedback === "error"
                  ? "复制失败，请手动选择文字。"
                  : ""
            }</p>
          </div>
        </section>
      </main>
    `;
  }

  return `
    <main id="main-content" class="important-page" tabindex="-1">
      <section class="activity-intro" aria-labelledby="activity-title">
        <p class="eyebrow">This Moment</p>
        <h1 id="activity-title">对我重要的事情</h1>
        <p>一次整理一件事，只在当前页面保留。</p>
      </section>

      <div class="important-workspace">
        <section class="important-list" aria-labelledby="important-list-title">
          <h2 id="important-list-title">当前会话</h2>
          ${
            state.important.matters.length === 0
              ? '<p class="empty-state">还没有整理任何事情。</p>'
              : state.important.matters
                  .map(
                    (matter, index) => `
                      <article class="important-item">
                        <h3>${escapeHtml(matter.what)}</h3>
                        <p class="item-label">是什么</p>
                        <p>${escapeHtml(matter.what)}</p>
                        <p class="item-label">为什么重要</p>
                        <p>${escapeHtml(matter.why)}</p>
                        <button class="text-action" type="button" data-important-index="${index}" ${commandAttribute("edit-important")}>修改</button>
                      </article>
                    `,
                  )
                  .join("")
          }
          ${
            state.important.matters.length > 0
              ? `<button class="secondary-action" type="button" data-preview-important ${commandAttribute("preview-important")}>预览全部并复制</button>`
              : ""
          }
        </section>

        <section class="important-editor" aria-labelledby="important-editor-title">
          <h2 id="important-editor-title">${
            state.important.editingIndex === undefined
              ? "还想记下什么？"
              : "修改这件重要的事"
          }</h2>
          <label for="important-input">写下一件事，以及你明确写出的重要原因</label>
          <textarea ${inputIdAttribute("important-input")} rows="8">${escapeHtml(state.important.input)}</textarea>
          ${
            state.important.inputError
              ? '<p class="field-error" role="alert">请先写下想整理的事情。</p>'
              : ""
          }
          <p class="privacy-note">可以用“因为”明确分开事情和原因。</p>
          <button class="primary-action" type="button" data-submit-important ${commandAttribute("submit-important")}>${
            state.important.editingIndex === undefined
              ? "添加一件重要的事"
              : "保存修改"
          }</button>
        </section>
      </div>
    </main>
  `;
}

function renderActivity(state: ApplicationState): string {
  if (state.crisisInterrupted) return renderCrisisInterruption();
  if (state.activeActivity === "current") return renderCurrentActivity(state);
  if (state.activeActivity === "understand") return renderUnderstandingActivity(state);
  if (state.activeActivity === "express") return renderExpressionActivity(state);
  if (state.activeActivity === "important") return renderImportantActivity(state);

  const activity = activities.find(({ id }) => id === state.activeActivity)!;
  return `
    <main id="main-content" class="activity-layout activity-placeholder" tabindex="-1">
      <section class="activity-intro" aria-labelledby="activity-title">
        <p class="eyebrow">This Moment</p>
        <h1 id="activity-title">${activity.label}</h1>
        <p>这个核心活动将在下一步交付。</p>
      </section>
    </main>
  `;
}

export function renderApplicationView(state: ApplicationState): string {
  return `
    <div class="app-shell">
      <header class="app-header${state.crisisInterrupted ? " crisis-header" : ""}">
        <a class="brand" href="#main-content" aria-label="跳到主要内容">此刻</a>
        ${
          state.crisisInterrupted
            ? ""
            : `<nav class="primary-nav" aria-label="核心活动">
          ${activities
            .map(
              (activity) => `
                <button
                  class="nav-item${activity.id === state.activeActivity ? " is-active" : ""}"
                  type="button"
                  data-activity="${activity.id}"
                  aria-current="${activity.id === state.activeActivity ? "page" : "false"}"
                >${activity.label}</button>
              `,
            )
            .join("")}
        </nav>`
        }
      </header>
      ${renderActivity(state)}
    </div>
  `;
}

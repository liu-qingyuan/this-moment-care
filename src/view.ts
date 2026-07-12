import { activities, type ApplicationState } from "./model.ts";

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
            <button class="primary-action" type="button" data-copy-current data-command="copy-current">确认并复制</button>
            <button class="secondary-action" type="button" data-revise-current data-command="revise-current">返回修改</button>
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
        <textarea id="current-input" rows="8">${escapeHtml(state.current.input)}</textarea>
        ${
          state.current.inputError
            ? '<p class="field-error" role="alert">请先写下你此刻想整理的内容。</p>'
            : ""
        }
        <p class="privacy-note">内容只留在当前页面，刷新或关闭后不会保留。</p>
        <button class="primary-action" type="button" data-submit-current data-command="submit-current">确认并整理</button>
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
        <button class="primary-action" type="button" data-crisis-return data-command="crisis-return">我已看到，返回</button>
        <button class="text-action" type="button" data-crisis-clear data-command="crisis-clear">清除刚才的内容</button>
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
          <button class="secondary-action" type="button" data-revise-understand data-command="revise-understand">返回修改</button>
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
            <button class="primary-action" type="button" data-copy-understand data-command="copy-understand">确认并复制</button>
            <button class="secondary-action" type="button" data-revise-understand data-command="revise-understand">返回修改</button>
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
        <textarea id="understand-input" rows="8">${escapeHtml(state.understanding.input)}</textarea>
        ${
          state.understanding.inputError
            ? '<p class="field-error" role="alert">请先输入需要理解的文字。</p>'
            : ""
        }
        <p class="privacy-note">不上传文件，不判断疾病；内容只留在当前页面。</p>
        <button class="primary-action" type="button" data-submit-understand data-command="submit-understand">确认并解释</button>
      </section>
    </main>
  `;
}

function renderActivity(state: ApplicationState): string {
  if (state.crisisInterrupted) return renderCrisisInterruption();
  if (state.activeActivity === "current") return renderCurrentActivity(state);
  if (state.activeActivity === "understand") return renderUnderstandingActivity(state);

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

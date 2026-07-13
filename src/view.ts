import { activities, type ApplicationState } from "./model.ts";
import { renderCrisisInterruption } from "./views/crisis.ts";
import { renderCurrentActivity } from "./views/current.ts";
import { renderExpressionActivity } from "./views/expression.ts";
import { renderImportantActivity } from "./views/important.ts";
import { renderUnderstandingActivity } from "./views/understanding.ts";

function renderActivity(state: ApplicationState): string {
  if (state.crisisInterrupted) return renderCrisisInterruption();
  if (state.activeActivity === "current") return renderCurrentActivity(state.current);
  if (state.activeActivity === "understand") {
    return renderUnderstandingActivity(state.understanding);
  }
  if (state.activeActivity === "express") {
    return renderExpressionActivity(state.expression);
  }
  return renderImportantActivity(state.important);
}

export function renderApplicationView(state: ApplicationState): string {
  return `
    <div class="app-shell activity-${state.crisisInterrupted ? "crisis" : state.activeActivity}">
      <a class="skip-link" href="#main-content">跳到主要内容</a>
      <header class="app-header${state.crisisInterrupted ? " crisis-header" : ""}">
        <a class="brand" href="#main-content" aria-label="This Moment 此刻">
          <span class="brand-mark" aria-hidden="true">此</span>
          <span class="brand-wordmark"><strong>This Moment</strong><small>此刻</small></span>
        </a>
        ${
          state.crisisInterrupted
            ? ""
            : `<nav class="primary-nav" aria-label="核心活动">
          ${activities
            .map(
              (activity, index) => `<button class="nav-item${activity.id === state.activeActivity ? " is-active" : ""}" type="button" data-activity="${activity.id}" data-index="0${index + 1}" data-icon="${["叶", "书", "言", "星"][index]}" data-short-label="${["此刻", "理解", "表达", "重要"][index]}" aria-current="${activity.id === state.activeActivity ? "page" : "false"}"><span>${activity.label}</span></button>`,
            )
            .join("")}
        </nav>`
        }
      </header>
      ${renderActivity(state)}
    </div>
  `;
}

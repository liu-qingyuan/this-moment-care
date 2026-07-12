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
    <div class="app-shell">
      <header class="app-header${state.crisisInterrupted ? " crisis-header" : ""}">
        <a class="brand" href="#main-content" aria-label="跳到主要内容">此刻</a>
        ${
          state.crisisInterrupted
            ? ""
            : `<nav class="primary-nav" aria-label="核心活动">
          ${activities
            .map(
              (activity) => `<button class="nav-item${activity.id === state.activeActivity ? " is-active" : ""}" type="button" data-activity="${activity.id}" aria-current="${activity.id === state.activeActivity ? "page" : "false"}">${activity.label}</button>`,
            )
            .join("")}
        </nav>`
        }
      </header>
      ${renderActivity(state)}
    </div>
  `;
}

import {
  formatOrganizedReflection,
  hasExplicitCrisisSignal,
  organizeReflection,
  type OrganizedReflection,
} from "./domain.ts";

const activities = [
  { id: "current", label: "此刻的我" },
  { id: "understand", label: "帮我理解" },
  { id: "express", label: "我想和某个人说" },
  { id: "important", label: "对我重要的事情" },
] as const;

type ActivityId = (typeof activities)[number]["id"];

interface ClipboardPort {
  writeText(text: string): Promise<void>;
}

interface AppDependencies {
  clipboard?: ClipboardPort;
}

interface ApplicationState {
  activeActivity: ActivityId;
  currentInput: string;
  currentResult?: OrganizedReflection;
  crisisInterrupted: boolean;
  copyFeedback?: "success" | "error";
  inputError: boolean;
}

const browserClipboard: ClipboardPort = {
  async writeText(text) {
    if (!navigator.clipboard) {
      throw new Error("Clipboard API is unavailable");
    }
    await navigator.clipboard.writeText(text);
  },
};

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
  if (state.currentResult) {
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
            <p>${escapeHtml(state.currentInput)}</p>
          </div>
          <div class="reflection-section">
            <h2>我正在感受</h2>
            <p>${escapeHtml(state.currentResult.feelings)}</p>
          </div>
          <div class="reflection-section">
            <h2>我在担心</h2>
            <p>${escapeHtml(state.currentResult.worries)}</p>
          </div>
          <div class="reflection-section">
            <h2>我现在希望</h2>
            <p>${escapeHtml(state.currentResult.hopes)}</p>
          </div>
          <div class="preview-actions">
            <button class="primary-action" type="button" data-copy-current>确认并复制</button>
            <button class="secondary-action" type="button" data-revise-current>返回修改</button>
            <p class="action-feedback" role="status" aria-live="polite">${
              state.copyFeedback === "success"
                ? "已复制"
                : state.copyFeedback === "error"
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
        <textarea id="current-input" rows="8">${escapeHtml(state.currentInput)}</textarea>
        ${
          state.inputError
            ? '<p class="field-error" role="alert">请先写下你此刻想整理的内容。</p>'
            : ""
        }
        <p class="privacy-note">内容只留在当前页面，刷新或关闭后不会保留。</p>
        <button class="primary-action" type="button" data-submit-current>确认并整理</button>
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
        <button class="primary-action" type="button" data-crisis-return>我已看到，返回</button>
        <button class="text-action" type="button" data-crisis-clear>清除刚才的内容</button>
      </section>
    </main>
  `;
}

function renderActivity(state: ApplicationState): string {
  if (state.crisisInterrupted) {
    return renderCrisisInterruption();
  }

  if (state.activeActivity === "current") {
    return renderCurrentActivity(state);
  }

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

export function renderApp(
  root: HTMLElement,
  dependencies: AppDependencies = {},
): void {
  const clipboard = dependencies.clipboard ?? browserClipboard;
  const state: ApplicationState = {
    activeActivity: "current",
    currentInput: "",
    crisisInterrupted: false,
    inputError: false,
  };

  const render = () => {
    root.innerHTML = `
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

    root.querySelectorAll<HTMLButtonElement>("[data-activity]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeActivity = button.dataset.activity as ActivityId;
        render();
        root.querySelector<HTMLElement>("#main-content")?.focus();
      });
    });

    const input = root.querySelector<HTMLTextAreaElement>("#current-input");
    input?.addEventListener("input", () => {
      state.currentInput = input.value;
    });

    root
      .querySelector<HTMLButtonElement>("[data-submit-current]")
      ?.addEventListener("click", () => {
        state.currentInput = input?.value.trim() ?? "";
        if (!state.currentInput) {
          state.inputError = true;
          render();
          root.querySelector<HTMLTextAreaElement>("#current-input")?.focus();
          return;
        }
        state.inputError = false;
        if (hasExplicitCrisisSignal(state.currentInput)) {
          state.crisisInterrupted = true;
          state.currentResult = undefined;
          render();
          root.querySelector<HTMLElement>(".crisis-layout")?.focus();
          return;
        }
        state.currentResult = organizeReflection(state.currentInput);
        state.copyFeedback = undefined;
        render();
        root.querySelector<HTMLElement>(".result-layout")?.focus();
      });

    root
      .querySelector<HTMLButtonElement>("[data-copy-current]")
      ?.addEventListener("click", async () => {
        if (!state.currentResult) return;
        try {
          await clipboard.writeText(
            formatOrganizedReflection(state.currentInput, state.currentResult),
          );
          state.copyFeedback = "success";
        } catch {
          state.copyFeedback = "error";
        }
        render();
        root
          .querySelector<HTMLButtonElement>("[data-copy-current]")
          ?.focus();
      });

    root
      .querySelector<HTMLButtonElement>("[data-revise-current]")
      ?.addEventListener("click", () => {
        state.currentResult = undefined;
        state.copyFeedback = undefined;
        render();
        root.querySelector<HTMLTextAreaElement>("#current-input")?.focus();
      });

    root
      .querySelector<HTMLButtonElement>("[data-crisis-return]")
      ?.addEventListener("click", () => {
        state.crisisInterrupted = false;
        render();
        root.querySelector<HTMLTextAreaElement>("#current-input")?.focus();
      });

    root
      .querySelector<HTMLButtonElement>("[data-crisis-clear]")
      ?.addEventListener("click", () => {
        state.currentInput = "";
        state.currentResult = undefined;
        state.inputError = false;
        state.crisisInterrupted = false;
        render();
        root.querySelector<HTMLTextAreaElement>("#current-input")?.focus();
      });
  };

  render();
}

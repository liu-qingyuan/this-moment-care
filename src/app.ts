import {
  explainMedicalText,
  formatMedicalExplanation,
  formatOrganizedReflection,
  hasExplicitCrisisSignal,
  isUnsupportedMedicalRequest,
  organizeReflection,
} from "./domain.ts";
import { type ActivityId, type ApplicationState } from "./model.ts";
import { renderApplicationView } from "./view.ts";

interface ClipboardPort {
  writeText(text: string): Promise<void>;
}

interface AppDependencies {
  clipboard?: ClipboardPort;
}

const browserClipboard: ClipboardPort = {
  async writeText(text) {
    if (!navigator.clipboard) {
      throw new Error("Clipboard API is unavailable");
    }
    await navigator.clipboard.writeText(text);
  },
};

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
    understandingInput: "",
    understandingInputError: false,
    understandingBoundaryNotice: false,
  };

  const render = () => {
    root.innerHTML = renderApplicationView(state);

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
        state.currentInput = input?.value ?? "";
        if (!state.currentInput.trim()) {
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

    const understandingInput =
      root.querySelector<HTMLTextAreaElement>("#understand-input");
    understandingInput?.addEventListener("input", () => {
      state.understandingInput = understandingInput.value;
    });

    root
      .querySelector<HTMLButtonElement>("[data-submit-understand]")
      ?.addEventListener("click", () => {
        state.understandingInput = understandingInput?.value ?? "";
        if (!state.understandingInput.trim()) {
          state.understandingInputError = true;
          render();
          root.querySelector<HTMLTextAreaElement>("#understand-input")?.focus();
          return;
        }
        state.understandingInputError = false;
        if (hasExplicitCrisisSignal(state.understandingInput)) {
          state.crisisInterrupted = true;
          state.understandingResult = undefined;
          state.understandingBoundaryNotice = false;
          render();
          root.querySelector<HTMLElement>(".crisis-layout")?.focus();
          return;
        }
        if (isUnsupportedMedicalRequest(state.understandingInput)) {
          state.understandingBoundaryNotice = true;
          state.understandingResult = undefined;
          render();
          root.querySelector<HTMLElement>(".boundary-layout")?.focus();
          return;
        }
        state.understandingBoundaryNotice = false;
        state.understandingResult = explainMedicalText(state.understandingInput);
        state.understandingCopyFeedback = undefined;
        render();
        root.querySelector<HTMLElement>(".result-layout")?.focus();
      });

    root
      .querySelector<HTMLButtonElement>("[data-revise-understand]")
      ?.addEventListener("click", () => {
        state.understandingResult = undefined;
        state.understandingCopyFeedback = undefined;
        state.understandingBoundaryNotice = false;
        render();
        root.querySelector<HTMLTextAreaElement>("#understand-input")?.focus();
      });

    root
      .querySelector<HTMLButtonElement>("[data-copy-understand]")
      ?.addEventListener("click", async () => {
        if (!state.understandingResult) return;
        try {
          await clipboard.writeText(
            formatMedicalExplanation(
              state.understandingInput,
              state.understandingResult,
            ),
          );
          state.understandingCopyFeedback = "success";
        } catch {
          state.understandingCopyFeedback = "error";
        }
        render();
        root
          .querySelector<HTMLButtonElement>("[data-copy-understand]")
          ?.focus();
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
        const inputSelector =
          state.activeActivity === "understand"
            ? "#understand-input"
            : "#current-input";
        root.querySelector<HTMLTextAreaElement>(inputSelector)?.focus();
      });

    root
      .querySelector<HTMLButtonElement>("[data-crisis-clear]")
      ?.addEventListener("click", () => {
        if (state.activeActivity === "understand") {
          state.understandingInput = "";
          state.understandingResult = undefined;
          state.understandingBoundaryNotice = false;
          state.understandingInputError = false;
        } else {
          state.currentInput = "";
          state.currentResult = undefined;
          state.inputError = false;
        }
        state.crisisInterrupted = false;
        render();
        const inputSelector =
          state.activeActivity === "understand"
            ? "#understand-input"
            : "#current-input";
        root.querySelector<HTMLTextAreaElement>(inputSelector)?.focus();
      });
  };

  render();
}

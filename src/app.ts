import {
  createExpressionDraft,
  createImportantMatter,
  explainMedicalText,
  formatMedicalExplanation,
  formatImportantMatters,
  formatOrganizedReflection,
  hasExplicitCrisisSignal,
  isUnsupportedMedicalRequest,
  organizeReflection,
} from "./domain.ts";
import {
  type ActivityId,
  type ActivityState,
  type ApplicationState,
  type CommandId,
  type InputId,
} from "./model.ts";
import { renderApplicationView } from "./view.ts";

interface ClipboardPort {
  writeText(text: string): Promise<void>;
}

interface AppDependencies {
  clipboard?: ClipboardPort;
}

interface ActivityControl {
  inputSelector: string;
  clear(): void;
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
    current: { input: "", inputError: false },
    understanding: {
      input: "",
      inputError: false,
      boundaryNotice: false,
    },
    expression: {
      audience: "",
      input: "",
    },
    important: {
      input: "",
      matters: [],
      previewAll: false,
      inputError: false,
    },
    crisisInterrupted: false,
  };

  const activityControls: Partial<Record<ActivityId, ActivityControl>> = {
    current: {
      inputSelector: "#current-input",
      clear() {
        state.current = { input: "", inputError: false };
      },
    },
    understand: {
      inputSelector: "#understand-input",
      clear() {
        state.understanding = {
          input: "",
          inputError: false,
          boundaryNotice: false,
        };
      },
    },
    express: {
      inputSelector: "#expression-input",
      clear() {
        state.expression = { audience: "", input: "" };
      },
    },
    important: {
      inputSelector: "#important-input",
      clear() {
        state.important.input = "";
        state.important.editingIndex = undefined;
        state.important.previewAll = false;
        state.important.inputError = false;
      },
    },
  };

  const render = (focusSelector?: string) => {
    root.innerHTML = renderApplicationView(state);
    if (focusSelector) {
      root.querySelector<HTMLElement>(focusSelector)?.focus();
    }
  };

  const readInput = (selector: string): string =>
    root.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)?.value ??
    "";

  const requireInput = (
    activityState: ActivityState<unknown>,
    selector: string,
  ): boolean => {
    activityState.input = readInput(selector);
    if (activityState.input.trim()) {
      activityState.inputError = false;
      return true;
    }
    activityState.inputError = true;
    render(selector);
    return false;
  };

  const enterCrisis = (clearActivityResult: () => void) => {
    clearActivityResult();
    state.crisisInterrupted = true;
    render(".crisis-layout");
  };

  const copyText = async (
    text: string,
    setFeedback: (feedback: "success" | "error") => void,
    focusSelector: string,
  ) => {
    try {
      await clipboard.writeText(text);
      setFeedback("success");
    } catch {
      setFeedback("error");
    }
    render(focusSelector);
  };

  const importantIndexFrom = (
    button: HTMLButtonElement,
  ): number | undefined => {
    const value = button.dataset.importantIndex;
    if (!value || !/^\d+$/u.test(value)) return undefined;
    const index = Number(value);
    return Number.isSafeInteger(index) ? index : undefined;
  };

  const commandHandlers: Record<
    CommandId,
    (button: HTMLButtonElement) => void | Promise<void>
  > = {
    "submit-current": () => {
      if (!requireInput(state.current, "#current-input")) return;
      if (hasExplicitCrisisSignal(state.current.input)) {
        enterCrisis(() => {
          state.current.result = undefined;
        });
        return;
      }
      state.current.result = organizeReflection(state.current.input);
      state.current.copyFeedback = undefined;
      render(".result-layout");
    },
    "copy-current": () => {
      if (!state.current.result) return;
      return copyText(
        formatOrganizedReflection(state.current.input, state.current.result),
        (feedback) => {
          state.current.copyFeedback = feedback;
        },
        "[data-copy-current]",
      );
    },
    "revise-current": () => {
      state.current.result = undefined;
      state.current.copyFeedback = undefined;
      render("#current-input");
    },
    "submit-understand": () => {
      if (!requireInput(state.understanding, "#understand-input")) return;
      if (hasExplicitCrisisSignal(state.understanding.input)) {
        enterCrisis(() => {
          state.understanding.result = undefined;
          state.understanding.boundaryNotice = false;
        });
        return;
      }
      if (isUnsupportedMedicalRequest(state.understanding.input)) {
        state.understanding.boundaryNotice = true;
        state.understanding.result = undefined;
        render(".boundary-layout");
        return;
      }
      state.understanding.boundaryNotice = false;
      state.understanding.result = explainMedicalText(state.understanding.input);
      state.understanding.copyFeedback = undefined;
      render(".result-layout");
    },
    "copy-understand": () => {
      if (!state.understanding.result) return;
      return copyText(
        formatMedicalExplanation(
          state.understanding.input,
          state.understanding.result,
        ),
        (feedback) => {
          state.understanding.copyFeedback = feedback;
        },
        "[data-copy-understand]",
      );
    },
    "revise-understand": () => {
      state.understanding.result = undefined;
      state.understanding.copyFeedback = undefined;
      state.understanding.boundaryNotice = false;
      render("#understand-input");
    },
    "submit-expression": () => {
      state.expression.audience = readInput("#expression-audience");
      state.expression.input = readInput("#expression-input");
      if (!state.expression.audience.trim()) {
        state.expression.fieldError = "audience";
        render("#expression-audience");
        return;
      }
      if (!state.expression.input.trim()) {
        state.expression.fieldError = "input";
        render("#expression-input");
        return;
      }
      state.expression.fieldError = undefined;
      if (hasExplicitCrisisSignal(state.expression.input)) {
        enterCrisis(() => {
          state.expression.draft = undefined;
        });
        return;
      }
      state.expression.draft = createExpressionDraft(
        state.expression.audience,
        state.expression.input,
      );
      state.expression.copyFeedback = undefined;
      render(".result-layout");
    },
    "copy-expression": () => {
      if (state.expression.draft === undefined) return;
      return copyText(
        state.expression.draft,
        (feedback) => {
          state.expression.copyFeedback = feedback;
        },
        "[data-copy-expression]",
      );
    },
    "revise-expression": () => {
      state.expression.draft = undefined;
      state.expression.copyFeedback = undefined;
      render("#expression-input");
    },
    "submit-important": () => {
      state.important.input = readInput("#important-input");
      if (!state.important.input.trim()) {
        state.important.inputError = true;
        render("#important-input");
        return;
      }
      state.important.inputError = false;
      if (hasExplicitCrisisSignal(state.important.input)) {
        enterCrisis(() => {
          state.important.previewAll = false;
        });
        return;
      }
      const matter = createImportantMatter(state.important.input);
      if (state.important.editingIndex === undefined) {
        state.important.matters.push(matter);
      } else {
        state.important.matters[state.important.editingIndex] = matter;
      }
      state.important.input = "";
      state.important.editingIndex = undefined;
      state.important.copyFeedback = undefined;
      render("#important-input");
    },
    "edit-important": (button) => {
      const index = importantIndexFrom(button);
      if (index === undefined) return;
      const matter = state.important.matters[index];
      if (!matter) return;
      state.important.editingIndex = index;
      state.important.input = matter.original;
      render("#important-input");
    },
    "preview-important": () => {
      if (state.important.matters.length === 0) return;
      state.important.previewAll = true;
      state.important.copyFeedback = undefined;
      render(".result-layout");
    },
    "copy-important": () => {
      if (state.important.matters.length === 0) return;
      return copyText(
        formatImportantMatters(state.important.matters),
        (feedback) => {
          state.important.copyFeedback = feedback;
        },
        "[data-copy-important]",
      );
    },
    "back-important": () => {
      state.important.previewAll = false;
      state.important.copyFeedback = undefined;
      render("#important-input");
    },
    "crisis-return": () => {
      state.crisisInterrupted = false;
      render(activityControls[state.activeActivity]?.inputSelector);
    },
    "crisis-clear": () => {
      activityControls[state.activeActivity]?.clear();
      state.crisisInterrupted = false;
      render(activityControls[state.activeActivity]?.inputSelector);
    },
  };

  const inputBindings: Record<InputId, (value: string) => void> = {
    "current-input": (value) => {
      state.current.input = value;
    },
    "understand-input": (value) => {
      state.understanding.input = value;
    },
    "expression-audience": (value) => {
      state.expression.audience = value;
    },
    "expression-input": (value) => {
      state.expression.input = value;
    },
    "expression-draft": (value) => {
      state.expression.draft = value;
    },
    "important-input": (value) => {
      state.important.input = value;
    },
  };

  root.addEventListener("input", (event) => {
    const input = event.target;
    if (
      !(input instanceof HTMLTextAreaElement) &&
      !(input instanceof HTMLInputElement)
    ) {
      return;
    }
    inputBindings[input.id as InputId]?.(input.value);
  });

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>("button");
    if (!button || !root.contains(button)) return;

    if (button.dataset.activity) {
      state.activeActivity = button.dataset.activity as ActivityId;
      render("#main-content");
      return;
    }

    const command = button.dataset.command as CommandId | undefined;
    if (command) void commandHandlers[command]?.(button);
  });

  render();
}

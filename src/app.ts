import {
  createExpressionDraft,
  explainMedicalText,
  formatMedicalExplanation,
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

  const commandHandlers: Record<CommandId, () => void | Promise<void>> = {
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
    if (command) void commandHandlers[command]?.();
  });

  render();
}

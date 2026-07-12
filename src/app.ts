import {
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
  };

  const render = (focusSelector?: string) => {
    root.innerHTML = renderApplicationView(state);
    if (focusSelector) {
      root.querySelector<HTMLElement>(focusSelector)?.focus();
    }
  };

  const readInput = (selector: string): string =>
    root.querySelector<HTMLTextAreaElement>(selector)?.value ?? "";

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

  const enterCrisis = (
    activityState: ActivityState<unknown>,
    clearAdditionalState?: () => void,
  ) => {
    activityState.result = undefined;
    clearAdditionalState?.();
    state.crisisInterrupted = true;
    render(".crisis-layout");
  };

  const copyResult = async (
    text: string,
    activityState: ActivityState<unknown>,
    focusSelector: string,
  ) => {
    try {
      await clipboard.writeText(text);
      activityState.copyFeedback = "success";
    } catch {
      activityState.copyFeedback = "error";
    }
    render(focusSelector);
  };

  const commandHandlers: Record<CommandId, () => void | Promise<void>> = {
    "submit-current": () => {
      if (!requireInput(state.current, "#current-input")) return;
      if (hasExplicitCrisisSignal(state.current.input)) {
        enterCrisis(state.current);
        return;
      }
      state.current.result = organizeReflection(state.current.input);
      state.current.copyFeedback = undefined;
      render(".result-layout");
    },
    "copy-current": () => {
      if (!state.current.result) return;
      return copyResult(
        formatOrganizedReflection(state.current.input, state.current.result),
        state.current,
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
        enterCrisis(state.understanding, () => {
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
      return copyResult(
        formatMedicalExplanation(
          state.understanding.input,
          state.understanding.result,
        ),
        state.understanding,
        "[data-copy-understand]",
      );
    },
    "revise-understand": () => {
      state.understanding.result = undefined;
      state.understanding.copyFeedback = undefined;
      state.understanding.boundaryNotice = false;
      render("#understand-input");
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

  const inputBindings: Record<string, (value: string) => void> = {
    "current-input": (value) => {
      state.current.input = value;
    },
    "understand-input": (value) => {
      state.understanding.input = value;
    },
  };

  root.addEventListener("input", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLTextAreaElement)) return;
    inputBindings[input.id]?.(input.value);
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

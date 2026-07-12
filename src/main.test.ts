// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "./app.ts";

describe("This Moment", () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="app"></main>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("opens the current-moment activity with all four activities available", () => {
    const root = document.querySelector<HTMLElement>("#app");
    expect(root).not.toBeNull();

    renderApp(root!);

    expect(root!.textContent).toContain("此刻");
    expect(root!.querySelector("h1")?.textContent).toBe("此刻的我");
    expect(
      Array.from(root!.querySelectorAll("nav button"), (button) =>
        button.textContent?.trim(),
      ),
    ).toEqual([
      "此刻的我",
      "帮我理解",
      "我想和某个人说",
      "对我重要的事情",
    ]);
  });

  it("switches directly between core activities", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root);

    const understand = Array.from(
      root.querySelectorAll<HTMLButtonElement>("nav button"),
    ).find((button) => button.textContent?.trim() === "帮我理解");
    expect(understand).toBeDefined();

    understand!.click();

    expect(root.querySelector("h1")?.textContent).toBe("帮我理解");
    expect(
      root.querySelector('nav button[aria-current="page"]')?.textContent?.trim(),
    ).toBe("帮我理解");
    expect(document.activeElement).toBe(
      root.querySelector<HTMLElement>("#main-content"),
    );
  });

  it("organizes original information into feelings, worries, and hopes", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root);

    const original =
      "我有点害怕，也不想让家里人太担心。我希望今天能安静一点。";
    const input = root.querySelector<HTMLTextAreaElement>("#current-input")!;
    input.value = original;
    root.querySelector<HTMLButtonElement>(".primary-action")!.click();

    expect(root.textContent).toContain("原始信息");
    expect(root.textContent).toContain(original);
    expect(root.textContent).toContain("我正在感受");
    expect(root.textContent).toContain("我在担心");
    expect(root.textContent).toContain("我现在希望");
  });

  it("moves focus to the result preview after generation", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root);

    const input = root.querySelector<HTMLTextAreaElement>("#current-input")!;
    input.value = "我觉得累。我希望今天安静一点。";
    root.querySelector<HTMLButtonElement>("[data-submit-current]")!.click();

    expect(document.activeElement).toBe(
      root.querySelector<HTMLElement>(".result-layout"),
    );
  });

  it("interrupts ordinary generation for an explicit crisis signal", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root);

    const input = root.querySelector<HTMLTextAreaElement>("#current-input")!;
    input.value = "我现在要伤害自己";
    root.querySelector<HTMLButtonElement>(".primary-action")!.click();

    expect(root.querySelector("h1")?.textContent).toBe("先停一下");
    expect(root.textContent).toContain("联系当地紧急服务");
    expect(root.textContent).toContain("请身边可信任的人陪着你");
    expect(root.textContent).not.toContain("我正在感受");
    expect(document.activeElement).toBe(
      root.querySelector<HTMLElement>(".crisis-layout"),
    );
  });

  it("uses the same interruption for an explicit medical emergency", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root);

    const input = root.querySelector<HTMLTextAreaElement>("#current-input")!;
    input.value = "我现在无法呼吸";
    root.querySelector<HTMLButtonElement>("[data-submit-current]")!.click();

    expect(root.querySelector("h1")?.textContent).toBe("先停一下");
    expect(root.textContent).toContain("联系当地紧急服务");
  });

  it("interrupts when the person explicitly says they want to self-harm", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root);

    const input = root.querySelector<HTMLTextAreaElement>("#current-input")!;
    input.value = "我想伤害自己";
    root.querySelector<HTMLButtonElement>("[data-submit-current]")!.click();

    expect(root.querySelector("h1")?.textContent).toBe("先停一下");
  });

  it("returns from a crisis interruption without discarding the input", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root);

    const input = root.querySelector<HTMLTextAreaElement>("#current-input")!;
    input.value = "我现在要伤害自己";
    root.querySelector<HTMLButtonElement>(".primary-action")!.click();
    root
      .querySelector<HTMLButtonElement>("[data-crisis-return]")!
      .click();

    expect(root.querySelector("h1")?.textContent).toBe("此刻的我");
    expect(root.querySelector<HTMLTextAreaElement>("#current-input")?.value).toBe(
      "我现在要伤害自己",
    );
  });

  it("clears crisis input when the person chooses to remove it", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root);

    const input = root.querySelector<HTMLTextAreaElement>("#current-input")!;
    input.value = "我现在要伤害自己";
    root.querySelector<HTMLButtonElement>("[data-submit-current]")!.click();
    root.querySelector<HTMLButtonElement>("[data-crisis-clear]")!.click();

    expect(root.querySelector("h1")?.textContent).toBe("此刻的我");
    expect(root.querySelector<HTMLTextAreaElement>("#current-input")?.value).toBe(
      "",
    );
  });

  it("copies only after confirmation from the final preview", async () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    const writes: string[] = [];
    renderApp(root, {
      clipboard: {
        writeText: async (text) => {
          writes.push(text);
        },
      },
    });

    const input = root.querySelector<HTMLTextAreaElement>("#current-input")!;
    input.value = "我觉得累。我担心家里人。我希望今天安静一点。";
    root.querySelector<HTMLButtonElement>("[data-submit-current]")!.click();
    expect(writes).toEqual([]);

    root.querySelector<HTMLButtonElement>("[data-copy-current]")!.click();
    await Promise.resolve();

    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain("原始信息");
    expect(writes[0]).toContain("我现在希望");
    expect(root.textContent).toContain("已复制");
    expect(document.activeElement).toBe(
      root.querySelector<HTMLButtonElement>("[data-copy-current]"),
    );
  });

  it("returns to editing without losing original information", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root);

    const original = "我觉得累，但希望今天能见到家里人。";
    const input = root.querySelector<HTMLTextAreaElement>("#current-input")!;
    input.value = original;
    root.querySelector<HTMLButtonElement>("[data-submit-current]")!.click();
    root.querySelector<HTMLButtonElement>("[data-revise-current]")!.click();

    expect(root.querySelector<HTMLTextAreaElement>("#current-input")?.value).toBe(
      original,
    );
  });

  it("keeps focus on the input when there is nothing to organize", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root);

    root.querySelector<HTMLButtonElement>("[data-submit-current]")!.click();

    const input = root.querySelector<HTMLTextAreaElement>("#current-input")!;
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      "请先写下",
    );
    expect(document.activeElement).toBe(input);
  });

  it("starts a fresh render without previous session content", () => {
    const firstRoot = document.querySelector<HTMLElement>("#app")!;
    renderApp(firstRoot);
    const input = firstRoot.querySelector<HTMLTextAreaElement>("#current-input")!;
    input.value = "这是一段只属于当前会话的内容。";
    firstRoot
      .querySelector<HTMLButtonElement>("[data-submit-current]")!
      .click();

    document.body.innerHTML = '<main id="app"></main>';
    const freshRoot = document.querySelector<HTMLElement>("#app")!;
    renderApp(freshRoot);

    expect(
      freshRoot.querySelector<HTMLTextAreaElement>("#current-input")?.value,
    ).toBe("");
    expect(freshRoot.textContent).not.toContain("这是一段只属于当前会话的内容。");
  });

  it("does not write session content to browser persistence APIs", () => {
    const localStorageWrite = vi.fn();
    const sessionStorageWrite = vi.fn();
    const indexedDbOpen = vi.fn();
    vi.stubGlobal("localStorage", { setItem: localStorageWrite });
    vi.stubGlobal("sessionStorage", { setItem: sessionStorageWrite });
    vi.stubGlobal("indexedDB", { open: indexedDbOpen });
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root);

    const input = root.querySelector<HTMLTextAreaElement>("#current-input")!;
    input.value = "这是一段敏感内容。我希望今天安静一点。";
    root.querySelector<HTMLButtonElement>("[data-submit-current]")!.click();

    expect(localStorageWrite).not.toHaveBeenCalled();
    expect(sessionStorageWrite).not.toHaveBeenCalled();
    expect(indexedDbOpen).not.toHaveBeenCalled();
    expect(document.cookie).toBe("");
  });

  it("reports clipboard failure without leaving the preview", async () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root, {
      clipboard: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    });

    const input = root.querySelector<HTMLTextAreaElement>("#current-input")!;
    input.value = "我觉得累，但希望今天安静一点。";
    root.querySelector<HTMLButtonElement>("[data-submit-current]")!.click();
    root.querySelector<HTMLButtonElement>("[data-copy-current]")!.click();
    await Promise.resolve();

    expect(root.textContent).toContain("复制失败");
    expect(root.textContent).toContain("我现在希望");
  });

  it("renders original information as text rather than executable markup", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root);

    const original = '<img src="x" onerror="alert(1)">我希望安静一点。';
    const input = root.querySelector<HTMLTextAreaElement>("#current-input")!;
    input.value = original;
    root.querySelector<HTMLButtonElement>("[data-submit-current]")!.click();

    expect(root.querySelector(".source-block img")).toBeNull();
    expect(root.querySelector(".source-block")?.textContent).toContain(original);
  });
});

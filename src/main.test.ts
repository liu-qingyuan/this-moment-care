// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "./app.ts";

function openActivity(root: HTMLElement, label: string): void {
  const button = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-activity]"),
  ).find((candidate) => candidate.textContent?.trim() === label);
  expect(button).toBeDefined();
  button!.click();
}

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

  it("separates doctor wording from explanation, uncertainty, and questions", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root);
    openActivity(root, "帮我理解");

    const original = "接下来以舒适为主，我们会继续观察症状变化。";
    const input = root.querySelector<HTMLTextAreaElement>("#understand-input")!;
    input.value = original;
    root.querySelector<HTMLButtonElement>("[data-submit-understand]")!.click();

    expect(root.querySelector(".source-block p")?.textContent).toBe(original);
    expect(root.textContent).toContain("通俗解释");
    expect(root.textContent).toContain("还不能确定");
    expect(root.textContent).toContain("可以向医护确认");
    expect(root.textContent).toContain("更重视让你舒服一些");
  });

  it("does not recast unrelated medical text as a care arrangement", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root);
    openActivity(root, "帮我理解");

    const input = root.querySelector<HTMLTextAreaElement>("#understand-input")!;
    input.value = "检查结果显示白细胞偏低。";
    root.querySelector<HTMLButtonElement>("[data-submit-understand]")!.click();

    expect(root.textContent).toContain("白细胞数量低于常见参考范围");
    expect(root.textContent).not.toContain("接下来的照护安排");
  });

  it("refuses open diagnostic requests instead of explaining them", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root);
    openActivity(root, "帮我理解");

    const input = root.querySelector<HTMLTextAreaElement>("#understand-input")!;
    input.value = "我得了什么病？";
    root.querySelector<HTMLButtonElement>("[data-submit-understand]")!.click();

    expect(root.textContent).toContain("不能判断疾病、预后或治疗");
    expect(root.textContent).toContain("请输入医生原话或医疗说明文字");
    expect(root.textContent).not.toContain("通俗解释");
  });

  it("refuses requests for a treatment decision", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root);
    openActivity(root, "帮我理解");

    const input = root.querySelector<HTMLTextAreaElement>("#understand-input")!;
    input.value = "我应该接受化疗吗？";
    root.querySelector<HTMLButtonElement>("[data-submit-understand]")!.click();

    expect(root.textContent).toContain("不能判断疾病、预后或治疗");
    expect(root.textContent).not.toContain("通俗解释");
  });

  it("accepts prognosis wording when it is clearly presented as a doctor quote", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root);
    openActivity(root, "帮我理解");

    const input = root.querySelector<HTMLTextAreaElement>("#understand-input")!;
    input.value = "医生说现在还不能确定还能活多久。";
    root.querySelector<HTMLButtonElement>("[data-submit-understand]")!.click();

    expect(root.textContent).toContain("通俗解释");
    expect(root.textContent).not.toContain("这里不能替你判断");
  });

  it.each([
    "我要不要化疗？",
    "我需要做手术吗？",
    "请问我是不是癌症？",
    "可以告诉我还有多长时间吗？",
  ])("refuses another explicit medical decision request: %s", (request) => {
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root);
    openActivity(root, "帮我理解");

    const input = root.querySelector<HTMLTextAreaElement>("#understand-input")!;
    input.value = request;
    root.querySelector<HTMLButtonElement>("[data-submit-understand]")!.click();

    expect(root.textContent).toContain("不能判断疾病、预后或治疗");
  });

  it("creates one expression draft for a conversation audience", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root);
    openActivity(root, "我想和某个人说");

    const audience = root.querySelector<HTMLInputElement>("#expression-audience")!;
    const input = root.querySelector<HTMLTextAreaElement>("#expression-input")!;
    audience.value = "姐姐";
    input.value =
      "谢谢你一直陪着我。我有时候不知道怎么开口，但我很珍惜我们一起度过的时间。";
    root.querySelector<HTMLButtonElement>("[data-submit-expression]")!.click();

    expect(root.textContent).toContain("想对谁说");
    expect(root.textContent).toContain("姐姐");
    expect(root.textContent).toContain("我最想说");
    expect(root.textContent).toContain("整理后的话");
    expect(
      root.querySelector<HTMLTextAreaElement>("#expression-draft")?.value,
    ).toContain("姐姐，谢谢你一直陪着我");
  });

  it("copies the person's final edited expression draft", async () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    const writes: string[] = [];
    renderApp(root, {
      clipboard: {
        writeText: async (text) => {
          writes.push(text);
        },
      },
    });
    openActivity(root, "我想和某个人说");

    const audience = root.querySelector<HTMLInputElement>("#expression-audience")!;
    const input = root.querySelector<HTMLTextAreaElement>("#expression-input")!;
    audience.value = "姐姐";
    input.value = "谢谢你一直陪着我。";
    root.querySelector<HTMLButtonElement>("[data-submit-expression]")!.click();
    expect(writes).toEqual([]);

    const draft = root.querySelector<HTMLTextAreaElement>("#expression-draft")!;
    draft.value = "姐姐，谢谢你。我爱你。";
    draft.dispatchEvent(new Event("input", { bubbles: true }));
    root.querySelector<HTMLButtonElement>("[data-copy-expression]")!.click();
    await Promise.resolve();

    expect(writes).toEqual(["姐姐，谢谢你。我爱你。"]);
    expect(root.textContent).toContain("已复制");
  });

  it("interrupts an explicit crisis expression and returns to both fields", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root);
    openActivity(root, "我想和某个人说");

    const audience = root.querySelector<HTMLInputElement>("#expression-audience")!;
    const input = root.querySelector<HTMLTextAreaElement>("#expression-input")!;
    audience.value = "姐姐";
    input.value = "我想伤害自己";
    root.querySelector<HTMLButtonElement>("[data-submit-expression]")!.click();
    expect(root.querySelector("h1")?.textContent).toBe("先停一下");

    root.querySelector<HTMLButtonElement>("[data-crisis-return]")!.click();
    expect(root.querySelector<HTMLInputElement>("#expression-audience")?.value).toBe(
      "姐姐",
    );
    expect(root.querySelector<HTMLTextAreaElement>("#expression-input")?.value).toBe(
      "我想伤害自己",
    );
  });

  it("validates the expression audience and original information in order", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root);
    openActivity(root, "我想和某个人说");

    root.querySelector<HTMLButtonElement>("[data-submit-expression]")!.click();
    const audience = root.querySelector<HTMLInputElement>("#expression-audience")!;
    expect(root.textContent).toContain("请先写下想对谁说");
    expect(document.activeElement).toBe(audience);

    audience.value = "姐姐";
    root.querySelector<HTMLButtonElement>("[data-submit-expression]")!.click();
    const input = root.querySelector<HTMLTextAreaElement>("#expression-input")!;
    expect(root.textContent).toContain("请先写下最想说的话");
    expect(document.activeElement).toBe(input);
  });

  it("shares the crisis interruption with the understanding activity", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root);
    openActivity(root, "帮我理解");

    const original = "我想伤害自己";
    const input = root.querySelector<HTMLTextAreaElement>("#understand-input")!;
    input.value = original;
    root.querySelector<HTMLButtonElement>("[data-submit-understand]")!.click();
    expect(root.querySelector("h1")?.textContent).toBe("先停一下");

    root.querySelector<HTMLButtonElement>("[data-crisis-return]")!.click();
    expect(root.querySelector("h1")?.textContent).toBe("帮我理解");
    expect(
      root.querySelector<HTMLTextAreaElement>("#understand-input")?.value,
    ).toBe(original);
  });

  it("copies the structured medical explanation only after confirmation", async () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    const writes: string[] = [];
    renderApp(root, {
      clipboard: {
        writeText: async (text) => {
          writes.push(text);
        },
      },
    });
    openActivity(root, "帮我理解");

    const input = root.querySelector<HTMLTextAreaElement>("#understand-input")!;
    input.value = "接下来以舒适为主，我们会继续观察症状变化。";
    root.querySelector<HTMLButtonElement>("[data-submit-understand]")!.click();
    expect(writes).toEqual([]);

    root.querySelector<HTMLButtonElement>("[data-copy-understand]")!.click();
    await Promise.resolve();

    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain("原始信息");
    expect(writes[0]).toContain("还不能确定");
    expect(writes[0]).toContain("可以向医护确认");
    expect(root.textContent).toContain("已复制");
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
    const cacheOpen = vi.fn();
    const networkFetch = vi.fn();
    const cookieWrite = vi.fn();
    const xhrSend = vi.spyOn(XMLHttpRequest.prototype, "send");
    const pushState = vi.spyOn(history, "pushState");
    const replaceState = vi.spyOn(history, "replaceState");
    const initialUrl = location.href;
    const cookieDescriptor = Object.getOwnPropertyDescriptor(document, "cookie");
    vi.stubGlobal("localStorage", { setItem: localStorageWrite });
    vi.stubGlobal("sessionStorage", { setItem: sessionStorageWrite });
    vi.stubGlobal("indexedDB", { open: indexedDbOpen });
    vi.stubGlobal("caches", { open: cacheOpen });
    vi.stubGlobal("fetch", networkFetch);
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => "",
      set: cookieWrite,
    });

    try {
      const root = document.querySelector<HTMLElement>("#app")!;
      renderApp(root);

      const input = root.querySelector<HTMLTextAreaElement>("#current-input")!;
      input.value = "这是一段敏感内容。我希望今天安静一点。";
      root.querySelector<HTMLButtonElement>("[data-submit-current]")!.click();

      expect(localStorageWrite).not.toHaveBeenCalled();
      expect(sessionStorageWrite).not.toHaveBeenCalled();
      expect(indexedDbOpen).not.toHaveBeenCalled();
      expect(cacheOpen).not.toHaveBeenCalled();
      expect(cookieWrite).not.toHaveBeenCalled();
      expect(networkFetch).not.toHaveBeenCalled();
      expect(xhrSend).not.toHaveBeenCalled();
      expect(pushState).not.toHaveBeenCalled();
      expect(replaceState).not.toHaveBeenCalled();
      expect(location.href).toBe(initialUrl);
    } finally {
      if (cookieDescriptor) {
        Object.defineProperty(document, "cookie", cookieDescriptor);
      } else {
        Reflect.deleteProperty(document, "cookie");
      }
    }
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

  it("preserves original whitespace in the result preview", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    renderApp(root);

    const original = "  我觉得累。\n我希望今天安静一点。  ";
    const input = root.querySelector<HTMLTextAreaElement>("#current-input")!;
    input.value = original;
    root.querySelector<HTMLButtonElement>("[data-submit-current]")!.click();

    expect(root.querySelector(".source-block p")?.textContent).toBe(original);
  });
});

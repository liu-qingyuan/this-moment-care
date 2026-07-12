// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { renderApp } from "./app.ts";

describe("project scaffold", () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="app"></main>';
  });

  it("renders the project name and implementation status", () => {
    const root = document.querySelector<HTMLElement>("#app");
    expect(root).not.toBeNull();

    renderApp(root!);

    expect(root!.textContent).toContain("此刻");
    expect(root!.textContent).toContain("视觉基准确认后实现");
  });
});

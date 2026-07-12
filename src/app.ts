export function renderApp(root: HTMLElement): void {
  root.innerHTML = `
    <section class="project-status" aria-labelledby="project-title">
      <p class="eyebrow">This Moment</p>
      <h1 id="project-title">此刻</h1>
      <p>帮助你理解、整理，并说出此刻重要的话。</p>
      <p class="status">项目骨架已建立，产品界面将在视觉基准确认后实现。</p>
    </section>
  `;
}


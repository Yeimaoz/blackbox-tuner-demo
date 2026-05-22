export function mountApp(root: HTMLElement | null) {
  if (!root) return;
  root.innerHTML = `
    <main class="shell">
      <section class="panel">blackbox-tuner demo</section>
    </main>
  `;
}

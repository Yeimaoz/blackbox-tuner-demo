import { API_OVERLAY_COPY } from "./api-copy";
import { getCases } from "./cases";
import { stepPlayback, switchPlaybackCase, type PlaybackState, createPlaybackState } from "./render";

function eventLabel(event: PlaybackState["events"][number]) {
  if (event.type === "run_started") return "run started";
  if (event.type === "trial_started") return `trial ${event.trial} started`;
  if (event.type === "trial_completed") return `trial ${event.trial} completed`;
  if (event.type === "trial_pruned") return `trial ${event.trial} pruned`;
  if (event.type === "best_updated") return `best updated @ trial ${event.trial}`;
  return "run completed";
}

export function mountApp(root: HTMLElement | null) {
  if (!root) return;

  const cases = getCases();
  let state = createPlaybackState(cases[0].id);
  let timer: number | null = null;

  const shell = document.createElement("main");
  shell.className = "shell";
  shell.innerHTML = `
    <aside class="rail">
      <div class="brand">
        <div class="eyebrow">Demo</div>
        <h1>blackbox-tuner demo</h1>
        <p>Optuna-style tuning cases with pruning and convergence playback.</p>
      </div>
      <div class="case-list" data-case-list></div>
    </aside>
    <section class="canvas">
      <div class="header">
        <div>
          <div class="eyebrow">Example case</div>
          <h2 data-case-title></h2>
          <p data-case-summary></p>
        </div>
        <div class="chips" data-tags></div>
      </div>
      <div class="chart">
        <div class="chart-title">Search state</div>
        <div class="stats">
          <div><span>Cursor</span><strong data-cursor></strong></div>
          <div><span>Best score</span><strong data-best></strong></div>
          <div><span>Mode</span><strong data-mode></strong></div>
        </div>
      </div>
      <div class="timeline">
        <div class="chart-title">Trial timeline</div>
        <ol data-timeline></ol>
      </div>
      <div class="controls">
        <button type="button" data-play>Play</button>
        <button type="button" data-step>Step</button>
        <button type="button" data-reset>Reset</button>
      </div>
    </section>
    <aside class="rail">
      <div class="brand">
        <div class="eyebrow">API overlay</div>
        <h2>Public API</h2>
      </div>
      <ul class="api-list">${API_OVERLAY_COPY.map((line) => `<li>${line}</li>`).join("")}</ul>
    </aside>
  `;

  root.replaceChildren(shell);

  const caseList = shell.querySelector<HTMLElement>("[data-case-list]");
  const caseTitle = shell.querySelector<HTMLElement>("[data-case-title]");
  const caseSummary = shell.querySelector<HTMLElement>("[data-case-summary]");
  const tags = shell.querySelector<HTMLElement>("[data-tags]");
  const cursor = shell.querySelector<HTMLElement>("[data-cursor]");
  const best = shell.querySelector<HTMLElement>("[data-best]");
  const mode = shell.querySelector<HTMLElement>("[data-mode]");
  const timeline = shell.querySelector<HTMLOListElement>("[data-timeline]");
  const playButton = shell.querySelector<HTMLButtonElement>("[data-play]");
  const stepButton = shell.querySelector<HTMLButtonElement>("[data-step]");
  const resetButton = shell.querySelector<HTMLButtonElement>("[data-reset]");

  if (!caseList || !caseTitle || !caseSummary || !tags || !cursor || !best || !mode || !timeline || !playButton || !stepButton || !resetButton) {
    return;
  }

  const render = () => {
    const activeCase = cases.find((item) => item.id === state.caseId) ?? cases[0];
    caseTitle.textContent = activeCase.title;
    caseSummary.textContent = activeCase.summary;
    tags.innerHTML = activeCase.tags.map((tag) => `<span class="chip">${tag}</span>`).join("");
    cursor.textContent = `${state.cursor}/${state.events.length}`;
    best.textContent = state.bestScore === null ? "—" : state.bestScore.toFixed(1);
    mode.textContent = state.cursor >= state.events.length ? "complete" : "playing";
    timeline.innerHTML = state.events
      .slice(0, state.cursor)
      .map((event) => `<li class="event event-${event.type}">${eventLabel(event)}</li>`)
      .join("");
    playButton.textContent = timer === null ? "Play" : "Pause";
    caseList.querySelectorAll("button").forEach((button) => {
      const selected = button.getAttribute("data-case") === state.caseId;
      button.classList.toggle("is-active", selected);
    });
  };

  const setCase = (caseId: string) => {
    state = switchPlaybackCase(state, caseId);
    render();
  };

  caseList.innerHTML = cases
    .map(
      (item) => `
        <button type="button" data-case="${item.id}">
          <strong>${item.title}</strong>
          <span>${item.convergenceProfile}</span>
        </button>
      `,
    )
    .join("");

  caseList.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
    button.addEventListener("click", () => setCase(button.getAttribute("data-case") ?? cases[0].id));
  });

  playButton.addEventListener("click", () => {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
      render();
      return;
    }

    timer = window.setInterval(() => {
      state = stepPlayback(state);
      if (state.cursor >= state.events.length) {
        window.clearInterval(timer as number);
        timer = null;
      }
      render();
    }, 700);

    render();
  });

  stepButton.addEventListener("click", () => {
    state = stepPlayback(state);
    render();
  });

  resetButton.addEventListener("click", () => {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
    state = createPlaybackState(state.caseId);
    render();
  });

  render();
}

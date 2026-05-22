import { API_OVERLAY_COPY } from "./api-copy";
import { getCaseById, getCases, type DemoCase } from "./cases";
import { createPlaybackState, stepPlayback, switchPlaybackCase, type PlaybackState } from "./render";

type TrialPoint = {
  trial: number;
  score: number;
  kind: "completed" | "pruned";
  params: Record<string, number>;
};

function eventLabel(event: PlaybackState["events"][number]) {
  if (event.type === "run_started") return "run started";
  if (event.type === "schema_changed") return `${event.label}`;
  if (event.type === "trial_started") return `trial ${event.trial} started`;
  if (event.type === "trial_completed") return `trial ${event.trial} completed`;
  if (event.type === "trial_pruned") return `trial ${event.trial} pruned`;
  if (event.type === "best_updated") return `best updated @ trial ${event.trial}`;
  return "run completed";
}

function activeSchema(caseInfo: DemoCase, visibleEvents: PlaybackState["events"]) {
  const schemaEvents = visibleEvents.filter((event) => event.type === "schema_changed");
  const latest = schemaEvents.at(-1);
  const base = caseInfo.schemaPhases[0]?.params ?? caseInfo.searchSpace.map((entry) => entry.split(":")[0]);

  return latest?.params ?? base;
}

function visibleTrials(events: PlaybackState["events"]) {
  const completed: TrialPoint[] = [];
  const pruned: TrialPoint[] = [];
  const started: Record<number, Record<string, number>> = {};

  for (const event of events) {
    if (event.type === "trial_started") {
      started[event.trial] = event.params;
    }
    if (event.type === "trial_completed") {
      completed.push({
        trial: event.trial,
        score: event.score,
        kind: "completed",
        params: started[event.trial] ?? {},
      });
    }
    if (event.type === "trial_pruned") {
      pruned.push({
        trial: event.trial,
        score: -0.5,
        kind: "pruned",
        params: started[event.trial] ?? {},
      });
    }
  }

  return { completed, pruned };
}

function scoreToY(score: number, minScore: number, maxScore: number) {
  if (maxScore === minScore) return 150;
  const clamped = Math.max(minScore, Math.min(maxScore, score));
  const t = (clamped - minScore) / (maxScore - minScore);
  return 220 - t * 160;
}

function trialToX(trial: number, total: number) {
  if (total <= 1) return 90;
  return 70 + (trial / Math.max(1, total - 1)) * 340;
}

function renderChart(state: PlaybackState) {
  const visibleEvents = state.events.slice(0, state.cursor);
  const activeCase = getCaseById(state.caseId) ?? getCases()[0];
  const { completed, pruned } = visibleTrials(visibleEvents);
  const allScores = completed.map((item) => item.score);
  const minScore = Math.min(...allScores, -2);
  const maxScore = Math.max(...allScores, 2);
  const linePoints = completed
    .map((item) => `${trialToX(item.trial, state.events.length)} ${scoreToY(item.score, minScore, maxScore)}`)
    .join(" ");

  return `
    <svg data-main-chart viewBox="0 0 480 280" role="img" aria-label="${activeCase.title} tuning trajectory">
      <defs>
        <linearGradient id="chartBg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#eff6ff" />
          <stop offset="100%" stop-color="#ffffff" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="480" height="280" rx="20" fill="url(#chartBg)"></rect>
      <line x1="60" y1="220" x2="430" y2="220" stroke="#cbd5e1" stroke-width="2"></line>
      <line x1="60" y1="60" x2="60" y2="220" stroke="#cbd5e1" stroke-width="2"></line>
      <text x="60" y="42" fill="#334155" font-size="14" font-weight="700">${activeCase.title}</text>
      <text x="60" y="260" fill="#64748b" font-size="11">trial progression</text>
      <text x="20" y="220" fill="#64748b" font-size="11">low</text>
      <text x="20" y="70" fill="#64748b" font-size="11">high</text>
      ${linePoints ? `<polyline points="${linePoints}" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>` : ""}
      ${completed
        .map(
          (item) => `
            <circle cx="${trialToX(item.trial, state.events.length)}" cy="${scoreToY(item.score, minScore, maxScore)}" r="6" fill="${item.trial === completed.at(-1)?.trial ? "#1d4ed8" : "#60a5fa"}" />
          `,
        )
        .join("")}
      ${pruned
        .map(
          (item) => `
            <g transform="translate(${trialToX(item.trial, state.events.length)}, ${160 + item.trial * 0})">
              <line x1="-7" y1="-7" x2="7" y2="7" stroke="#ef4444" stroke-width="3"></line>
              <line x1="-7" y1="7" x2="7" y2="-7" stroke="#ef4444" stroke-width="3"></line>
            </g>
          `,
        )
        .join("")}
      ${
        state.events
          .slice(0, state.cursor)
          .some((event) => event.type === "schema_changed")
          ? `<line x1="220" y1="58" x2="220" y2="220" stroke="#94a3b8" stroke-dasharray="5 5" stroke-width="2"></line><text x="228" y="74" fill="#475569" font-size="11">schema change</text>`
          : ""
      }
    </svg>
  `;
}

function renderSchema(caseInfo: DemoCase, visibleEvents: PlaybackState["events"]) {
  const active = activeSchema(caseInfo, visibleEvents);
  const schemaEvents = visibleEvents.filter((event) => event.type === "schema_changed");
  const currentPhase = schemaEvents.at(-1);

  return `
    <div class="schema-panel">
      <div class="eyebrow">Param schema</div>
      <h3>${currentPhase?.label ?? caseInfo.schemaPhases[0]?.label ?? "Baseline"}</h3>
      <div class="schema-grid">
        ${active.map((param) => `<span class="schema-chip">${param}</span>`).join("")}
      </div>
      <div class="schema-note">${currentPhase?.kind ?? "keep"} schema</div>
    </div>
  `;
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
        <p>Trading-focused Optuna-style tuning with schema evolution.</p>
      </div>
      <div class="case-list" data-case-list></div>
    </aside>
    <section class="canvas">
      <div class="hero">
        <div>
          <div class="eyebrow">Example case</div>
          <h2 data-case-title></h2>
          <p data-case-summary></p>
        </div>
        <div class="chips" data-tags></div>
      </div>
      <div class="visual-grid">
        <div class="chart-card">
          <div class="chart-title">Tuning trajectory</div>
          <div data-chart></div>
        </div>
        <div class="schema-card" data-schema></div>
      </div>
      <div class="status-grid">
        <div class="status-tile"><span>Cursor</span><strong data-cursor></strong></div>
        <div class="status-tile"><span>Best score</span><strong data-best></strong></div>
        <div class="status-tile"><span>Mode</span><strong data-mode></strong></div>
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
  const chart = shell.querySelector<HTMLElement>("[data-chart]");
  const schema = shell.querySelector<HTMLElement>("[data-schema]");
  const cursor = shell.querySelector<HTMLElement>("[data-cursor]");
  const best = shell.querySelector<HTMLElement>("[data-best]");
  const mode = shell.querySelector<HTMLElement>("[data-mode]");
  const timeline = shell.querySelector<HTMLOListElement>("[data-timeline]");
  const playButton = shell.querySelector<HTMLButtonElement>("[data-play]");
  const stepButton = shell.querySelector<HTMLButtonElement>("[data-step]");
  const resetButton = shell.querySelector<HTMLButtonElement>("[data-reset]");

  if (!caseList || !caseTitle || !caseSummary || !tags || !chart || !schema || !cursor || !best || !mode || !timeline || !playButton || !stepButton || !resetButton) {
    return;
  }

  const render = () => {
    const activeCase = getCaseById(state.caseId) ?? cases[0];
    const visibleEvents = state.events.slice(0, state.cursor);
    caseTitle.textContent = activeCase.title;
    caseSummary.textContent = activeCase.summary;
    tags.innerHTML = activeCase.tags.map((tag) => `<span class="chip">${tag}</span>`).join("");
    chart.innerHTML = renderChart(state);
    schema.innerHTML = renderSchema(activeCase, visibleEvents);
    cursor.textContent = `${state.cursor}/${state.events.length}`;
    best.textContent = state.bestScore === null ? "—" : state.bestScore.toFixed(2);
    mode.textContent = state.cursor >= state.events.length ? "complete" : "playing";
    timeline.innerHTML = visibleEvents.map((event) => `<li class="event event-${event.type}">${eventLabel(event)}</li>`).join("");
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

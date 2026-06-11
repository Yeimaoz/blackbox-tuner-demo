import { API_OVERLAY_COPY } from "./api-copy";
import { getCaseById, getCases, type DemoCase, type ParamInsight } from "./cases";
import { createPlaybackState, stepPlayback, switchPlaybackCase, type PlaybackState } from "./render";
import {
  compareParams,
  driftLabel,
  formatSignedDelta,
  parseSearchSpace,
  scoreToY,
  trialToX,
  type ParamSpec,
} from "./utils";

type TrialPoint = {
  trial: number;
  score: number;
  kind: "completed" | "pruned";
  params: Record<string, number>;
};

type TrialHistoryEntry = {
  trial: number;
  kind: "started" | "completed" | "pruned";
  params: Record<string, number>;
  score?: number;
  reason?: string;
};

type ImpactRow = ParamInsight & {
  active: boolean;
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

function summarizeTrials(events: PlaybackState["events"]) {
  const history: TrialHistoryEntry[] = [];
  const byTrial = new Map<number, TrialHistoryEntry>();

  for (const event of events) {
    if (event.type === "trial_started") {
      const entry: TrialHistoryEntry = {
        trial: event.trial,
        kind: "started",
        params: event.params,
      };
      history.push(entry);
      byTrial.set(event.trial, entry);
    } else if (event.type === "trial_completed") {
      const entry = byTrial.get(event.trial);
      if (entry) {
        entry.kind = "completed";
        entry.score = event.score;
      }
    } else if (event.type === "trial_pruned") {
      const entry = byTrial.get(event.trial);
      if (entry) {
        entry.kind = "pruned";
        entry.reason = event.reason;
      }
    }
  }

  return history;
}

function impactRank(importance: ImpactRow["importance"]) {
  if (importance === "high") return 0;
  if (importance === "medium") return 1;
  if (importance === "low") return 2;
  return 3;
}

function renderImpactBars(caseInfo: DemoCase, visibleEvents: PlaybackState["events"]) {
  const active = new Set(activeSchema(caseInfo, visibleEvents));
  const currentPhase = visibleEvents.filter((event) => event.type === "schema_changed").at(-1);
  const rows: ImpactRow[] = caseInfo.paramInsights
    .map((item) => ({
      ...item,
      active: active.has(item.name),
    }))
    .sort((a, b) => impactRank(a.importance) - impactRank(b.importance));

  return `
    <div class="impact-panel">
      <div class="impact-head">
        <div>
          <div class="eyebrow">Parameter impact</div>
          <h4>Which params matter here</h4>
        </div>
        <span class="impact-caption">${currentPhase?.kind === "remove" ? "inactive = removed in this phase" : "bars are relative, not absolute truth"}</span>
      </div>
      <div class="impact-list">
        ${rows
          .map((row) => {
            const importance = row.active ? row.importance : "inactive";
            const width = importance === "high" ? 100 : importance === "medium" ? 72 : importance === "low" ? 38 : 14;
            return `
              <div class="impact-row impact-${importance}">
                <div class="impact-labels">
                  <strong>${row.name}</strong>
                  <span>${row.note}</span>
                </div>
                <div class="impact-meter"><div class="impact-bar" style="width:${width}%"></div></div>
                <em>${importance}${!row.active ? " this phase" : ""}</em>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
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

function renderChart(state: PlaybackState) {
  const visibleEvents = state.events.slice(0, state.cursor);
  const activeCase = getCaseById(state.caseId) ?? getCases()[0];
  const { completed, pruned } = visibleTrials(visibleEvents);
  const allScores = completed.map((item) => item.score);
  const minScore = Math.min(...allScores, -2);
  const maxScore = Math.max(...allScores, 2);

  // Fix (High finding): the denominator must be the trial count, not the
  // total event count. state.events includes meta-events (run_started,
  // schema_changed, best_updated, run_completed) so state.events.length is
  // always much larger than the actual number of trials, pushing all data
  // points into the left third of the chart.
  // Correct denominator = completed + pruned trial count (from the full run,
  // not just the visible window, so the axis scale stays stable as we step).
  const { completed: allCompleted, pruned: allPruned } = visibleTrials(state.events);
  const trialTotal = allCompleted.length + allPruned.length;

  // Build the best-so-far line: keep a running maximum so the polyline is
  // monotone non-decreasing (matching what the legend label says).
  // A completed trial only contributes a point if its score equals or exceeds
  // every previous completed trial's score.
  let runningBest = -Infinity;
  const bestSoFarPoints = completed
    .filter((item) => {
      if (item.score >= runningBest) {
        runningBest = item.score;
        return true;
      }
      return false;
    })
    .map((item) => `${trialToX(item.trial, trialTotal)} ${scoreToY(item.score, minScore, maxScore)}`)
    .join(" ");

  const xAxisLabel = "trial / search progress";
  const yAxisLabel = "objective score (higher is better)";

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
      <text x="240" y="258" text-anchor="middle" fill="#475569" font-size="12">${xAxisLabel}</text>
      <text x="18" y="142" transform="rotate(-90 18 142)" text-anchor="middle" fill="#475569" font-size="12">${yAxisLabel}</text>
      <text x="20" y="220" fill="#64748b" font-size="11">low</text>
      <text x="20" y="70" fill="#64748b" font-size="11">high</text>
      <text x="68" y="58" fill="#64748b" font-size="11">best-so-far line</text>
      ${bestSoFarPoints ? `<polyline points="${bestSoFarPoints}" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>` : ""}
      ${completed
        .map(
          (item) => `
            <circle cx="${trialToX(item.trial, trialTotal)}" cy="${scoreToY(item.score, minScore, maxScore)}" r="6" fill="${item.trial === completed.at(-1)?.trial ? "#1d4ed8" : "#60a5fa"}" />
          `,
        )
        .join("")}
      ${pruned
        .map(
          (item) => `
            <g transform="translate(${trialToX(item.trial, trialTotal)}, ${160 + item.trial * 0})">
              <line x1="-7" y1="-7" x2="7" y2="7" stroke="#ef4444" stroke-width="3"></line>
              <line x1="-7" y1="7" x2="7" y2="-7" stroke="#ef4444" stroke-width="3"></line>
            </g>
          `,
        )
        .join("")}
      ${
        // Draw a vertical marker for each schema_changed event that has appeared
        // in the visible window.  The x position is computed from the trial
        // number of the last trial that was started before (or at) the
        // schema_changed event, so the line tracks actual playback position
        // rather than being hardcoded at x=220.
        (() => {
          const eventsUpToCursor = state.events.slice(0, state.cursor);
          const markers: string[] = [];
          let lastTrialBeforeSchema = -1;
          for (const evt of eventsUpToCursor) {
            if (evt.type === "trial_started") {
              lastTrialBeforeSchema = evt.trial;
            }
            if (evt.type === "schema_changed") {
              const markerTrial = lastTrialBeforeSchema >= 0 ? lastTrialBeforeSchema : 0;
              const xPos = trialToX(markerTrial, trialTotal);
              markers.push(
                `<line x1="${xPos}" y1="58" x2="${xPos}" y2="220" stroke="#94a3b8" stroke-dasharray="5 5" stroke-width="2"></line>` +
                `<text x="${xPos + 4}" y="74" fill="#475569" font-size="11">schema change</text>`,
              );
            }
          }
          return markers.join("");
        })()
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
      ${renderImpactBars(caseInfo, visibleEvents)}
    </div>
  `;
}

function renderCurrentTrial(caseInfo: DemoCase, state: PlaybackState) {
  const trials = summarizeTrials(state.events.slice(0, state.cursor));
  const current = trials.at(-1);
  const previous = trials.at(-2);

  if (!current) {
    return `
      <div class="trial-card">
        <div class="eyebrow">Current trial</div>
        <h3>Waiting to start</h3>
        <p>No trial has run yet.</p>
      </div>
    `;
  }

  const paramSpecs = parseSearchSpace(caseInfo.searchSpace);
  const paramChips = Object.entries(current.params)
    .map(([name, value]) => `<span class="schema-chip">${name}: ${Number.isInteger(value) ? value : value.toFixed(2)}</span>`)
    .join("");
  const diffs = compareParams(current.params, previous?.params, paramSpecs).slice(0, 3);
  const diffRows = previous
    ? diffs
        .map(
          (item) => `
            <div class="drift-row">
              <div>
                <strong>${item.name}</strong>
                <span>${formatSignedDelta(item.delta)} vs trial ${previous.trial}</span>
              </div>
              <em class="drift-pill drift-${driftLabel(item.delta, item.spec).replace(/\s+/g, "-")}">${driftLabel(item.delta, item.spec)}</em>
            </div>
          `,
        )
        .join("")
    : `<div class="drift-empty">First sampled trial. No prior reference.</div>`;

  const previousCompleted = [...trials.slice(0, -1)].reverse().find((entry) => entry.kind === "completed" && typeof entry.score === "number");
  const scoreDelta =
    current.kind === "completed" && previousCompleted?.score !== undefined && current.score !== undefined
      ? current.score - previousCompleted.score
      : null;

  return `
    <div class="trial-card">
      <div class="eyebrow">Current trial</div>
      <h3>Trial ${current.trial} · ${current.kind}</h3>
      <div class="schema-grid">${paramChips}</div>
      <div class="trial-drift">
        <div class="trial-drift-head">
          <span>Parameter moves vs previous trial</span>
          ${previous ? `<strong>Trial ${previous.trial}</strong>` : ""}
        </div>
        ${diffRows}
      </div>
      ${
        current.kind === "completed"
          ? `<div class="trial-meta">score ${current.score?.toFixed(2)}${scoreDelta !== null ? ` · ${formatSignedDelta(scoreDelta)} vs previous completed` : ""}</div>`
          : current.kind === "pruned"
            ? `<div class="trial-meta">pruned: ${current.reason}</div>`
            : `<div class="trial-meta">running with current parameters</div>`
      }
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
      <div class="chart-card chart-card-main">
        <div class="chart-title">Tuning trajectory</div>
        <div data-chart></div>
      </div>
      <div class="detail-stack">
        <div data-trial-detail></div>
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
  const trialDetail = shell.querySelector<HTMLElement>("[data-trial-detail]");
  const cursor = shell.querySelector<HTMLElement>("[data-cursor]");
  const best = shell.querySelector<HTMLElement>("[data-best]");
  const mode = shell.querySelector<HTMLElement>("[data-mode]");
  const timeline = shell.querySelector<HTMLOListElement>("[data-timeline]");
  const playButton = shell.querySelector<HTMLButtonElement>("[data-play]");
  const stepButton = shell.querySelector<HTMLButtonElement>("[data-step]");
  const resetButton = shell.querySelector<HTMLButtonElement>("[data-reset]");

  if (!caseList || !caseTitle || !caseSummary || !tags || !chart || !schema || !trialDetail || !cursor || !best || !mode || !timeline || !playButton || !stepButton || !resetButton) {
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
    trialDetail.innerHTML = renderCurrentTrial(activeCase, state);
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
    // Stop the auto-play timer before switching so the old interval cannot
    // continue stepping a newly-loaded case state.
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
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

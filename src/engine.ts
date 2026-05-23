import { getCaseById } from "./cases";

export type DemoEvent =
  | { type: "run_started"; caseId: string }
  | { type: "schema_changed"; kind: "add" | "remove" | "keep"; label: string; params: string[] }
  | { type: "trial_started"; trial: number; params: Record<string, number> }
  | { type: "trial_completed"; trial: number; score: number }
  | { type: "trial_pruned"; trial: number; reason: string }
  | { type: "best_updated"; trial: number; score: number }
  | { type: "run_completed" };

type TrialSpec = {
  params: Record<string, number>;
  score?: number;
  reason?: string;
  best?: boolean;
};

function baseEvents(caseId: string): DemoEvent[] {
  return [{ type: "run_started", caseId }];
}

function schemaEvent(caseId: string, index = 0): DemoEvent[] {
  const demoCase = getCaseById(caseId) ?? getCaseById("breakout_entry");
  const phase = demoCase?.schemaPhases[index];
  if (!phase) return [];
  return [{
    type: "schema_changed" as const,
    kind: phase.kind,
    label: phase.label,
    params: phase.params,
  }];
}

function schemaEvents(caseId: string): DemoEvent[] {
  const demoCase = getCaseById(caseId) ?? getCaseById("breakout_entry");
  if (!demoCase) return [];
  return demoCase.schemaPhases.map((phase) => ({
    type: "schema_changed" as const,
    kind: phase.kind,
    label: phase.label,
    params: phase.params,
  }));
}

function runCompleted(): DemoEvent[] {
  return [{ type: "run_completed" }];
}

function trialStarted(trial: number, params: Record<string, number>): DemoEvent {
  return { type: "trial_started", trial, params };
}

function trialCompleted(trial: number, score: number): DemoEvent {
  return { type: "trial_completed", trial, score };
}

function trialPruned(trial: number, reason: string): DemoEvent {
  return { type: "trial_pruned", trial, reason };
}

function bestUpdated(trial: number, score: number): DemoEvent {
  return { type: "best_updated", trial, score };
}

function emitTrials(startTrial: number, specs: TrialSpec[]): DemoEvent[] {
  const events: DemoEvent[] = [];
  specs.forEach((spec, index) => {
    const trial = startTrial + index;
    events.push(trialStarted(trial, spec.params));

    if (spec.reason) {
      events.push(trialPruned(trial, spec.reason));
      return;
    }

    const score = spec.score ?? 0;
    events.push(trialCompleted(trial, score));
    if (spec.best !== false) {
      events.push(bestUpdated(trial, score));
    }
  });

  return events;
}

export function buildEventStream(caseId: string): DemoEvent[] {
  const demoCase = getCaseById(caseId) ?? getCaseById("breakout_entry");
  if (!demoCase) return [];

  if (demoCase.id === "breakout_entry") {
    return [
      ...baseEvents(demoCase.id),
      ...schemaEvents(demoCase.id),
      ...emitTrials(0, [
        { params: { entry_threshold: 3, lookback_bars: 40, stop_loss_pct: 1, take_profit_pct: 2, cooldown_bars: 3 }, score: 0.2 },
        { params: { entry_threshold: 4, lookback_bars: 55, stop_loss_pct: 1.2, take_profit_pct: 2.6, cooldown_bars: 2 }, score: 0.8 },
        { params: { entry_threshold: 2, lookback_bars: 34, stop_loss_pct: 0.8, take_profit_pct: 1.6, cooldown_bars: 5 }, score: 0.5, best: false },
        { params: { entry_threshold: 5, lookback_bars: 62, stop_loss_pct: 1.1, take_profit_pct: 2.4, cooldown_bars: 1 }, score: 1.1 },
        { params: { entry_threshold: 4, lookback_bars: 70, stop_loss_pct: 1.3, take_profit_pct: 2.8, cooldown_bars: 4 }, score: 1.6 },
        { params: { entry_threshold: 3, lookback_bars: 48, stop_loss_pct: 1.0, take_profit_pct: 2.1, cooldown_bars: 2 }, reason: "late entry signal" },
        { params: { entry_threshold: 5, lookback_bars: 80, stop_loss_pct: 1.4, take_profit_pct: 3.0, cooldown_bars: 3 }, score: 1.3, best: false },
        { params: { entry_threshold: 4, lookback_bars: 90, stop_loss_pct: 1.1, take_profit_pct: 2.7, cooldown_bars: 6 }, score: 1.8 },
        { params: { entry_threshold: 5, lookback_bars: 95, stop_loss_pct: 1.15, take_profit_pct: 2.8, cooldown_bars: 7 }, score: 1.75, best: false },
        { params: { entry_threshold: 4, lookback_bars: 88, stop_loss_pct: 1.0, take_profit_pct: 2.5, cooldown_bars: 8 }, score: 1.92 },
        { params: { entry_threshold: 5, lookback_bars: 102, stop_loss_pct: 1.05, take_profit_pct: 2.9, cooldown_bars: 9 }, score: 1.88, best: false },
        { params: { entry_threshold: 4, lookback_bars: 108, stop_loss_pct: 1.0, take_profit_pct: 2.6, cooldown_bars: 10 }, score: 2.05 },
      ]),
      ...runCompleted(),
    ];
  }

  if (demoCase.id === "mean_reversion") {
    return [
      ...baseEvents(demoCase.id),
      ...schemaEvents(demoCase.id),
      ...emitTrials(0, [
        { params: { z_window: 16, z_entry: 1.2, z_exit: 0.4, max_hold_bars: 4, volatility_filter: 0.8 }, reason: "intermediate drawdown exceeded" },
        { params: { z_window: 22, z_entry: 1.4, z_exit: 0.5, max_hold_bars: 6, volatility_filter: 0.7 }, score: -0.8 },
        { params: { z_window: 28, z_entry: 1.8, z_exit: 0.6, max_hold_bars: 8, volatility_filter: 0.4 }, score: -0.3 },
        { params: { z_window: 32, z_entry: 2.0, z_exit: 0.7, max_hold_bars: 10, volatility_filter: 0.3 }, reason: "mean reversion signal weak" },
        { params: { z_window: 38, z_entry: 2.2, z_exit: 0.8, max_hold_bars: 12, volatility_filter: 0.2 }, score: -0.1 },
        { params: { z_window: 46, z_entry: 2.5, z_exit: 1.0, max_hold_bars: 14, volatility_filter: 0.1 }, score: 0.05 },
        { params: { z_window: 54, z_entry: 2.8, z_exit: 1.1, max_hold_bars: 16, volatility_filter: 0.1 }, reason: "bad fill simulation" },
        { params: { z_window: 42, z_entry: 2.1, z_exit: 0.8, max_hold_bars: 10, volatility_filter: 0.2 }, score: 0.18 },
        { params: { z_window: 48, z_entry: 2.6, z_exit: 1.1, max_hold_bars: 12, volatility_filter: 0.15 }, score: 0.14, best: false },
        { params: { z_window: 56, z_entry: 2.7, z_exit: 1.15, max_hold_bars: 13, volatility_filter: 0.12 }, score: 0.26 },
        { params: { z_window: 50, z_entry: 2.4, z_exit: 1.0, max_hold_bars: 11, volatility_filter: 0.18 }, score: 0.22, best: false },
        { params: { z_window: 58, z_entry: 2.9, z_exit: 1.2, max_hold_bars: 15, volatility_filter: 0.1 }, score: 0.31 },
      ]),
      ...runCompleted(),
    ];
  }

  if (demoCase.id === "risk_guard") {
    return [
      ...baseEvents(demoCase.id),
      ...schemaEvents(demoCase.id),
      ...emitTrials(0, [
        { params: { volatility_window: 20, position_size_cap: 8, max_dd: 15, slippage_limit: 12, halt_threshold: 20 }, score: -1.8 },
        { params: { volatility_window: 35, position_size_cap: 10, max_dd: 14, slippage_limit: 10, halt_threshold: 22 }, score: -1.2 },
        { params: { volatility_window: 55, position_size_cap: 12, max_dd: 12, slippage_limit: 8, halt_threshold: 24 }, score: -0.7 },
        { params: { volatility_window: 70, position_size_cap: 11, max_dd: 11, slippage_limit: 7, halt_threshold: 26 }, reason: "risk cap violated" },
        { params: { volatility_window: 90, position_size_cap: 9, max_dd: 10, slippage_limit: 5, halt_threshold: 28 }, score: -0.4 },
        { params: { volatility_window: 100, position_size_cap: 8, max_dd: 9, slippage_limit: 4, halt_threshold: 30 }, reason: "halt threshold too aggressive" },
        { params: { volatility_window: 40, position_size_cap: 14, max_dd: 18, slippage_limit: 9, halt_threshold: 24 }, score: -0.9, best: false },
        { params: { volatility_window: 60, position_size_cap: 13, max_dd: 13, slippage_limit: 6, halt_threshold: 25 }, score: -0.2 },
        { params: { volatility_window: 68, position_size_cap: 12, max_dd: 12, slippage_limit: 6, halt_threshold: 27 }, score: -0.18, best: false },
        { params: { volatility_window: 84, position_size_cap: 11, max_dd: 11, slippage_limit: 5, halt_threshold: 28 }, score: -0.08 },
        { params: { volatility_window: 76, position_size_cap: 10, max_dd: 10, slippage_limit: 4, halt_threshold: 29 }, score: -0.05, best: false },
        { params: { volatility_window: 92, position_size_cap: 10, max_dd: 9, slippage_limit: 4, halt_threshold: 30 }, score: 0.02 },
      ]),
      ...runCompleted(),
    ];
  }

  if (demoCase.id === "schema_evolution") {
    return [
      ...baseEvents(demoCase.id),
      ...schemaEvent(demoCase.id, 0),
      ...emitTrials(0, [
        { params: { entry_threshold: 3, stop_loss_pct: 1, take_profit_pct: 2 }, score: 0.2 },
        { params: { entry_threshold: 4, stop_loss_pct: 1.2, take_profit_pct: 2.4 }, score: 0.35 },
        { params: { entry_threshold: 4, stop_loss_pct: 1.1, take_profit_pct: 2.3 }, score: 0.45 },
      ]),
      ...schemaEvent(demoCase.id, 1),
      ...emitTrials(3, [
        { params: { entry_threshold: 4, stop_loss_pct: 1.0, take_profit_pct: 2.5, trailing_stop_pct: 0.5 }, score: 0.5 },
        { params: { entry_threshold: 4, stop_loss_pct: 1.0, take_profit_pct: 2.2, trailing_stop_pct: 0.8 }, score: 0.62 },
        { params: { entry_threshold: 4, stop_loss_pct: 1.1, take_profit_pct: 2.1, trailing_stop_pct: 0.9 }, score: 0.68, best: false },
      ]),
      ...schemaEvent(demoCase.id, 2),
      ...emitTrials(6, [
        { params: { entry_threshold: 4, stop_loss_pct: 1.1, trailing_stop_pct: 0.8, volatility_filter: 0.4 }, score: 0.9 },
        { params: { entry_threshold: 5, stop_loss_pct: 1.2, trailing_stop_pct: 0.7, volatility_filter: 0.5 }, reason: "new filter too strict" },
        { params: { entry_threshold: 5, stop_loss_pct: 1.0, trailing_stop_pct: 0.9, volatility_filter: 0.3 }, score: 1.0 },
        { params: { entry_threshold: 4, stop_loss_pct: 1.0, trailing_stop_pct: 0.8, volatility_filter: 0.25 }, score: 1.08 },
        { params: { entry_threshold: 5, stop_loss_pct: 1.1, trailing_stop_pct: 1.0, volatility_filter: 0.2 }, score: 1.02, best: false },
        { params: { entry_threshold: 5, stop_loss_pct: 1.0, trailing_stop_pct: 1.1, volatility_filter: 0.18 }, score: 1.16 },
      ]),
      ...runCompleted(),
    ];
  }

  return [
    ...baseEvents(demoCase.id),
    ...schemaEvents(demoCase.id),
    { type: "trial_started", trial: 0, params: { x: 0, y: 0 } },
    { type: "trial_completed", trial: 0, score: -1.0 },
    { type: "best_updated", trial: 0, score: -1.0 },
    ...runCompleted(),
  ];
}

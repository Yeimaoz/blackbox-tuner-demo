import { getCaseById } from "./cases";

export type DemoEvent =
  | { type: "run_started"; caseId: string }
  | { type: "schema_changed"; kind: "add" | "remove" | "keep"; label: string; params: string[] }
  | { type: "trial_started"; trial: number; params: Record<string, number> }
  | { type: "trial_completed"; trial: number; score: number }
  | { type: "trial_pruned"; trial: number; reason: string }
  | { type: "best_updated"; trial: number; score: number }
  | { type: "run_completed" };

function baseEvents(caseId: string): DemoEvent[] {
  return [{ type: "run_started", caseId }];
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

export function buildEventStream(caseId: string): DemoEvent[] {
  const demoCase = getCaseById(caseId) ?? getCaseById("breakout_entry");
  if (!demoCase) return [];

  if (demoCase.id === "breakout_entry") {
    return [
      ...baseEvents(demoCase.id),
      ...schemaEvents(demoCase.id),
      trialStarted(0, { entry_threshold: 3, lookback_bars: 40, stop_loss_pct: 1, take_profit_pct: 2, cooldown_bars: 3 }),
      trialCompleted(0, 0.2),
      bestUpdated(0, 0.2),
      trialStarted(1, { entry_threshold: 4, lookback_bars: 55, stop_loss_pct: 1.2, take_profit_pct: 2.6, cooldown_bars: 2 }),
      trialCompleted(1, 0.8),
      bestUpdated(1, 0.8),
      trialStarted(2, { entry_threshold: 2, lookback_bars: 34, stop_loss_pct: 0.8, take_profit_pct: 1.6, cooldown_bars: 5 }),
      trialCompleted(2, 0.5),
      trialStarted(3, { entry_threshold: 5, lookback_bars: 62, stop_loss_pct: 1.1, take_profit_pct: 2.4, cooldown_bars: 1 }),
      trialCompleted(3, 1.1),
      bestUpdated(3, 1.1),
      trialStarted(4, { entry_threshold: 4, lookback_bars: 70, stop_loss_pct: 1.3, take_profit_pct: 2.8, cooldown_bars: 4 }),
      trialCompleted(4, 1.6),
      bestUpdated(4, 1.6),
      trialStarted(5, { entry_threshold: 3, lookback_bars: 48, stop_loss_pct: 1.0, take_profit_pct: 2.1, cooldown_bars: 2 }),
      trialPruned(5, "late entry signal"),
      trialStarted(6, { entry_threshold: 5, lookback_bars: 80, stop_loss_pct: 1.4, take_profit_pct: 3.0, cooldown_bars: 3 }),
      trialCompleted(6, 1.3),
      trialStarted(7, { entry_threshold: 4, lookback_bars: 90, stop_loss_pct: 1.1, take_profit_pct: 2.7, cooldown_bars: 6 }),
      trialCompleted(7, 1.8),
      bestUpdated(7, 1.8),
      ...runCompleted(),
    ];
  }

  if (demoCase.id === "mean_reversion") {
    return [
      ...baseEvents(demoCase.id),
      ...schemaEvents(demoCase.id),
      trialStarted(0, { z_window: 16, z_entry: 1.2, z_exit: 0.4, max_hold_bars: 4, volatility_filter: 0.8 }),
      trialPruned(0, "intermediate drawdown exceeded"),
      trialStarted(1, { z_window: 22, z_entry: 1.4, z_exit: 0.5, max_hold_bars: 6, volatility_filter: 0.7 }),
      trialCompleted(1, -0.8),
      bestUpdated(1, -0.8),
      trialStarted(2, { z_window: 28, z_entry: 1.8, z_exit: 0.6, max_hold_bars: 8, volatility_filter: 0.4 }),
      trialCompleted(2, -0.3),
      bestUpdated(2, -0.3),
      trialStarted(3, { z_window: 32, z_entry: 2.0, z_exit: 0.7, max_hold_bars: 10, volatility_filter: 0.3 }),
      trialPruned(3, "mean reversion signal weak"),
      trialStarted(4, { z_window: 38, z_entry: 2.2, z_exit: 0.8, max_hold_bars: 12, volatility_filter: 0.2 }),
      trialCompleted(4, -0.1),
      bestUpdated(4, -0.1),
      trialStarted(5, { z_window: 46, z_entry: 2.5, z_exit: 1.0, max_hold_bars: 14, volatility_filter: 0.1 }),
      trialCompleted(5, 0.05),
      bestUpdated(5, 0.05),
      trialStarted(6, { z_window: 54, z_entry: 2.8, z_exit: 1.1, max_hold_bars: 16, volatility_filter: 0.1 }),
      trialPruned(6, "bad fill simulation"),
      trialStarted(7, { z_window: 42, z_entry: 2.1, z_exit: 0.8, max_hold_bars: 10, volatility_filter: 0.2 }),
      trialCompleted(7, 0.18),
      bestUpdated(7, 0.18),
      ...runCompleted(),
    ];
  }

  if (demoCase.id === "risk_guard") {
    return [
      ...baseEvents(demoCase.id),
      ...schemaEvents(demoCase.id),
      trialStarted(0, { volatility_window: 20, position_size_cap: 8, max_dd: 15, slippage_limit: 12, halt_threshold: 20 }),
      trialCompleted(0, -1.8),
      bestUpdated(0, -1.8),
      trialStarted(1, { volatility_window: 35, position_size_cap: 10, max_dd: 14, slippage_limit: 10, halt_threshold: 22 }),
      trialCompleted(1, -1.2),
      bestUpdated(1, -1.2),
      trialStarted(2, { volatility_window: 55, position_size_cap: 12, max_dd: 12, slippage_limit: 8, halt_threshold: 24 }),
      trialCompleted(2, -0.7),
      bestUpdated(2, -0.7),
      trialStarted(3, { volatility_window: 70, position_size_cap: 11, max_dd: 11, slippage_limit: 7, halt_threshold: 26 }),
      trialPruned(3, "risk cap violated"),
      trialStarted(4, { volatility_window: 90, position_size_cap: 9, max_dd: 10, slippage_limit: 5, halt_threshold: 28 }),
      trialCompleted(4, -0.4),
      bestUpdated(4, -0.4),
      trialStarted(5, { volatility_window: 100, position_size_cap: 8, max_dd: 9, slippage_limit: 4, halt_threshold: 30 }),
      trialPruned(5, "halt threshold too aggressive"),
      trialStarted(6, { volatility_window: 40, position_size_cap: 14, max_dd: 18, slippage_limit: 9, halt_threshold: 24 }),
      trialCompleted(6, -0.9),
      trialStarted(7, { volatility_window: 60, position_size_cap: 13, max_dd: 13, slippage_limit: 6, halt_threshold: 25 }),
      trialCompleted(7, -0.2),
      bestUpdated(7, -0.2),
      ...runCompleted(),
    ];
  }

  if (demoCase.id === "schema_evolution") {
    return [
      ...baseEvents(demoCase.id),
      ...schemaEvents(demoCase.id),
      trialStarted(0, { entry_threshold: 3, stop_loss_pct: 1, take_profit_pct: 2 }),
      trialCompleted(0, 0.2),
      bestUpdated(0, 0.2),
      trialStarted(1, { entry_threshold: 4, stop_loss_pct: 1.2, take_profit_pct: 2.4 }),
      trialCompleted(1, 0.35),
      bestUpdated(1, 0.35),
      trialStarted(2, { entry_threshold: 4, stop_loss_pct: 1.1, take_profit_pct: 2.3 }),
      trialCompleted(2, 0.45),
      bestUpdated(2, 0.45),
      trialStarted(3, { entry_threshold: 4, stop_loss_pct: 1.0, take_profit_pct: 2.5, trailing_stop_pct: 0.5 }),
      trialCompleted(3, 0.5),
      bestUpdated(3, 0.5),
      trialStarted(4, { entry_threshold: 4, stop_loss_pct: 1.0, take_profit_pct: 2.2, trailing_stop_pct: 0.8 }),
      trialCompleted(4, 0.62),
      bestUpdated(4, 0.62),
      trialStarted(5, { entry_threshold: 4, stop_loss_pct: 1.1, trailing_stop_pct: 0.8, volatility_filter: 0.4 }),
      trialCompleted(5, 0.9),
      bestUpdated(5, 0.9),
      trialStarted(6, { entry_threshold: 5, stop_loss_pct: 1.2, trailing_stop_pct: 0.7, volatility_filter: 0.5 }),
      trialPruned(6, "new filter too strict"),
      trialStarted(7, { entry_threshold: 5, stop_loss_pct: 1.0, trailing_stop_pct: 0.9, volatility_filter: 0.3 }),
      trialCompleted(7, 1.0),
      bestUpdated(7, 1.0),
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

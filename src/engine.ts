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

export function buildEventStream(caseId: string): DemoEvent[] {
  const demoCase = getCaseById(caseId) ?? getCaseById("breakout_entry");
  if (!demoCase) return [];

  if (demoCase.id === "breakout_entry") {
    return [
      ...baseEvents(demoCase.id),
      ...schemaEvents(demoCase.id),
      { type: "trial_started", trial: 0, params: { entry_threshold: 3, lookback_bars: 40, stop_loss_pct: 1, take_profit_pct: 2, cooldown_bars: 3 } },
      { type: "trial_completed", trial: 0, score: 0.8 },
      { type: "best_updated", trial: 0, score: 0.8 },
      { type: "trial_started", trial: 1, params: { entry_threshold: 4, lookback_bars: 55, stop_loss_pct: 1.2, take_profit_pct: 2.6, cooldown_bars: 2 } },
      { type: "trial_completed", trial: 1, score: 1.4 },
      { type: "best_updated", trial: 1, score: 1.4 },
      ...runCompleted(),
    ];
  }

  if (demoCase.id === "mean_reversion") {
    return [
      ...baseEvents(demoCase.id),
      ...schemaEvents(demoCase.id),
      { type: "trial_started", trial: 0, params: { z_window: 16, z_entry: 1.2, z_exit: 0.4, max_hold_bars: 4, volatility_filter: 0.8 } },
      { type: "trial_pruned", trial: 0, reason: "intermediate drawdown exceeded" },
      { type: "trial_started", trial: 1, params: { z_window: 28, z_entry: 1.8, z_exit: 0.6, max_hold_bars: 8, volatility_filter: 0.4 } },
      { type: "trial_completed", trial: 1, score: -0.3 },
      { type: "best_updated", trial: 1, score: -0.3 },
      { type: "trial_started", trial: 2, params: { z_window: 42, z_entry: 2.1, z_exit: 0.8, max_hold_bars: 10, volatility_filter: 0.2 } },
      { type: "trial_completed", trial: 2, score: 0.1 },
      { type: "best_updated", trial: 2, score: 0.1 },
      ...runCompleted(),
    ];
  }

  if (demoCase.id === "risk_guard") {
    return [
      ...baseEvents(demoCase.id),
      ...schemaEvents(demoCase.id),
      { type: "trial_started", trial: 0, params: { volatility_window: 20, position_size_cap: 8, max_dd: 15, slippage_limit: 12, halt_threshold: 20 } },
      { type: "trial_completed", trial: 0, score: -1.8 },
      { type: "best_updated", trial: 0, score: -1.8 },
      { type: "trial_started", trial: 1, params: { volatility_window: 55, position_size_cap: 12, max_dd: 12, slippage_limit: 8, halt_threshold: 24 } },
      { type: "trial_completed", trial: 1, score: -0.7 },
      { type: "best_updated", trial: 1, score: -0.7 },
      { type: "trial_started", trial: 2, params: { volatility_window: 80, position_size_cap: 10, max_dd: 10, slippage_limit: 6, halt_threshold: 28 } },
      { type: "trial_pruned", trial: 2, reason: "risk cap violated" },
      ...runCompleted(),
    ];
  }

  if (demoCase.id === "schema_evolution") {
    return [
      ...baseEvents(demoCase.id),
      ...schemaEvents(demoCase.id),
      { type: "trial_started", trial: 0, params: { entry_threshold: 3, stop_loss_pct: 1, take_profit_pct: 2 } },
      { type: "trial_completed", trial: 0, score: 0.2 },
      { type: "best_updated", trial: 0, score: 0.2 },
      { type: "trial_started", trial: 1, params: { entry_threshold: 4, stop_loss_pct: 1.2, take_profit_pct: 2.4, trailing_stop_pct: 0.5 } },
      { type: "trial_completed", trial: 1, score: 0.5 },
      { type: "best_updated", trial: 1, score: 0.5 },
      { type: "trial_started", trial: 2, params: { entry_threshold: 4, stop_loss_pct: 1.1, trailing_stop_pct: 0.8, volatility_filter: 0.4 } },
      { type: "trial_completed", trial: 2, score: 0.9 },
      { type: "best_updated", trial: 2, score: 0.9 },
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

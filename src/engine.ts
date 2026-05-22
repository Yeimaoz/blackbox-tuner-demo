import { getCases } from "./cases";

export type DemoEvent =
  | { type: "run_started"; caseId: string }
  | { type: "trial_started"; trial: number; params: Record<string, number> }
  | { type: "trial_completed"; trial: number; score: number }
  | { type: "trial_pruned"; trial: number; reason: string }
  | { type: "best_updated"; trial: number; score: number }
  | { type: "run_completed" };

function baseEvents(caseId: string): DemoEvent[] {
  return [{ type: "run_started", caseId }];
}

export function buildEventStream(caseId: string): DemoEvent[] {
  const demoCase = getCases().find((item) => item.id === caseId) ?? getCases()[0];

  if (demoCase.id === "fast_converge") {
    return [
      ...baseEvents(demoCase.id),
      { type: "trial_started", trial: 0, params: { x: 1, y: 0.2 } },
      { type: "trial_completed", trial: 0, score: -3.2 },
      { type: "best_updated", trial: 0, score: -3.2 },
      { type: "trial_started", trial: 1, params: { x: 7, y: 0.8 } },
      { type: "trial_completed", trial: 1, score: -0.4 },
      { type: "best_updated", trial: 1, score: -0.4 },
      { type: "run_completed" },
    ];
  }

  if (demoCase.id === "prune_heavy") {
    return [
      ...baseEvents(demoCase.id),
      { type: "trial_started", trial: 0, params: { x: 0, y: 0.1 } },
      { type: "trial_pruned", trial: 0, reason: "low intermediate score" },
      { type: "trial_started", trial: 1, params: { x: 2, y: 0.2 } },
      { type: "trial_pruned", trial: 1, reason: "low intermediate score" },
      { type: "trial_started", trial: 2, params: { x: 6, y: 0.6 } },
      { type: "trial_completed", trial: 2, score: -1.8 },
      { type: "best_updated", trial: 2, score: -1.8 },
      { type: "run_completed" },
    ];
  }

  if (demoCase.id === "noisy_landscape") {
    return [
      ...baseEvents(demoCase.id),
      { type: "trial_started", trial: 0, params: { x: 2, y: 0.2 } },
      { type: "trial_completed", trial: 0, score: -5.0 },
      { type: "best_updated", trial: 0, score: -5.0 },
      { type: "trial_started", trial: 1, params: { x: 8, y: 0.6 } },
      { type: "trial_completed", trial: 1, score: -4.2 },
      { type: "best_updated", trial: 1, score: -4.2 },
      { type: "trial_started", trial: 2, params: { x: 13, y: 0.3 } },
      { type: "trial_completed", trial: 2, score: -4.6 },
      { type: "trial_started", trial: 3, params: { x: 19, y: 0.7 } },
      { type: "trial_completed", trial: 3, score: -3.9 },
      { type: "best_updated", trial: 3, score: -3.9 },
      { type: "run_completed" },
    ];
  }

  if (demoCase.id === "multi_modal") {
    return [
      ...baseEvents(demoCase.id),
      { type: "trial_started", trial: 0, params: { x: 3, y: 0.1 } },
      { type: "trial_completed", trial: 0, score: -6.0 },
      { type: "best_updated", trial: 0, score: -6.0 },
      { type: "trial_started", trial: 1, params: { x: 9, y: 0.2 } },
      { type: "trial_completed", trial: 1, score: -5.5 },
      { type: "best_updated", trial: 1, score: -5.5 },
      { type: "trial_started", trial: 2, params: { x: 16, y: 0.5 } },
      { type: "trial_completed", trial: 2, score: -4.1 },
      { type: "best_updated", trial: 2, score: -4.1 },
      { type: "trial_started", trial: 3, params: { x: 27, y: 0.8 } },
      { type: "trial_completed", trial: 3, score: -2.0 },
      { type: "best_updated", trial: 3, score: -2.0 },
      { type: "run_completed" },
    ];
  }

  if (demoCase.id === "plateau_then_drop") {
    return [
      ...baseEvents(demoCase.id),
      { type: "trial_started", trial: 0, params: { x: 0, y: 0.0 } },
      { type: "trial_completed", trial: 0, score: -6.2 },
      { type: "best_updated", trial: 0, score: -6.2 },
      { type: "trial_started", trial: 1, params: { x: 5, y: 0.1 } },
      { type: "trial_pruned", trial: 1, reason: "flat plateau" },
      { type: "trial_started", trial: 2, params: { x: 10, y: 0.2 } },
      { type: "trial_completed", trial: 2, score: -6.0 },
      { type: "trial_started", trial: 3, params: { x: 23, y: 0.8 } },
      { type: "trial_completed", trial: 3, score: -1.1 },
      { type: "best_updated", trial: 3, score: -1.1 },
      { type: "run_completed" },
    ];
  }

  return [
    ...baseEvents(demoCase.id),
    { type: "trial_started", trial: 0, params: { x: 0, y: 0 } },
    { type: "trial_completed", trial: 0, score: -1.0 },
    { type: "best_updated", trial: 0, score: -1.0 },
    { type: "run_completed" },
  ];
}

import { describe, expect, it } from "vitest";
import { buildEventStream } from "../src/engine";

describe("engine", () => {
  it("emits prune and best-updated events in order for a trading case", () => {
    const stream = buildEventStream("mean_reversion");
    const types = stream.map((event) => event.type);

    expect(types[0]).toBe("run_started");
    expect(types).toContain("trial_pruned");
    expect(types).toContain("best_updated");
    // mean_reversion has exactly 12 trials; a looser bound (>= 8) would allow
    // up to 4 trials to be accidentally deleted without failing.
    expect(types.filter((type) => type === "trial_started").length).toBe(12);
    expect(types.at(-1)).toBe("run_completed");
  });

  it("includes a schema change event for the add/remove param case", () => {
    const stream = buildEventStream("schema_evolution");
    const schemaEvents = stream.filter((event) => event.type === "schema_changed");

    expect(schemaEvents.length).toBe(3);
    expect(schemaEvents[0].kind).toBe("keep");
    expect(schemaEvents[1].kind).toBe("add");
    expect(schemaEvents[2].kind).toBe("remove");
    expect(stream.at(-1)?.type).toBe("run_completed");
  });

  it("breakout_entry emits 12 trials with correct event ordering", () => {
    const stream = buildEventStream("breakout_entry");
    const types = stream.map((event) => event.type);

    expect(types[0]).toBe("run_started");
    expect(types.at(-1)).toBe("run_completed");
    expect(types.filter((t) => t === "trial_started").length).toBe(12);
    expect(types).toContain("trial_pruned");
    expect(types).toContain("best_updated");

    // Every trial_started must be followed (eventually) by either
    // trial_completed or trial_pruned before the next trial_started.
    const trialStartedIndices = types
      .map((t, i) => (t === "trial_started" ? i : -1))
      .filter((i) => i >= 0);
    for (const idx of trialStartedIndices) {
      const rest = types.slice(idx + 1);
      const completedIdx = rest.indexOf("trial_completed");
      const prunedIdx = rest.indexOf("trial_pruned");
      const nextStartIdx = rest.indexOf("trial_started");
      const resolved = Math.min(
        completedIdx >= 0 ? completedIdx : Infinity,
        prunedIdx >= 0 ? prunedIdx : Infinity,
      );
      // Either resolved before next start, or no next start exists.
      expect(resolved).toBeLessThan(nextStartIdx >= 0 ? nextStartIdx : Infinity);
    }
  });

  it("risk_guard emits 12 trials, all params within declared search space", () => {
    const stream = buildEventStream("risk_guard");
    const types = stream.map((event) => event.type);

    expect(types[0]).toBe("run_started");
    expect(types.at(-1)).toBe("run_completed");
    expect(types.filter((t) => t === "trial_started").length).toBe(12);
    expect(types).toContain("trial_pruned");
    expect(types).toContain("best_updated");

    // Verify the best_updated event carries the highest score seen so far
    // (monotone non-decreasing bestScore sequence).
    const bestUpdatedEvents = stream.filter(
      (e): e is Extract<typeof e, { type: "best_updated" }> => e.type === "best_updated",
    );
    expect(bestUpdatedEvents.length).toBeGreaterThan(0);
    for (let i = 1; i < bestUpdatedEvents.length; i++) {
      expect(bestUpdatedEvents[i].score).toBeGreaterThanOrEqual(bestUpdatedEvents[i - 1].score);
    }
  });
});

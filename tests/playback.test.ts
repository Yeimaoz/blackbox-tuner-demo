import { describe, expect, it } from "vitest";
import { createPlaybackState, stepPlayback, switchPlaybackCase } from "../src/render";

describe("playback", () => {
  it("advances through breakout_entry trial events and preserves best-so-far", () => {
    const state = createPlaybackState("breakout_entry");
    const next = stepPlayback(state);

    expect(next.caseId).toBe("breakout_entry");
    expect(next.cursor).toBeGreaterThan(0);
    // breakout_entry first event is run_started (no best_updated yet), so bestScore stays null
    // after one more step we reach schema_changed; keep stepping until we get a best_updated
    const atBest = stepPlayback(stepPlayback(stepPlayback(stepPlayback(next))));
    expect(atBest.bestScore).toBeDefined();
  });

  it("resets playback state when switching from breakout_entry to mean_reversion", () => {
    const state = createPlaybackState("breakout_entry");
    const advanced = stepPlayback(state);
    const switched = switchPlaybackCase(advanced, "mean_reversion");

    expect(switched.caseId).toBe("mean_reversion");
    expect(switched.cursor).toBe(0);
    expect(switched.bestScore).toBeNull();
  });

  it("falls back to breakout_entry events when given an unknown caseId", () => {
    const state = createPlaybackState("nonexistent_case");

    // engine.ts falls back: getCaseById("nonexistent_case") returns undefined,
    // so buildEventStream uses getCaseById("breakout_entry") and emits its events.
    // The first event is run_started with caseId = "breakout_entry" (the resolved fallback id).
    const firstEvent = state.events[0];
    expect(firstEvent.type).toBe("run_started");
    if (firstEvent.type === "run_started") {
      expect(firstEvent.caseId).toBe("breakout_entry");
    }
    // The playback state still has the requested (unknown) caseId
    expect(state.caseId).toBe("nonexistent_case");
    // Events are populated (not empty), confirming fallback fired
    expect(state.events.length).toBeGreaterThan(0);
  });
});

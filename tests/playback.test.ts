import { describe, expect, it } from "vitest";
import { createPlaybackState, stepPlayback, switchPlaybackCase } from "../src/render";

describe("playback", () => {
  it("advances through trial events and preserves best-so-far", () => {
    const state = createPlaybackState("fast_converge");
    const next = stepPlayback(state);

    expect(next.cursor).toBeGreaterThan(0);
    expect(next.bestScore).toBeDefined();
  });

  it("resets playback state when the case changes", () => {
    const state = createPlaybackState("fast_converge");
    const advanced = stepPlayback(state);
    const switched = switchPlaybackCase(advanced, "prune_heavy");

    expect(switched.caseId).toBe("prune_heavy");
    expect(switched.cursor).toBe(0);
    expect(switched.bestScore).toBeNull();
  });
});

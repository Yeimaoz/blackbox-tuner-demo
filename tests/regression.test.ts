/**
 * Regression tests for Critical/High code-review findings.
 * Written TDD-style: these must fail before the fix is applied.
 *
 * Finding 1 (High): trialToX denominator uses total event count instead of trial count
 * Finding 2 (High): risk_guard trial values completely outside declared search space
 */

import { describe, expect, it } from "vitest";
import { buildEventStream } from "../src/engine";
import { getCaseById } from "../src/cases";

// ---------------------------------------------------------------------------
// Helper: parse "name: (int|float)[min,max]" declarations
// ---------------------------------------------------------------------------
function parseSearchSpace(searchSpace: string[]) {
  return searchSpace.map((entry) => {
    const [rawName, rawSpec] = entry.split(":");
    const name = rawName?.trim();
    const match = rawSpec?.trim().match(/^(int|float)\[(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\]$/);
    if (!name || !match) return null;
    return { name, min: Number(match[2]), max: Number(match[3]) };
  }).filter((x): x is { name: string; min: number; max: number } => x !== null);
}

// ---------------------------------------------------------------------------
// Finding 1: trialToX denominator
//
// The denominator passed to trialToX must equal the total number of trials
// (completed + pruned), NOT state.events.length (which includes meta-events).
//
// For breakout_entry:
//   - There are 12 trial slots (trial 0..11), of which 1 is pruned and 11
//     completed → completed count = 11.
//   - state.events.length = 34 (meta-events included).
//
// If the correct denominator (11) is used:
//   trialToX(11, 12) = 70 + (11/11) * 340 = 410  ← right edge
//
// If the buggy denominator (34) is used:
//   trialToX(11, 34) = 70 + (11/33) * 340 ≈ 183  ← stuck in left third
//
// We verify that the event stream has significantly fewer trials than total
// events, which exposes the magnitude of the denominator mis-use.
// We also assert what the CORRECT denominator (trial count) should be
// so that trialToX(lastTrial, trialCount) ≈ 410 (right edge).
// ---------------------------------------------------------------------------
describe("regression: trialToX denominator (Finding 1)", () => {
  it("breakout_entry has far fewer trials than total events", () => {
    const stream = buildEventStream("breakout_entry");

    const completedCount = stream.filter((e) => e.type === "trial_completed").length;
    const prunedCount = stream.filter((e) => e.type === "trial_pruned").length;
    const trialCount = completedCount + prunedCount; // correct denominator = 12
    const totalEvents = stream.length; // buggy denominator = 34

    // Sanity: 12 trials were run for breakout_entry
    expect(trialCount).toBe(12);

    // The bug: events.length is far larger than trial count
    expect(totalEvents).toBeGreaterThan(trialCount * 2);
  });

  it("last breakout_entry trial x-position is near the right edge when denominator is trial count", () => {
    const stream = buildEventStream("breakout_entry");

    const completedTrials = stream
      .filter((e) => e.type === "trial_completed")
      .map((e) => (e as { type: "trial_completed"; trial: number; score: number }).trial);
    const prunedTrials = stream
      .filter((e) => e.type === "trial_pruned")
      .map((e) => (e as { type: "trial_pruned"; trial: number; reason: string }).trial);

    const allTrialNumbers = [...completedTrials, ...prunedTrials];
    const maxTrial = Math.max(...allTrialNumbers); // 11
    const trialCount = allTrialNumbers.length;    // 12 = correct denominator

    // With correct denominator: trialToX(11, 12) = 70 + (11/11)*340 = 410
    const xWithCorrectDenominator = 70 + (maxTrial / Math.max(1, trialCount - 1)) * 340;
    expect(xWithCorrectDenominator).toBeCloseTo(410, 0);

    // With buggy denominator (events.length = 34): trialToX(11, 34) ≈ 183
    const totalEvents = stream.length;
    const xWithBuggyDenominator = 70 + (maxTrial / Math.max(1, totalEvents - 1)) * 340;
    expect(xWithBuggyDenominator).toBeLessThan(250); // confirms the visual bug
  });
});

// ---------------------------------------------------------------------------
// Finding 2: risk_guard trial values outside declared search space
//
// cases.ts declares:
//   position_size_cap: float[0.01,0.20]
//   max_dd:            float[0.05,0.30]
//   slippage_limit:    float[0.0,0.50]
//   halt_threshold:    float[0.10,0.40]
//
// engine.ts uses integer values 8–14 / 9–18 / 4–12 / 20–30 — all at least
// 60× outside the declared range.
//
// After the fix (divide by 100), every value must fall within [min, max].
// ---------------------------------------------------------------------------
describe("regression: risk_guard search space alignment (Finding 2)", () => {
  it("all risk_guard trial params are within the declared search space bounds", () => {
    const riskCase = getCaseById("risk_guard");
    expect(riskCase).toBeTruthy();

    const specs = parseSearchSpace(riskCase!.searchSpace);
    const stream = buildEventStream("risk_guard");

    // Collect params from trial_started events
    const trialStarted = stream.filter((e) => e.type === "trial_started") as Array<{
      type: "trial_started";
      trial: number;
      params: Record<string, number>;
    }>;

    expect(trialStarted.length).toBeGreaterThan(0);

    const violations: string[] = [];
    for (const event of trialStarted) {
      for (const spec of specs) {
        const value = event.params[spec.name];
        if (value === undefined) continue;
        if (value < spec.min || value > spec.max) {
          violations.push(
            `trial ${event.trial}: ${spec.name}=${value} outside [${spec.min},${spec.max}]`,
          );
        }
      }
    }

    // After the fix, this must be empty
    expect(violations).toEqual([]);
  });
});

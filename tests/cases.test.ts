import { describe, expect, it } from "vitest";
import { PUBLIC_API_NAMES } from "../src/api-copy";
import { getCases } from "../src/cases";
import { buildEventStream } from "../src/engine";
import { parseSearchSpace } from "../src/utils";

describe("case bootstrap", () => {
  it("exposes the public API names used by the overlay", () => {
    expect(PUBLIC_API_NAMES).toEqual([
      "ParamSchema",
      "objective",
      "tune()",
      "ObjectiveResult",
      "TuningConfig",
      "TrialEvent",
      "TrialPruned",
    ]);
  });

  it("loads the trading and schema evolution demo cases", () => {
    const cases = getCases();
    expect(cases.map((item) => item.id)).toEqual([
      "breakout_entry",
      "mean_reversion",
      "risk_guard",
      "schema_evolution",
    ]);
    // entry_threshold is declared as int[1,6] (corrected from float[0.01,0.05])
    expect(cases[0].searchSpace).toContain("entry_threshold: int[1,6]");
    expect(cases[3].tags).toContain("schema-change");
    expect(cases[3].schemaPhases.map((phase) => phase.kind)).toEqual(["keep", "add", "remove"]);
  });

  it("all engine trial params for each case fall within the declared search space", () => {
    // Cross-check: for every case, build the event stream and verify that every
    // trial_started param value is within [min, max] from the searchSpace
    // declaration.  This catches regressions where engine.ts and cases.ts drift
    // apart (the root cause of the 'driftLabel always big jump' bug).
    const cases = getCases();
    const violations: string[] = [];

    for (const demoCase of cases) {
      const specs = parseSearchSpace(demoCase.searchSpace);
      if (specs.length === 0) continue;

      const stream = buildEventStream(demoCase.id);
      const trialStarts = stream.filter(
        (e): e is Extract<typeof e, { type: "trial_started" }> => e.type === "trial_started",
      );

      for (const event of trialStarts) {
        for (const spec of specs) {
          const value = event.params[spec.name];
          if (value === undefined) continue;
          if (value < spec.min || value > spec.max) {
            violations.push(
              `${demoCase.id} trial ${event.trial}: ${spec.name}=${value} outside [${spec.min},${spec.max}]`,
            );
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

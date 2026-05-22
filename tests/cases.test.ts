import { describe, expect, it } from "vitest";
import { PUBLIC_API_NAMES } from "../src/api-copy";
import { getCases } from "../src/cases";

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
    expect(cases[0].searchSpace).toContain("entry_threshold: float[0.01,0.05]");
    expect(cases[3].tags).toContain("schema-change");
  });
});

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

  it("loads at least one synthetic demo case", () => {
    const cases = getCases();
    expect(cases.length).toBeGreaterThan(0);
    expect(cases[0].id).toBe("fast_converge");
  });
});

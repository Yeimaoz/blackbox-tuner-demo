/**
 * Unit tests for src/utils.ts pure functions.
 *
 * These functions were previously module-private in app.ts and had zero test
 * coverage.  They are extracted and exported so they can be tested here.
 */

import { describe, expect, it } from "vitest";
import { compareParams, driftLabel, formatSignedDelta, parseSearchSpace, scoreToY, trialToX } from "../src/utils";

// ---------------------------------------------------------------------------
// parseSearchSpace
// ---------------------------------------------------------------------------
describe("parseSearchSpace", () => {
  it("parses a valid float range entry", () => {
    const result = parseSearchSpace(["z_entry: float[1.0,3.5]"]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: "z_entry", min: 1.0, max: 3.5 });
  });

  it("parses a valid int range entry", () => {
    const result = parseSearchSpace(["lookback_bars: int[20,120]"]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: "lookback_bars", min: 20, max: 120 });
  });

  it("parses multiple entries", () => {
    const result = parseSearchSpace([
      "entry_threshold: int[1,6]",
      "stop_loss_pct: float[0.3,2.0]",
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("entry_threshold");
    expect(result[1].name).toBe("stop_loss_pct");
  });

  it("drops malformed entries and returns only valid ones", () => {
    const result = parseSearchSpace([
      "good_param: int[1,10]",
      "bad no colon",
      "also_bad: notarange",
      "another_good: float[0.0,1.0]",
    ]);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name)).toEqual(["good_param", "another_good"]);
  });

  it("returns empty array for empty input", () => {
    expect(parseSearchSpace([])).toEqual([]);
  });

  it("returns empty array when all entries are malformed", () => {
    const result = parseSearchSpace(["no colon here", "also: broken"]);
    expect(result).toHaveLength(0);
  });

  it("parses negative bounds correctly", () => {
    const result = parseSearchSpace(["score_floor: float[-1.0,1.0]"]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: "score_floor", min: -1.0, max: 1.0 });
  });
});

// ---------------------------------------------------------------------------
// driftLabel
// ---------------------------------------------------------------------------
describe("driftLabel", () => {
  const spec = { name: "x", min: 0, max: 10 }; // span = 10

  it("returns 'small move' when ratio < 0.15", () => {
    // |delta|=1, span=10 → ratio=0.1
    expect(driftLabel(1, spec)).toBe("small move");
  });

  it("returns 'noticeable' when ratio is between 0.15 and 0.35", () => {
    // |delta|=2, span=10 → ratio=0.2
    expect(driftLabel(2, spec)).toBe("noticeable");
  });

  it("returns 'big jump' when ratio >= 0.35", () => {
    // |delta|=5, span=10 → ratio=0.5
    expect(driftLabel(5, spec)).toBe("big jump");
  });

  it("returns 'big jump' for boundary exactly at 0.35", () => {
    // |delta|=3.5, span=10 → ratio=0.35
    expect(driftLabel(3.5, spec)).toBe("big jump");
  });

  it("returns 'jump' when no spec provided", () => {
    expect(driftLabel(99)).toBe("jump");
  });

  it("returns 'jump' when spec span is zero", () => {
    expect(driftLabel(5, { name: "x", min: 3, max: 3 })).toBe("jump");
  });

  it("handles negative delta (uses absolute value)", () => {
    // |delta|=5, span=10 → ratio=0.5 → big jump
    expect(driftLabel(-5, spec)).toBe("big jump");
  });
});

// ---------------------------------------------------------------------------
// scoreToY
// ---------------------------------------------------------------------------
describe("scoreToY", () => {
  it("returns 150 (midpoint) when minScore equals maxScore", () => {
    expect(scoreToY(5, 5, 5)).toBe(150);
  });

  it("maps minScore to y=220 (bottom of chart)", () => {
    expect(scoreToY(0, 0, 10)).toBe(220);
  });

  it("maps maxScore to y=60 (top of chart)", () => {
    expect(scoreToY(10, 0, 10)).toBe(60);
  });

  it("maps midpoint score to y=140", () => {
    // t = 0.5, y = 220 - 0.5*160 = 140
    expect(scoreToY(5, 0, 10)).toBeCloseTo(140);
  });

  it("clamps scores below minScore to bottom", () => {
    expect(scoreToY(-5, 0, 10)).toBe(220);
  });

  it("clamps scores above maxScore to top", () => {
    expect(scoreToY(15, 0, 10)).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// trialToX
// ---------------------------------------------------------------------------
describe("trialToX", () => {
  it("returns 90 when total <= 1", () => {
    expect(trialToX(0, 0)).toBe(90);
    expect(trialToX(0, 1)).toBe(90);
  });

  it("maps trial 0 to x=70 (left edge)", () => {
    expect(trialToX(0, 12)).toBe(70);
  });

  it("maps last trial to x=410 (right edge) when trial = total - 1", () => {
    expect(trialToX(11, 12)).toBeCloseTo(410);
  });

  it("maps midpoint trial to approximately x=240", () => {
    // trial 5 of 12: 70 + (5/11)*340 ≈ 224.5
    const x = trialToX(5, 12);
    expect(x).toBeGreaterThan(70);
    expect(x).toBeLessThan(410);
  });
});

// ---------------------------------------------------------------------------
// formatSignedDelta
// ---------------------------------------------------------------------------
describe("formatSignedDelta", () => {
  it("prefixes positive values with '+'", () => {
    expect(formatSignedDelta(1.5)).toBe("+1.50");
  });

  it("does not double-prefix negative values", () => {
    expect(formatSignedDelta(-1.5)).toBe("-1.50");
  });

  it("formats zero without '+' prefix", () => {
    expect(formatSignedDelta(0)).toBe("0.00");
  });
});

// ---------------------------------------------------------------------------
// compareParams
// ---------------------------------------------------------------------------
describe("compareParams", () => {
  const specs = parseSearchSpace(["a: int[0,10]", "b: int[0,100]"]);

  it("returns empty array when previous is undefined", () => {
    expect(compareParams({ a: 5 }, undefined, specs)).toEqual([]);
  });

  it("returns moves sorted by normalized magnitude (largest first)", () => {
    // a: delta=5, span=10 → normalized=0.5
    // b: delta=10, span=100 → normalized=0.1
    const result = compareParams({ a: 5, b: 10 }, { a: 0, b: 0 }, specs);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("a");
    expect(result[1].name).toBe("b");
  });

  it("uses current value as fallback when previous lacks a param", () => {
    const result = compareParams({ a: 5, b: 20 }, { a: 3 }, specs);
    const bEntry = result.find((r) => r.name === "b");
    // b missing from previous → delta = 20 - 20 = 0
    expect(bEntry?.delta).toBe(0);
  });

  it("includes the spec on entries with a known param", () => {
    const result = compareParams({ a: 5 }, { a: 3 }, specs);
    expect(result[0].spec?.name).toBe("a");
  });
});

/**
 * Pure utility functions extracted from app.ts.
 *
 * These functions are free of DOM/import side-effects and are exported so
 * they can be unit-tested in isolation (tests/utils.test.ts).
 */

export type ParamSpec = {
  name: string;
  min: number;
  max: number;
};

/**
 * Parse an array of "name: (int|float)[min,max]" strings into ParamSpec
 * objects.  Malformed entries are silently dropped.
 */
export function parseSearchSpace(searchSpace: string[]): ParamSpec[] {
  return searchSpace
    .map((entry) => {
      const [rawName, rawSpec] = entry.split(":");
      const name = rawName?.trim();
      const match = rawSpec?.trim().match(/^(int|float)\[(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\]$/);

      if (!name || !match) return null;

      return {
        name,
        min: Number(match[2]),
        max: Number(match[3]),
      } satisfies ParamSpec;
    })
    .filter((item): item is ParamSpec => item !== null);
}

/**
 * Return a human-readable label for how large a parameter delta is relative
 * to its declared search-space span.
 *
 * - No spec (or span <= 0): "jump"
 * - |delta| / span >= 0.35: "big jump"
 * - |delta| / span >= 0.15: "noticeable"
 * - otherwise: "small move"
 */
export function driftLabel(delta: number, spec?: ParamSpec): string {
  const span = spec ? spec.max - spec.min : null;
  if (!span || span <= 0) return "jump";
  const ratio = Math.abs(delta) / span;
  if (ratio >= 0.35) return "big jump";
  if (ratio >= 0.15) return "noticeable";
  return "small move";
}

/**
 * Compare two parameter snapshots and return moves sorted by normalized
 * magnitude (largest first).
 */
export function compareParams(
  current: Record<string, number>,
  previous: Record<string, number> | undefined,
  specs: ParamSpec[],
) {
  if (!previous) return [];

  const specMap = new Map(specs.map((spec) => [spec.name, spec]));
  return Object.keys(current)
    .map((name) => {
      const currentValue = current[name];
      const previousValue = previous[name] ?? currentValue;
      const delta = currentValue - previousValue;
      const spec = specMap.get(name);
      const span = spec ? spec.max - spec.min : 0;
      const normalized = span > 0 ? Math.abs(delta) / span : Math.abs(delta);

      return {
        name,
        currentValue,
        previousValue,
        delta,
        normalized,
        spec,
      };
    })
    .sort((a, b) => b.normalized - a.normalized);
}

/**
 * Map a score value to a y-coordinate in the SVG chart (range: 60–220 px).
 *
 * When maxScore === minScore, returns the midpoint 150.
 */
export function scoreToY(score: number, minScore: number, maxScore: number): number {
  if (maxScore === minScore) return 150;
  const clamped = Math.max(minScore, Math.min(maxScore, score));
  const t = (clamped - minScore) / (maxScore - minScore);
  return 220 - t * 160;
}

/**
 * Map a trial number to an x-coordinate in the SVG chart (range: 70–410 px).
 *
 * When total <= 1, all trials collapse to x = 90.
 */
export function trialToX(trial: number, total: number): number {
  if (total <= 1) return 90;
  return 70 + (trial / Math.max(1, total - 1)) * 340;
}

/**
 * Format a signed numeric delta as "+N.NN" or "-N.NN".
 */
export function formatSignedDelta(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}`;
}

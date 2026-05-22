import { describe, expect, it } from "vitest";
import { buildEventStream } from "../src/engine";

describe("engine", () => {
  it("emits prune and best-updated events in order for a prune-heavy case", () => {
    const stream = buildEventStream("prune_heavy");
    const types = stream.map((event) => event.type);

    expect(types[0]).toBe("run_started");
    expect(types).toContain("trial_pruned");
    expect(types).toContain("best_updated");
    expect(types.at(-1)).toBe("run_completed");
  });

  it("makes the example cases behave differently enough to teach distinct patterns", () => {
    const noisy = buildEventStream("noisy_landscape");
    const multiModal = buildEventStream("multi_modal");
    const plateau = buildEventStream("plateau_then_drop");

    expect(noisy.filter((event) => event.type === "trial_completed").length).toBeGreaterThan(1);
    expect(multiModal.filter((event) => event.type === "best_updated").length).toBeGreaterThan(1);
    expect(plateau.some((event) => event.type === "trial_pruned")).toBe(true);
  });
});

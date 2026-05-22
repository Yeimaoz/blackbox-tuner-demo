import { describe, expect, it } from "vitest";
import { buildEventStream } from "../src/engine";

describe("engine", () => {
  it("emits prune and best-updated events in order for a trading case", () => {
    const stream = buildEventStream("mean_reversion");
    const types = stream.map((event) => event.type);

    expect(types[0]).toBe("run_started");
    expect(types).toContain("trial_pruned");
    expect(types).toContain("best_updated");
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
});

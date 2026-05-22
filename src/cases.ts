export type DemoCase = {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  searchSpace: string[];
  objectiveProfile: "fast" | "noisy" | "multimodal" | "plateau";
  pruneProfile: "light" | "heavy" | "late";
  convergenceProfile: "quick" | "slow" | "oscillating";
  notes: string;
};

const CASES: DemoCase[] = [
  {
    id: "fast_converge",
    title: "Fast Convergence",
    summary: "A smooth landscape that locks onto the optimum early.",
    tags: ["easy", "converges"],
    searchSpace: ["x: int[0,10]", "y: float[0,1]"],
    objectiveProfile: "fast",
    pruneProfile: "light",
    convergenceProfile: "quick",
    notes: "Useful for showing the happy path.",
  },
  {
    id: "prune_heavy",
    title: "Prune Heavy",
    summary: "Most early trials are cut before completion.",
    tags: ["pruning", "short-circuit"],
    searchSpace: ["x: int[0,20]", "y: float[0,1]"],
    objectiveProfile: "noisy",
    pruneProfile: "heavy",
    convergenceProfile: "slow",
    notes: "Shows frequent early exits and best-updated recovery.",
  },
  {
    id: "noisy_landscape",
    title: "Noisy Landscape",
    summary: "Scores wobble before the sampler settles.",
    tags: ["noise", "oscillation"],
    searchSpace: ["x: int[0,30]", "temperature: float[0,2]"],
    objectiveProfile: "noisy",
    pruneProfile: "light",
    convergenceProfile: "oscillating",
    notes: "Keeps the curve moving so the demo can show uncertainty.",
  },
  {
    id: "multi_modal",
    title: "Multi Modal",
    summary: "Several local optima compete before one wins.",
    tags: ["local-minima", "exploration"],
    searchSpace: ["x: int[0,40]", "y: float[0,1]"],
    objectiveProfile: "multimodal",
    pruneProfile: "late",
    convergenceProfile: "slow",
    notes: "Demonstrates exploration before exploitation.",
  },
  {
    id: "plateau_then_drop",
    title: "Plateau Then Drop",
    summary: "The search stalls, then suddenly finds a much better region.",
    tags: ["plateau", "late-breakthrough"],
    searchSpace: ["x: int[0,50]", "cooldown: float[0,1]"],
    objectiveProfile: "plateau",
    pruneProfile: "late",
    convergenceProfile: "slow",
    notes: "Useful for showing why patience matters.",
  },
];

export function getCases(): DemoCase[] {
  return CASES.slice();
}

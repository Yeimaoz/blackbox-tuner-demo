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
];

export function getCases(): DemoCase[] {
  return CASES.slice();
}

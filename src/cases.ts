export type SchemaPhase = {
  label: string;
  kind: "add" | "remove" | "keep";
  params: string[];
};

export type ParamInsight = {
  name: string;
  importance: "high" | "medium" | "low" | "inactive";
  note: string;
};

export type DemoCase = {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  searchSpace: string[];
  objectiveProfile: "breakout" | "mean_reversion" | "risk" | "schema";
  pruneProfile: "light" | "heavy" | "late";
  convergenceProfile: "quick" | "slow" | "oscillating";
  notes: string;
  schemaPhases: SchemaPhase[];
  paramInsights: ParamInsight[];
};

const CASES: DemoCase[] = [
  {
    id: "breakout_entry",
    title: "Breakout Entry",
    summary: "Tune a breakout system that trades when price escapes a range.",
    tags: ["trend", "entry", "risk"],
    searchSpace: [
      "entry_threshold: int[1,6]",
      "lookback_bars: int[20,120]",
      "stop_loss_pct: float[0.3,2.0]",
      "take_profit_pct: float[0.5,4.0]",
      "cooldown_bars: int[0,12]",
    ],
    objectiveProfile: "breakout",
    pruneProfile: "light",
    convergenceProfile: "quick",
    notes: "Shows a relatively clean parameter surface with a clear best region.",
    paramInsights: [
      { name: "entry_threshold", importance: "high", note: "drives breakout timing" },
      { name: "lookback_bars", importance: "medium", note: "smooths the reference range" },
      { name: "stop_loss_pct", importance: "high", note: "strong impact on downside control" },
      { name: "take_profit_pct", importance: "medium", note: "helps, but not the dominant driver" },
      { name: "cooldown_bars", importance: "low", note: "often changes without moving score much" },
    ],
    schemaPhases: [
      {
        label: "Base breakout schema",
        kind: "keep",
        params: [
          "entry_threshold",
          "lookback_bars",
          "stop_loss_pct",
          "take_profit_pct",
          "cooldown_bars",
        ],
      },
    ],
  },
  {
    id: "mean_reversion",
    title: "Mean Reversion",
    summary: "Tune a contrarian setup that fades stretched moves.",
    tags: ["oscillation", "pruning", "signals"],
    searchSpace: [
      "z_window: int[10,80]",
      "z_entry: float[1.0,3.5]",
      "z_exit: float[0.2,1.5]",
      "max_hold_bars: int[2,24]",
      "volatility_filter: float[0.0,1.0]",
    ],
    objectiveProfile: "mean_reversion",
    pruneProfile: "heavy",
    convergenceProfile: "oscillating",
    notes: "Good for showing noisy search, prune-heavy runs, and unstable intermediate results.",
    paramInsights: [
      { name: "z_window", importance: "medium", note: "changes the smoothing window" },
      { name: "z_entry", importance: "high", note: "main trigger for signal strength" },
      { name: "z_exit", importance: "low", note: "exit threshold is usually secondary" },
      { name: "max_hold_bars", importance: "medium", note: "limits trade duration but rarely dominates" },
      { name: "volatility_filter", importance: "low", note: "helps, but often does little in this run" },
    ],
    schemaPhases: [
      {
        label: "Initial mean reversion schema",
        kind: "keep",
        params: ["z_window", "z_entry", "z_exit", "max_hold_bars", "volatility_filter"],
      },
    ],
  },
  {
    id: "risk_guard",
    title: "Risk Guard",
    summary: "Tune risk limits that constrain position size and exposure.",
    tags: ["risk", "caps", "safety"],
    searchSpace: [
      "volatility_window: int[10,120]",
      "position_size_cap: float[0.01,0.20]",
      "max_dd: float[0.05,0.30]",
      "slippage_limit: float[0.0,0.50]",
      "halt_threshold: float[0.10,0.40]",
    ],
    objectiveProfile: "risk",
    pruneProfile: "late",
    convergenceProfile: "slow",
    notes: "Shows a conservative surface where feasible regions are narrow and reward comes from avoiding bad settings.",
    paramInsights: [
      { name: "volatility_window", importance: "high", note: "changes regime detection quality" },
      { name: "position_size_cap", importance: "high", note: "directly controls risk exposure" },
      { name: "max_dd", importance: "high", note: "strongly constrains feasible candidates" },
      { name: "slippage_limit", importance: "low", note: "often inactive unless execution is stressed" },
      { name: "halt_threshold", importance: "medium", note: "matters mainly in extreme scenarios" },
    ],
    schemaPhases: [
      {
        label: "Risk guard schema",
        kind: "keep",
        params: ["volatility_window", "position_size_cap", "max_dd", "slippage_limit", "halt_threshold"],
      },
    ],
  },
  {
    id: "schema_evolution",
    title: "Schema Evolution",
    summary: "Demonstrate adding and removing parameters while a tuning run stays interpretable.",
    tags: ["schema-change", "add/remove", "demo"],
    searchSpace: [
      "entry_threshold: int[1,6]",
      "stop_loss_pct: float[0.3,2.0]",
      "take_profit_pct: float[0.5,4.0]",
      "trailing_stop_pct: float[0.1,1.2]",
      "volatility_filter: float[0.0,1.0]",
    ],
    objectiveProfile: "schema",
    pruneProfile: "late",
    convergenceProfile: "slow",
    notes: "The main teaching case for how a tuner handles search-space edits.",
    paramInsights: [
      { name: "entry_threshold", importance: "high", note: "still matters across all phases" },
      { name: "stop_loss_pct", importance: "medium", note: "useful, but not the only driver" },
      { name: "take_profit_pct", importance: "inactive", note: "removed after phase 3" },
      { name: "trailing_stop_pct", importance: "high", note: "becomes important after the add phase" },
      { name: "volatility_filter", importance: "low", note: "only starts to matter in the final phase" },
    ],
    schemaPhases: [
      {
        label: "Phase 1: baseline",
        kind: "keep",
        params: ["entry_threshold", "stop_loss_pct", "take_profit_pct"],
      },
      {
        label: "Phase 2: add trailing stop",
        kind: "add",
        params: ["entry_threshold", "stop_loss_pct", "take_profit_pct", "trailing_stop_pct"],
      },
      {
        label: "Phase 3: remove take profit",
        kind: "remove",
        params: ["entry_threshold", "stop_loss_pct", "trailing_stop_pct", "volatility_filter"],
      },
    ],
  },
];

export function getCases(): DemoCase[] {
  return CASES.slice();
}

export function getCaseById(caseId: string): DemoCase | undefined {
  return CASES.find((item) => item.id === caseId);
}

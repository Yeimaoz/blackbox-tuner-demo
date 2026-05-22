export const PUBLIC_API_NAMES = [
  "ParamSchema",
  "objective",
  "tune()",
  "ObjectiveResult",
  "TuningConfig",
  "TrialEvent",
  "TrialPruned",
] as const;

export const API_OVERLAY_COPY = [
  "ParamSchema defines the search space.",
  "objective receives params and returns a score.",
  "tune() runs the session and emits events.",
] as const;

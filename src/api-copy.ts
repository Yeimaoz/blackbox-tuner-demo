/**
 * Static display list of API surface names used in the demo overlay.
 *
 * NOTE: This is *static documentation copy*, not a live reflection of the
 * blackbox-tuner package API.  It exists so the UI overlay and snapshot tests
 * share a single source of truth for the displayed name list.  Do not infer
 * actual package exports from this constant — consult the blackbox-tuner
 * package itself for authoritative API shape.
 */
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

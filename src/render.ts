import { buildEventStream, type DemoEvent } from "./engine";

export type PlaybackState = {
  caseId: string;
  events: DemoEvent[];
  cursor: number;
  bestScore: number | null;
};

export function createPlaybackState(caseId: string): PlaybackState {
  return {
    caseId,
    events: buildEventStream(caseId),
    cursor: 0,
    bestScore: null,
  };
}

export function stepPlayback(state: PlaybackState): PlaybackState {
  const nextCursor = Math.min(state.cursor + 1, state.events.length);
  const visible = state.events.slice(0, nextCursor);
  const bestScore = visible.reduce<number | null>((best, event) => {
    if (event.type !== "best_updated") return best;
    return best === null ? event.score : Math.max(best, event.score);
  }, null);

  return {
    ...state,
    cursor: nextCursor,
    bestScore,
  };
}

export function switchPlaybackCase(_state: PlaybackState, caseId: string): PlaybackState {
  return createPlaybackState(caseId);
}

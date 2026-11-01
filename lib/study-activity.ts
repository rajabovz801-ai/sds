export const STUDY_IDLE_MS = 5 * 60 * 1000;
export type StudyActivity = {
 visible: boolean; focused: boolean; lastActivity: number; now: number;
 mediaPlaying: boolean; enabled?: boolean;
};
export function shouldCountStudy(state: StudyActivity): boolean {
 return state.enabled !== false && state.visible && state.focused &&
  (state.mediaPlaying || (state.now >= state.lastActivity && state.now - state.lastActivity <= STUDY_IDLE_MS));
}

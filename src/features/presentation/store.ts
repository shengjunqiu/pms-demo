import { create } from 'zustand';
import { localReturnPath, readPosition, type PresentationPosition } from './model';

const KEY = 'pms-demo:presentation:v1';
interface PresentationSession extends PresentationPosition {
  entryPath: string;
  hasVisited: boolean;
  remember: (position: PresentationPosition) => void;
  enter: (from: string) => void;
}

function savedSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    return { ...(readPosition(saved) || { slide: 1, selections: {} }), entryPath: localReturnPath(saved?.entryPath), hasVisited: saved?.hasVisited === true };
  } catch {
    return { slide: 1, selections: {}, entryPath: '/projects', hasVisited: false };
  }
}

export const usePresentationStore = create<PresentationSession>((set) => ({
  ...savedSession(),
  remember: (position) => set(position),
  enter: (from) => set({ entryPath: localReturnPath(from), hasVisited: true }),
}));

usePresentationStore.subscribe(({ slide, selections, entryPath, hasVisited }) => {
  try { sessionStorage.setItem(KEY, JSON.stringify({ slide, selections, entryPath, hasVisited })); }
  catch { /* Returning inside this session still works when browser storage is full. */ }
});

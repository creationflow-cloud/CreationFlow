import type { CreationFlowDocument } from "@creationflow/schema";

const MAX_HISTORY = 50;

export interface HistoryState {
  readonly undoStack: readonly CreationFlowDocument[];
  readonly redoStack: readonly CreationFlowDocument[];
}

export function createEmptyHistory(): HistoryState {
  return { undoStack: [], redoStack: [] };
}

export function pushHistory(state: HistoryState, document: CreationFlowDocument): HistoryState {
  const nextUndo = [...state.undoStack, document];
  const trimmed =
    nextUndo.length > MAX_HISTORY ? nextUndo.slice(nextUndo.length - MAX_HISTORY) : nextUndo;

  return {
    undoStack: trimmed,
    redoStack: [],
  };
}

export function undo(
  state: HistoryState,
  current: CreationFlowDocument,
): HistoryState & { previous: CreationFlowDocument | null } {
  if (state.undoStack.length === 0) {
    return { ...state, previous: null };
  }

  const previous = state.undoStack[state.undoStack.length - 1];
  const newUndo = state.undoStack.slice(0, -1);
  const newRedo = [...state.redoStack, current];

  return {
    undoStack: newUndo,
    redoStack: newRedo,
    previous,
  };
}

export function redo(
  state: HistoryState,
  current: CreationFlowDocument,
): HistoryState & { next: CreationFlowDocument | null } {
  if (state.redoStack.length === 0) {
    return { ...state, next: null };
  }

  const next = state.redoStack[state.redoStack.length - 1];
  const newRedo = state.redoStack.slice(0, -1);
  const newUndo = [...state.undoStack, current];

  return {
    undoStack: newUndo,
    redoStack: newRedo,
    next,
  };
}

export function canUndo(state: HistoryState): boolean {
  return state.undoStack.length > 0;
}

export function canRedo(state: HistoryState): boolean {
  return state.redoStack.length > 0;
}

export function documentsEqual(a: CreationFlowDocument, b: CreationFlowDocument): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

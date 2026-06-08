import { useEffect } from "react";

import type { SelectionState } from "./selection-helpers.js";

export interface KeyboardShortcutActions {
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onSave: () => void;
  readonly onDuplicate: () => void;
  readonly onDelete: () => void;
  readonly onSelectAll: () => void;
  readonly onClearSelection: () => void;
  readonly onNudgeSelection: (dx: number, dy: number) => void;
  readonly onGroup?: () => void;
  readonly onUngroup?: () => void;
}

export type ShortcutEventTarget = { readonly isInput: boolean };

export interface ShortcutMatch {
  readonly action: keyof KeyboardShortcutActions | null;
  readonly nudge: { readonly dx: number; readonly dy: number } | null;
  readonly consume: boolean;
}

export function classifyShortcut(
  event: {
    readonly key: string;
    readonly ctrlKey?: boolean;
    readonly metaKey?: boolean;
    readonly shiftKey?: boolean;
  },
  target: ShortcutEventTarget,
  selection: Pick<SelectionState, "selectedElementIds">,
): ShortcutMatch {
  if (target.isInput) {
    return { action: null, nudge: null, consume: false };
  }

  const mod = Boolean(event.ctrlKey || event.metaKey);
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

  if (mod && key === "a") {
    return { action: "onSelectAll", nudge: null, consume: true };
  }

  if (mod && key === "z" && !event.shiftKey) {
    return { action: "onUndo", nudge: null, consume: true };
  }

  if (mod && (key === "y" || (key === "z" && event.shiftKey))) {
    return { action: "onRedo", nudge: null, consume: true };
  }

  if (mod && key === "s") {
    return { action: "onSave", nudge: null, consume: true };
  }

  if (mod && key === "d") {
    return { action: "onDuplicate", nudge: null, consume: true };
  }

  if (mod && key === "g" && !event.shiftKey) {
    return { action: "onGroup", nudge: null, consume: true };
  }

  if (mod && key === "g" && event.shiftKey) {
    return { action: "onUngroup", nudge: null, consume: true };
  }

  if (event.key === "Delete" || event.key === "Backspace") {
    if (selection.selectedElementIds.length === 0) {
      return { action: null, nudge: null, consume: false };
    }
    return { action: "onDelete", nudge: null, consume: true };
  }

  if (event.key === "Escape") {
    if (selection.selectedElementIds.length === 0) {
      return { action: null, nudge: null, consume: false };
    }
    return { action: "onClearSelection", nudge: null, consume: true };
  }

  if (selection.selectedElementIds.length === 0) {
    return { action: null, nudge: null, consume: false };
  }

  const step = event.shiftKey ? 10 : 1;
  switch (event.key) {
    case "ArrowLeft":
      return { action: null, nudge: { dx: -step, dy: 0 }, consume: true };
    case "ArrowRight":
      return { action: null, nudge: { dx: step, dy: 0 }, consume: true };
    case "ArrowUp":
      return { action: null, nudge: { dx: 0, dy: -step }, consume: true };
    case "ArrowDown":
      return { action: null, nudge: { dx: 0, dy: step }, consume: true };
    default:
      return { action: null, nudge: null, consume: false };
  }
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function useKeyboardShortcuts(
  selection: SelectionState,
  actions: KeyboardShortcutActions,
): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target: ShortcutEventTarget = { isInput: isEditableTarget(event.target) };
      const match = classifyShortcut(event, target, selection);
      if (!match.consume) return;
      event.preventDefault();
      if (match.action) {
        const fn = actions[match.action];
        if (fn) {
          (fn as () => void)();
        }
        return;
      }
      if (match.nudge) {
        actions.onNudgeSelection(match.nudge.dx, match.nudge.dy);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selection, actions]);
}

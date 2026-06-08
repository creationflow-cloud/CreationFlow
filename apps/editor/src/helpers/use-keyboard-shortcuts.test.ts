import { describe, expect, it } from "vitest";

import { classifyShortcut } from "./use-keyboard-shortcuts.js";

const emptySelection = { selectedElementIds: [] as readonly string[] };
const oneSelected = { selectedElementIds: ["e1"] as readonly string[] };

const notInput = { isInput: false };
const inputTarget = { isInput: true };

describe("classifyShortcut", () => {
  it("returns select-all on Ctrl+A even with no selection", () => {
    const match = classifyShortcut({ key: "a", ctrlKey: true }, notInput, emptySelection);
    expect(match.action).toBe("onSelectAll");
    expect(match.consume).toBe(true);
  });

  it("returns undo on Ctrl+Z", () => {
    const match = classifyShortcut({ key: "z", ctrlKey: true }, notInput, emptySelection);
    expect(match.action).toBe("onUndo");
  });

  it("returns redo on Ctrl+Y and Ctrl+Shift+Z", () => {
    expect(classifyShortcut({ key: "y", ctrlKey: true }, notInput, emptySelection).action).toBe("onRedo");
    expect(classifyShortcut({ key: "z", ctrlKey: true, shiftKey: true }, notInput, emptySelection).action).toBe("onRedo");
  });

  it("returns save on Ctrl+S", () => {
    expect(classifyShortcut({ key: "s", ctrlKey: true }, notInput, emptySelection).action).toBe("onSave");
  });

  it("returns duplicate on Ctrl+D", () => {
    expect(classifyShortcut({ key: "d", ctrlKey: true }, notInput, oneSelected).action).toBe("onDuplicate");
  });

  it("does not trigger delete when nothing is selected", () => {
    const match = classifyShortcut({ key: "Delete" }, notInput, emptySelection);
    expect(match.action).toBeNull();
    expect(match.consume).toBe(false);
  });

  it("triggers delete on Delete with selection", () => {
    const match = classifyShortcut({ key: "Delete" }, notInput, oneSelected);
    expect(match.action).toBe("onDelete");
  });

  it("triggers delete on Backspace with selection", () => {
    const match = classifyShortcut({ key: "Backspace" }, notInput, oneSelected);
    expect(match.action).toBe("onDelete");
  });

  it("triggers clear-selection on Escape with selection", () => {
    const match = classifyShortcut({ key: "Escape" }, notInput, oneSelected);
    expect(match.action).toBe("onClearSelection");
  });

  it("nudges by 1px on arrow keys", () => {
    expect(classifyShortcut({ key: "ArrowRight" }, notInput, oneSelected).nudge).toEqual({ dx: 1, dy: 0 });
    expect(classifyShortcut({ key: "ArrowDown" }, notInput, oneSelected).nudge).toEqual({ dx: 0, dy: 1 });
    expect(classifyShortcut({ key: "ArrowLeft" }, notInput, oneSelected).nudge).toEqual({ dx: -1, dy: 0 });
    expect(classifyShortcut({ key: "ArrowUp" }, notInput, oneSelected).nudge).toEqual({ dx: 0, dy: -1 });
  });

  it("nudges by 10px on arrow keys with shift", () => {
    expect(classifyShortcut({ key: "ArrowRight", shiftKey: true }, notInput, oneSelected).nudge).toEqual({ dx: 10, dy: 0 });
  });

  it("does not nudge without selection", () => {
    expect(classifyShortcut({ key: "ArrowRight" }, notInput, emptySelection).action).toBeNull();
    expect(classifyShortcut({ key: "ArrowRight" }, notInput, emptySelection).consume).toBe(false);
  });

  it("ignores all shortcuts when target is an input", () => {
    expect(classifyShortcut({ key: "Delete" }, inputTarget, oneSelected).action).toBeNull();
    expect(classifyShortcut({ key: "a", ctrlKey: true }, inputTarget, emptySelection).action).toBeNull();
    expect(classifyShortcut({ key: "ArrowRight" }, inputTarget, oneSelected).nudge).toBeNull();
  });

  it("handles uppercase letters in ctrl shortcuts", () => {
    expect(classifyShortcut({ key: "A", ctrlKey: true }, notInput, emptySelection).action).toBe("onSelectAll");
  });

  it("triggers group on Ctrl+G and ungroup on Ctrl+Shift+G", () => {
    const group = classifyShortcut({ key: "g", ctrlKey: true }, notInput, oneSelected);
    expect(group.action).toBe("onGroup");
    expect(group.consume).toBe(true);
    const ungroup = classifyShortcut({ key: "g", ctrlKey: true, shiftKey: true }, notInput, oneSelected);
    expect(ungroup.action).toBe("onUngroup");
    expect(ungroup.consume).toBe(true);
  });
});

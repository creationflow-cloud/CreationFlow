import type { ChangeEvent } from "react";

import { DEFAULT_GRID_SIZE, DEFAULT_SNAP_THRESHOLD_PX } from "../helpers/snap-helpers.js";

export interface CanvasSettings {
  readonly snapToGrid: boolean;
  readonly gridSize: number;
  readonly showAlignmentGuides: boolean;
  readonly snapThreshold: number;
}

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  snapToGrid: false,
  gridSize: DEFAULT_GRID_SIZE,
  showAlignmentGuides: true,
  snapThreshold: DEFAULT_SNAP_THRESHOLD_PX,
};

interface CanvasSettingsPanelProps {
  readonly settings: CanvasSettings;
  readonly onChange: (settings: CanvasSettings) => void;
}

export function CanvasSettingsPanel({ settings, onChange }: CanvasSettingsPanelProps) {
  function updateSnapToGrid(event: ChangeEvent<HTMLInputElement>) {
    onChange({ ...settings, snapToGrid: event.target.checked });
  }

  function updateGridSize(event: ChangeEvent<HTMLInputElement>) {
    const parsed = Number(event.target.value);
    if (!Number.isFinite(parsed) || parsed < 1) return;
    onChange({ ...settings, gridSize: parsed });
  }

  function updateShowGuides(event: ChangeEvent<HTMLInputElement>) {
    onChange({ ...settings, showAlignmentGuides: event.target.checked });
  }

  function updateSnapThreshold(event: ChangeEvent<HTMLInputElement>) {
    const parsed = Number(event.target.value);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    onChange({ ...settings, snapThreshold: parsed });
  }

  return (
    <div className="canvas-settings-panel">
      <label className="canvas-settings-row" htmlFor="setting-snap-grid">
        <input
          id="setting-snap-grid"
          type="checkbox"
          checked={settings.snapToGrid}
          onChange={updateSnapToGrid}
        />
        <span>Snap to grid</span>
      </label>
      <div className="canvas-settings-row">
        <label htmlFor="setting-grid-size">Grid size (px)</label>
        <input
          id="setting-grid-size"
          className="info-input"
          type="number"
          min={1}
          max={512}
          value={settings.gridSize}
          onChange={updateGridSize}
          disabled={!settings.snapToGrid}
        />
      </div>
      <label className="canvas-settings-row" htmlFor="setting-show-guides">
        <input
          id="setting-show-guides"
          type="checkbox"
          checked={settings.showAlignmentGuides}
          onChange={updateShowGuides}
        />
        <span>Show alignment guides</span>
      </label>
      <div className="canvas-settings-row">
        <label htmlFor="setting-snap-threshold">Snap threshold (px)</label>
        <input
          id="setting-snap-threshold"
          className="info-input"
          type="number"
          min={0}
          max={64}
          value={settings.snapThreshold}
          onChange={updateSnapThreshold}
          disabled={!settings.showAlignmentGuides && !settings.snapToGrid}
        />
      </div>
    </div>
  );
}

import type { ViewState } from "../helpers/use-zoom-pan.js";

interface ZoomControlsProps {
  readonly view: ViewState;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onReset: () => void;
  readonly onFit: () => void;
}

export function ZoomControls({ view, onZoomIn, onZoomOut, onReset, onFit }: ZoomControlsProps) {
  const percent = Math.round(view.zoom * 100);
  return (
    <div className="zoom-controls" role="toolbar" aria-label="Zoom controls">
      <button
        type="button"
        className="zoom-btn"
        onClick={onZoomOut}
        title="Zoom out"
        aria-label="Zoom out"
      >
        −
      </button>
      <span className="zoom-level" aria-live="polite">
        {percent}%
      </span>
      <button
        type="button"
        className="zoom-btn"
        onClick={onZoomIn}
        title="Zoom in"
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        type="button"
        className="zoom-btn"
        onClick={onReset}
        title="Reset zoom"
        aria-label="Reset zoom"
      >
        1:1
      </button>
      <button
        type="button"
        className="zoom-btn"
        onClick={onFit}
        title="Fit to viewport"
        aria-label="Fit to viewport"
      >
        Fit
      </button>
    </div>
  );
}

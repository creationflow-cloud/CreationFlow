import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export interface ViewState {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;

export function clampZoom(zoom: number): number {
  if (zoom < MIN_ZOOM) return MIN_ZOOM;
  if (zoom > MAX_ZOOM) return MAX_ZOOM;
  return zoom;
}

export function zoomAtPoint(
  state: ViewState,
  factor: number,
  anchor: { readonly x: number; readonly y: number },
): ViewState {
  const newZoom = clampZoom(state.zoom * factor);
  if (newZoom === state.zoom) {
    return state;
  }

  const scale = newZoom / state.zoom;
  return {
    zoom: newZoom,
    panX: anchor.x - (anchor.x - state.panX) * scale,
    panY: anchor.y - (anchor.y - state.panY) * scale,
  };
}

export function defaultViewState(): ViewState {
  return { zoom: 1, panX: 0, panY: 0 };
}

export function fitView(width: number, height: number, viewportWidth: number, viewportHeight: number, padding = 32): ViewState {
  if (width <= 0 || height <= 0 || viewportWidth <= 0 || viewportHeight <= 0) {
    return defaultViewState();
  }
  const zoom = Math.min(
    (viewportWidth - padding * 2) / width,
    (viewportHeight - padding * 2) / height,
    1,
  );
  const finalZoom = clampZoom(zoom);
  return {
    zoom: finalZoom,
    panX: (viewportWidth - width * finalZoom) / 2,
    panY: (viewportHeight - height * finalZoom) / 2,
  };
}

export interface UseZoomPanOptions {
  readonly surface: { readonly width: number; readonly height: number } | undefined;
  readonly viewport: { readonly width: number; readonly height: number } | null;
  readonly resetKey?: string;
}

export interface UseZoomPanResult {
  readonly view: ViewState;
  readonly setView: (next: ViewState) => void;
  readonly resetView: () => void;
  readonly fitToViewport: () => void;
  readonly zoomIn: () => void;
  readonly zoomOut: () => void;
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly isSpacePressed: boolean;
}

export function useZoomPan(options: UseZoomPanOptions): UseZoomPanResult {
  const { surface, viewport, resetKey } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ViewState>(defaultViewState());
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const initialFitDone = useRef(false);

  const resetView = useCallback(() => {
    setView(defaultViewState());
  }, []);

  const fitToViewport = useCallback(() => {
    if (!surface || !viewport) return;
    setView(fitView(surface.width, surface.height, viewport.width, viewport.height));
  }, [surface, viewport]);

  useEffect(() => {
    if (!surface || !viewport) {
      return;
    }
    if (initialFitDone.current) {
      return;
    }
    setView(fitView(surface.width, surface.height, viewport.width, viewport.height));
    initialFitDone.current = true;
  }, [surface, viewport, resetKey]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== "Space") return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (event.repeat) return;
      setIsSpacePressed(true);
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") {
        setIsSpacePressed(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const zoomIn = useCallback(() => {
    setView((prev) => ({ ...prev, zoom: clampZoom(prev.zoom * 1.2) }));
  }, []);

  const zoomOut = useCallback(() => {
    setView((prev) => ({ ...prev, zoom: clampZoom(prev.zoom / 1.2) }));
  }, []);

  return {
    view,
    setView,
    resetView,
    fitToViewport,
    zoomIn,
    zoomOut,
    containerRef,
    isSpacePressed,
  };
}

export type ResizeDirection = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export const MIN_DIMENSION = 10;

export function clampSize(value: number): number {
  return Math.max(MIN_DIMENSION, value);
}

export interface ResizeStart {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function applyResize(
  start: ResizeStart,
  direction: ResizeDirection,
  dx: number,
  dy: number,
  aspectLocked: boolean,
): ResizeStart {
  let { x, y, width, height } = start;
  const startRight = start.x + start.width;
  const startBottom = start.y + start.height;

  if (direction === "nw" || direction === "w" || direction === "sw") {
    x = start.x + dx;
  }
  if (direction === "ne" || direction === "n" || direction === "nw") {
    y = start.y + dy;
  }
  if (direction === "ne" || direction === "e" || direction === "se") {
    width = start.width + dx;
  }
  if (direction === "se" || direction === "s" || direction === "sw") {
    height = start.height + dy;
  }

  if (aspectLocked && start.width > 0 && start.height > 0) {
    const startRatio = start.width / start.height;
    if (direction === "n" || direction === "s") {
      const newHeight = clampSize(height);
      const newWidth = clampSize(newHeight * startRatio);
      if (direction === "n") {
        y = start.y + (start.height - newHeight);
      }
      x = start.x + (start.width - newWidth) / 2;
      width = newWidth;
      height = newHeight;
    } else if (direction === "e" || direction === "w") {
      const newWidth = clampSize(width);
      const newHeight = clampSize(newWidth / startRatio);
      if (direction === "w") {
        x = start.x + (start.width - newWidth);
        y = start.y + (start.height - newHeight) / 2;
      } else {
        y = start.y + (start.height - newHeight) / 2;
      }
      width = newWidth;
      height = newHeight;
    } else {
      const widthFromDx = Math.abs(dx);
      const heightFromDy = Math.abs(dy);
      if (widthFromDx >= heightFromDy) {
        const newWidth = clampSize(start.width + dx);
        const newHeight = clampSize(newWidth / startRatio);
        if (direction === "nw" || direction === "sw") {
          x = start.x + (start.width - newWidth);
        }
        if (direction === "nw" || direction === "ne") {
          y = start.y + (start.height - newHeight);
        }
        width = newWidth;
        height = newHeight;
      } else {
        const newHeight = clampSize(start.height + dy);
        const newWidth = clampSize(newHeight * startRatio);
        if (direction === "nw" || direction === "sw") {
          x = start.x + (start.width - newWidth);
        }
        if (direction === "nw" || direction === "ne") {
          y = start.y + (start.height - newHeight);
        }
        width = newWidth;
        height = newHeight;
      }
    }
    return { x, y, width, height };
  }

  // Free-resize: clamp the dimension that is being pulled, but keep the
  // opposite anchor pinned to its start position. When the user drags
  // past the anchor we clamp the dimension to MIN_DIMENSION and pin the
  // corner the other side of the anchor instead.
  if (direction === "nw" || direction === "w" || direction === "sw") {
    const newWidth = startRight - x;
    if (newWidth >= MIN_DIMENSION) {
      width = newWidth;
    } else {
      x = startRight - MIN_DIMENSION;
      width = MIN_DIMENSION;
    }
  } else if (direction === "ne" || direction === "e" || direction === "se") {
    if (width < MIN_DIMENSION) {
      width = MIN_DIMENSION;
      x = startRight - MIN_DIMENSION;
    }
  }
  if (direction === "nw" || direction === "n" || direction === "ne") {
    const newHeight = startBottom - y;
    if (newHeight >= MIN_DIMENSION) {
      height = newHeight;
    } else {
      y = startBottom - MIN_DIMENSION;
      height = MIN_DIMENSION;
    }
  } else if (direction === "sw" || direction === "s" || direction === "se") {
    if (height < MIN_DIMENSION) {
      height = MIN_DIMENSION;
      y = startBottom - MIN_DIMENSION;
    }
  }

  return { x, y, width, height };
}

import { describe, expect, it, vi } from "vitest";

import { debounce, leadingDebounce, rafThrottle } from "./index.js";

describe("debounce", () => {
  it("coalesces calls within the wait window", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, { wait: 100 });
    d();
    d();
    d();
    vi.advanceTimersByTime(99);
    expect(fn).toHaveBeenCalledTimes(0);
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("forwards the most recent args", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, { wait: 50 });
    d("a");
    d("b");
    d("c");
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledWith("c");
    vi.useRealTimers();
  });

  it("cancel prevents the trailing call", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, { wait: 50 });
    d("x");
    d.cancel();
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(0);
    vi.useRealTimers();
  });

  it("flush runs the pending call immediately", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, { wait: 50 });
    d("y");
    d.flush();
    expect(fn).toHaveBeenCalledWith("y");
    vi.useRealTimers();
  });
});

describe("leadingDebounce", () => {
  it("fires immediately and ignores the rest within the window", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = leadingDebounce(fn, 50);
    d("a");
    d("b");
    expect(fn).toHaveBeenCalledWith("a");
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60);
    d("c");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("c");
    vi.useRealTimers();
  });
});

describe("rafThrottle", () => {
  it("coalesces calls within a frame", async () => {
    const originalRaf = globalThis.requestAnimationFrame;
    let resolveFrame: (() => void) | null = null;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      resolveFrame = () => cb(0);
      return 0;
    }) as typeof globalThis.requestAnimationFrame;
    try {
      const fn = vi.fn();
      const t = rafThrottle(fn);
      t("a");
      t("b");
      expect(fn).toHaveBeenCalledTimes(0);
      if (resolveFrame) resolveFrame();
      await Promise.resolve();
      expect(fn).toHaveBeenCalledWith("b");
      expect(fn).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.requestAnimationFrame = originalRaf;
    }
  });
});

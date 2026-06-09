import { describe, expect, it, vi } from "vitest";

import { createEmitter } from "./index.js";

interface TestEvents {
  hello: [string];
  ping: [number];
}

describe("createEmitter", () => {
  it("calls registered listeners on emit", () => {
    const e = createEmitter<TestEvents>();
    const onHello = vi.fn();
    e.on("hello", onHello);
    e.emit("hello", "world");
    expect(onHello).toHaveBeenCalledWith("world");
  });

  it("off removes a listener", () => {
    const e = createEmitter<TestEvents>();
    const fn = vi.fn();
    e.on("ping", fn);
    e.off("ping", fn);
    e.emit("ping", 1);
    expect(fn).toHaveBeenCalledTimes(0);
  });

  it("returns an unsubscribe handle from on", () => {
    const e = createEmitter<TestEvents>();
    const fn = vi.fn();
    const dispose = e.on("ping", fn);
    dispose();
    e.emit("ping", 1);
    expect(fn).toHaveBeenCalledTimes(0);
  });

  it("isolates throwing listeners", () => {
    const e = createEmitter<TestEvents>();
    const consoleSpy = vi.spyOn(globalThis.console, "error").mockImplementation(() => {});
    const after = vi.fn();
    e.on("hello", () => {
      throw new Error("boom");
    });
    e.on("hello", after);
    e.emit("hello", "x");
    expect(after).toHaveBeenCalledWith("x");
    consoleSpy.mockRestore();
  });

  it("clears all listeners", () => {
    const e = createEmitter<TestEvents>();
    const fn = vi.fn();
    e.on("ping", fn);
    e.clear();
    e.emit("ping", 1);
    expect(fn).toHaveBeenCalledTimes(0);
  });

  it("counts listeners", () => {
    const e = createEmitter<TestEvents>();
    expect(e.listenerCount("ping")).toBe(0);
    const off1 = e.on("ping", () => {});
    expect(e.listenerCount("ping")).toBe(1);
    const off2 = e.on("ping", () => {});
    expect(e.listenerCount("ping")).toBe(2);
    off1();
    off2();
    expect(e.listenerCount("ping")).toBe(0);
  });
});

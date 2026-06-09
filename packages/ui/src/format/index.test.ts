import { describe, expect, it } from "vitest";

import { clamp, cx, formatNumber, formatPercent, isShallowEqual } from "./index.js";

describe("cx", () => {
  it("joins truthy values", () => {
    expect(cx("a", "b", "c")).toBe("a b c");
  });

  it("skips falsy values", () => {
    expect(cx("a", null, undefined, false, "b")).toBe("a b");
  });

  it("flattens arrays", () => {
    expect(cx("a", ["b", "c"], "d")).toBe("a b c d");
  });
});

describe("formatNumber", () => {
  it("returns an em-dash for non-finite values", () => {
    expect(formatNumber(Number.NaN)).toBe("–");
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe("–");
  });

  it("formats using default locale", () => {
    expect(formatNumber(1234.5, "en-US")).toBe("1,234.5");
    expect(formatNumber(1234.5, "de-DE")).toBe("1.234,5");
  });
});

describe("formatPercent", () => {
  it("formats using fractionDigits", () => {
    expect(formatPercent(0.123, 0, "en-US")).toBe("12%");
    expect(formatPercent(0.123, 1, "en-US")).toBe("12.3%");
  });
});

describe("clamp", () => {
  it("returns the value when in range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("clamps to the min boundary", () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });

  it("clamps to the max boundary", () => {
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe("isShallowEqual", () => {
  it("returns true for equal arrays", () => {
    expect(isShallowEqual([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it("returns false for different lengths", () => {
    expect(isShallowEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it("returns false for different items", () => {
    expect(isShallowEqual([1, 2, 3], [1, 2, 4])).toBe(false);
  });
});

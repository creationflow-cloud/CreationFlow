import { describe, expect, it } from "vitest";

import { buildRenderJobStatus } from "./render-job-status.js";

describe("buildRenderJobStatus", () => {
  it("clamps progress to 0-100", () => {
    expect(buildRenderJobStatus("processing", 150, "x").progress).toBe(100);
    expect(buildRenderJobStatus("processing", -10, "x").progress).toBe(0);
    expect(buildRenderJobStatus("processing", 50.4, "x").progress).toBe(50);
  });

  it("only sets finishedAt for done or failed", () => {
    expect(buildRenderJobStatus("pending", 0, "x").finishedAt).toBeNull();
    expect(buildRenderJobStatus("processing", 50, "x").finishedAt).toBeNull();
    const done = buildRenderJobStatus("done", 100, "ok");
    expect(typeof done.finishedAt).toBe("string");
    const failed = buildRenderJobStatus("failed", 0, "boom");
    expect(typeof failed.finishedAt).toBe("string");
  });

  it("stores the phase and message", () => {
    const status = buildRenderJobStatus("processing", 75, "almost there");
    expect(status.phase).toBe("processing");
    expect(status.message).toBe("almost there");
  });
});

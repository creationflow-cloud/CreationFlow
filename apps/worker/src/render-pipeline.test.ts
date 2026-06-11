import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { performRenderRequest } from "./jobs.js";

describe("render pipeline integration", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "render-integration-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("performRenderRequest posts to the render endpoint with auth header", async () => {
    const fetchMock = vi.fn(
      async () => new Response("", { status: 200 }),
    ) as unknown as typeof fetch;

    await performRenderRequest("http://api.local", "job-42", fetchMock, {
      apiKey: "test-key",
    });

    const call = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call).toBeDefined();
    const [url, init] = call as [string, RequestInit];
    expect(url).toBe("http://api.local/render-jobs/job-42/render");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["X-API-Key"]).toBe("test-key");
  });

  it("performRenderRequest omits the X-API-Key header when none is provided", async () => {
    const fetchMock = vi.fn(
      async () => new Response("", { status: 200 }),
    ) as unknown as typeof fetch;

    await performRenderRequest("http://api.local", "job-99", fetchMock);

    const call = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const [, init] = call as [string, RequestInit];
    expect((init.headers as Record<string, string>)["X-API-Key"]).toBeUndefined();
  });

  it("performRenderRequest treats 5xx as a transient error", async () => {
    const fetchMock = vi.fn(
      async () => new Response("service unavailable", { status: 503 }),
    ) as unknown as typeof fetch;

    await expect(performRenderRequest("http://api.local", "job-1", fetchMock)).rejects.toThrow(
      /503/,
    );
  });

  it("performRenderRequest treats 4xx as a permanent error", async () => {
    const fetchMock = vi.fn(
      async () => new Response("not found", { status: 404 }),
    ) as unknown as typeof fetch;

    await expect(performRenderRequest("http://api.local", "job-1", fetchMock)).rejects.toThrow(
      /404/,
    );
  });
});

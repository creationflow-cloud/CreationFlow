import { describe, expect, it, vi } from "vitest";

import { PermanentRenderError, performRenderRequest } from "./jobs.js";

function mockFetch(status: number, body: string): typeof fetch {
  return vi.fn(async () => new Response(body, { status })) as unknown as typeof fetch;
}

describe("performRenderRequest", () => {
  it("resolves when the API returns 2xx", async () => {
    const fetchMock = mockFetch(200, "");
    await expect(
      performRenderRequest("http://api.local", "job-1", fetchMock),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.local/render-jobs/job-1/render",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws a retryable error on 5xx", async () => {
    const fetchMock = mockFetch(503, "service unavailable");
    await expect(performRenderRequest("http://api.local", "job-1", fetchMock)).rejects.toThrow(
      /503/,
    );
  });

  it("throws a retryable error on 429", async () => {
    const fetchMock = mockFetch(429, "rate limited");
    await expect(performRenderRequest("http://api.local", "job-1", fetchMock)).rejects.toThrow(
      /429/,
    );
  });

  it("throws a PermanentRenderError on 4xx", async () => {
    const fetchMock = mockFetch(404, "not found");
    await expect(
      performRenderRequest("http://api.local", "job-1", fetchMock),
    ).rejects.toBeInstanceOf(PermanentRenderError);
  });
});

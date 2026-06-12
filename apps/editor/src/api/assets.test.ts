import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./client.js", () => ({
  getStoredApiKey: () => "test-key",
  get: vi.fn(),
  clearStoredApiKey: () => undefined,
  setStoredApiKey: () => undefined,
  pingWithApiKey: async () => true,
}));

import { clearAssetUrlCache, getAssetUrl } from "./assets.js";
import { get } from "./client.js";

const mockedGet = vi.mocked(get);

describe("getAssetUrl", () => {
  beforeEach(() => {
    clearAssetUrlCache();
    mockedGet.mockReset();
  });

  afterEach(() => {
    clearAssetUrlCache();
  });

  it("fetches a signed URL from the API and joins it with the base URL", async () => {
    const futureExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    mockedGet.mockResolvedValueOnce({
      signedUrl: "/assets/asset-1/file?expires=1234&signature=abc",
      expiresAt: futureExpiry,
    });

    const url = await getAssetUrl("asset-1");

    expect(mockedGet).toHaveBeenCalledWith("/assets/asset-1/signed-url");
    expect(url).toBe("http://localhost:3000/assets/asset-1/file?expires=1234&signature=abc");
  });

  it("returns absolute signed URLs unchanged", async () => {
    const futureExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    mockedGet.mockResolvedValueOnce({
      signedUrl: "https://cdn.example.com/assets/asset-1/file?token=xyz",
      expiresAt: futureExpiry,
    });

    const url = await getAssetUrl("asset-1");
    expect(url).toBe("https://cdn.example.com/assets/asset-1/file?token=xyz");
  });

  it("caches signed URLs and does not refetch before expiry", async () => {
    const futureExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    mockedGet.mockResolvedValue({
      signedUrl: "/assets/asset-1/file?expires=1&signature=abc",
      expiresAt: futureExpiry,
    });

    const first = await getAssetUrl("asset-1");
    const second = await getAssetUrl("asset-1");
    const third = await getAssetUrl("asset-1");

    expect(first).toBe(second);
    expect(second).toBe(third);
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it("returns an empty string when the asset id is empty", async () => {
    const url = await getAssetUrl("");
    expect(url).toBe("");
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("refetches when the cached URL is near expiry", async () => {
    const nearExpiry = new Date(Date.now() + 30 * 1000).toISOString();
    mockedGet
      .mockResolvedValueOnce({
        signedUrl: "/assets/asset-1/file?expires=1&signature=first",
        expiresAt: nearExpiry,
      })
      .mockResolvedValueOnce({
        signedUrl: "/assets/asset-1/file?expires=2&signature=second",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

    const first = await getAssetUrl("asset-1");
    const second = await getAssetUrl("asset-1");

    expect(first).toContain("signature=first");
    expect(second).toContain("signature=second");
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent requests for the same asset", async () => {
    let resolvePromise: (value: { signedUrl: string; expiresAt: string }) => void = () => undefined;
    const inflight = new Promise<{ signedUrl: string; expiresAt: string }>((resolve) => {
      resolvePromise = resolve;
    });
    mockedGet.mockReturnValueOnce(inflight);

    const promiseA = getAssetUrl("asset-1");
    const promiseB = getAssetUrl("asset-1");
    const promiseC = getAssetUrl("asset-1");

    resolvePromise({
      signedUrl: "/assets/asset-1/file?expires=1&signature=abc",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    const [a, b, c] = await Promise.all([promiseA, promiseB, promiseC]);

    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it("propagates errors from the API", async () => {
    mockedGet.mockRejectedValueOnce(new Error("boom"));

    await expect(getAssetUrl("asset-1")).rejects.toThrow("boom");
  });
});

describe("clearAssetUrlCache", () => {
  beforeEach(() => {
    clearAssetUrlCache();
    mockedGet.mockReset();
  });

  it("clears a single asset when given an id", async () => {
    const futureExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    mockedGet.mockResolvedValue({
      signedUrl: "/assets/asset-1/file?expires=1&signature=abc",
      expiresAt: futureExpiry,
    });

    await getAssetUrl("asset-1");
    clearAssetUrlCache("asset-1");

    await getAssetUrl("asset-1");
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it("clears all cached assets when called without an id", async () => {
    const futureExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    mockedGet.mockResolvedValue({
      signedUrl: "/assets/asset-1/file?expires=1&signature=abc",
      expiresAt: futureExpiry,
    });

    await getAssetUrl("asset-1");
    clearAssetUrlCache();

    await getAssetUrl("asset-1");
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });
});

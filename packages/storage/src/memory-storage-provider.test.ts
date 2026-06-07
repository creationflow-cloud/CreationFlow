import { describe, expect, it } from "vitest";

import { MemoryStorageProvider } from "./memory-storage-provider.js";

describe("MemoryStorageProvider", () => {
  it("stores and retrieves bytes", async () => {
    const storage = new MemoryStorageProvider();
    const body = new Uint8Array([1, 2, 3, 4]);

    await storage.putObject({ bucket: "assets", key: "a.bin", body });

    const result = await storage.getObject({ bucket: "assets", key: "a.bin" });
    expect(result.body).toEqual(body);
    expect(result.key).toBe("a.bin");
  });

  it("stores strings by encoding them as utf-8", async () => {
    const storage = new MemoryStorageProvider();
    await storage.putObject({ bucket: "docs", key: "greeting", body: "héllo" });
    const result = await storage.getObject({ bucket: "docs", key: "greeting" });
    expect(new TextDecoder().decode(result.body)).toBe("héllo");
  });

  it("throws a not-found error for missing keys", async () => {
    const storage = new MemoryStorageProvider();
    await expect(storage.getObject({ bucket: "x", key: "nope" })).rejects.toThrow(/not found/);
  });

  it("removes objects on delete", async () => {
    const storage = new MemoryStorageProvider();
    await storage.putObject({ bucket: "a", key: "k", body: new Uint8Array([9]) });
    await storage.deleteObject({ bucket: "a", key: "k" });
    await expect(storage.getObject({ bucket: "a", key: "k" })).rejects.toThrow();
  });

  it("returns a deterministic public url", async () => {
    const storage = new MemoryStorageProvider();
    const url = await storage.getPublicUrl({ bucket: "public", key: "logo.png" });
    expect(url).toBe("memory://public/logo.png");
  });
});

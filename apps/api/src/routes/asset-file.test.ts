import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { MemoryStorageProvider } from "@creationflow/storage";

import { registerAssetFileRoutes } from "./asset-file.js";

describe("asset file routes", () => {
  it("downloads a rendered PDF asset with application/pdf content type", async () => {
    const server = Fastify({ logger: false });
    const storage = new MemoryStorageProvider();

    await storage.putObject({
      bucket: "assets/workspace-1",
      key: "pdf-key",
      body: Buffer.from("%PDF-test"),
      contentType: "application/pdf",
    });

    server.decorate("storage", storage);
    server.decorate("db", {
      asset: {
        findUnique: async () => ({
          id: "asset-1",
          workspaceId: "workspace-1",
          type: "PDF",
          name: "rendered.pdf",
          source: "pdf-key",
          mimeType: "application/pdf",
          width: null,
          height: null,
          sizeBytes: 9n,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        }),
      },
    });

    await registerAssetFileRoutes(server);

    const response = await server.inject({
      method: "GET",
      url: "/assets/asset-1/file",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("application/pdf");
    expect(response.headers["content-disposition"]).toBe('attachment; filename="rendered.pdf"');
    expect(response.rawPayload.subarray(0, 4).toString("latin1")).toBe("%PDF");

    await server.close();
  });

  it("sets no-cache headers for PDF assets", async () => {
    const server = Fastify({ logger: false });
    const storage = new MemoryStorageProvider();

    await storage.putObject({
      bucket: "assets/workspace-1",
      key: "pdf-key",
      body: Buffer.from("%PDF-test"),
      contentType: "application/pdf",
    });

    server.decorate("storage", storage);
    server.decorate("db", {
      asset: {
        findUnique: async () => ({
          id: "asset-1",
          workspaceId: "workspace-1",
          type: "PDF",
          name: "rendered.pdf",
          source: "pdf-key",
          mimeType: "application/pdf",
          width: null,
          height: null,
          sizeBytes: 9n,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        }),
      },
    });

    await registerAssetFileRoutes(server);

    const response = await server.inject({
      method: "GET",
      url: "/assets/asset-1/file",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-cache, no-store, must-revalidate");
    expect(response.headers["pragma"]).toBe("no-cache");
    expect(response.headers["expires"]).toBe("0");

    await server.close();
  });

  it("sets cacheable headers for non-PDF assets", async () => {
    const server = Fastify({ logger: false });
    const storage = new MemoryStorageProvider();

    await storage.putObject({
      bucket: "assets/workspace-1",
      key: "image-key",
      body: Buffer.from("image-data"),
      contentType: "image/png",
    });

    server.decorate("storage", storage);
    server.decorate("db", {
      asset: {
        findUnique: async () => ({
          id: "asset-1",
          workspaceId: "workspace-1",
          type: "IMAGE",
          name: "image.png",
          source: "image-key",
          mimeType: "image/png",
          width: 100,
          height: 100,
          sizeBytes: 10n,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        }),
      },
    });

    await registerAssetFileRoutes(server);

    const response = await server.inject({
      method: "GET",
      url: "/assets/asset-1/file",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("public, max-age=31536000");

    await server.close();
  });
});

import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { MemoryStorageProvider } from "@creationflow/storage";

import { generateAssetSignedUrl } from "../services/signed-urls.js";
import { registerAssetFileRoutes } from "./asset-file.js";

const SIGNING_SECRET = "test-signing-secret-must-be-long-enough";

interface AssetMock {
  readonly id: string;
  readonly workspaceId: string;
  readonly type: string;
  readonly name: string;
  readonly source: string;
  readonly mimeType: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly sizeBytes: bigint;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

function buildServer(asset: AssetMock) {
  const server = Fastify({ logger: false });
  const storage = new MemoryStorageProvider();

  server.decorate("storage", storage);
  server.decorate("config", {
    assetSigningSecret: SIGNING_SECRET,
  });
  server.decorate("db", {
    asset: {
      findUnique: async () => asset,
    },
  });
  server.decorate("auth", {
    requireAuth: async () => {
      throw new Error("auth should not be required when using signed URLs");
    },
    requireRole: () => async () => {
      throw new Error("role should not be required when using signed URLs");
    },
    enforceWorkspaceScope: () => {
      throw new Error("scope should not be enforced when using signed URLs");
    },
  });

  return { server, storage };
}

async function putAssetFile(
  storage: MemoryStorageProvider,
  workspaceId: string,
  key: string,
  body: string,
  contentType: string,
): Promise<void> {
  await storage.putObject({
    bucket: `assets/${workspaceId}`,
    key,
    body: Buffer.from(body),
    contentType,
  });
}

describe("asset file routes (signed URL)", () => {
  it("downloads a rendered PDF asset with application/pdf content type", async () => {
    const asset: AssetMock = {
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
    };
    const { server, storage } = buildServer(asset);
    await putAssetFile(storage, asset.workspaceId, asset.source, "%PDF-test", "application/pdf");
    await registerAssetFileRoutes(server);

    const { signedUrl } = generateAssetSignedUrl(asset.id, asset.workspaceId, SIGNING_SECRET);
    const response = await server.inject({
      method: "GET",
      url: signedUrl,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("application/pdf");
    expect(response.headers["content-disposition"]).toBe('attachment; filename="rendered.pdf"');
    expect(response.rawPayload.subarray(0, 4).toString("latin1")).toBe("%PDF");

    await server.close();
  });

  it("sets no-cache headers for PDF assets", async () => {
    const asset: AssetMock = {
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
    };
    const { server, storage } = buildServer(asset);
    await putAssetFile(storage, asset.workspaceId, asset.source, "%PDF-test", "application/pdf");
    await registerAssetFileRoutes(server);

    const { signedUrl } = generateAssetSignedUrl(asset.id, asset.workspaceId, SIGNING_SECRET);
    const response = await server.inject({
      method: "GET",
      url: signedUrl,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-cache, no-store, must-revalidate");
    expect(response.headers["pragma"]).toBe("no-cache");
    expect(response.headers["expires"]).toBe("0");

    await server.close();
  });

  it("sets cacheable headers for non-PDF assets when no signed URL is used", async () => {
    const asset: AssetMock = {
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
    };
    const { server, storage } = buildServer(asset);
    await putAssetFile(storage, asset.workspaceId, asset.source, "image-data", "image/png");
    await registerAssetFileRoutes(server);

    const response = await server.inject({
      method: "GET",
      url: "/assets/asset-1/file",
    });

    expect(response.statusCode).toBe(500);

    await server.close();
  });

  it("rejects a signed URL with a bad signature", async () => {
    const asset: AssetMock = {
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
    };
    const { server, storage } = buildServer(asset);
    await putAssetFile(storage, asset.workspaceId, asset.source, "image-data", "image/png");
    await registerAssetFileRoutes(server);

    const expires = Math.floor(Date.now() / 1000) + 600;
    const response = await server.inject({
      method: "GET",
      url: `/assets/asset-1/file?expires=${expires}&signature=deadbeef`,
    });

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.body)).toEqual({
      status: "error",
      message: "Invalid or expired signed URL.",
    });

    await server.close();
  });
});

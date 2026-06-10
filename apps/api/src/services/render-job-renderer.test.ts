import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify from "fastify";
import { FileSystemStorageProvider, MemoryStorageProvider } from "@creationflow/storage";
import type { PrismaClient } from "@creationflow/database";

import { registerAssetFileRoutes } from "../routes/asset-file.js";
import { renderRenderJobToPdf } from "./render-job-renderer.js";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);
const TEST_FONT_PATH = "/usr/share/fonts/open-sans/OpenSans-Regular.ttf";

function createSampleDocument(includeImage = false, includeFont = false) {
  return {
    id: "doc-1",
    version: "0.0.0",
    metadata: {
      workspaceId: "workspace-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    pages: [
      {
        id: "page-1",
        name: "Page 1",
        width: 300,
        height: 200,
        unit: "pt",
        surfaces: [
          {
            id: "surface-1",
            name: "Front",
            width: 300,
            height: 200,
            unit: "pt",
            elements: [
              {
                id: "shape-1",
                type: "shape",
                name: "Box",
                x: 20,
                y: 20,
                width: 120,
                height: 60,
                rotation: 0,
                opacity: 1,
                visible: true,
                locked: false,
                zIndex: 0,
                shapeType: "rect",
                fill: "#eef1f6",
                stroke: "#243b68",
                strokeWidth: 2,
              },
              {
                id: "text-1",
                type: "text",
                name: "Text",
                x: 30,
                y: 40,
                width: 100,
                height: 30,
                rotation: 0,
                opacity: 1,
                visible: true,
                locked: false,
                zIndex: 1,
                text: "Render me",
                fontFamily: includeFont ? "OpenSans-Regular" : "Helvetica",
                fontSize: 12,
                color: "#1d2738",
                align: "left",
              },
              ...(includeImage
                ? [
                    {
                      id: "image-1",
                      type: "image",
                      name: "Image",
                      x: 80,
                      y: 80,
                      width: 40,
                      height: 40,
                      rotation: 0,
                      opacity: 1,
                      visible: true,
                      locked: false,
                      zIndex: 2,
                      assetId: "input-image-asset",
                      fit: "fill",
                    },
                  ]
                : []),
            ],
          },
        ],
      },
    ],
    variables: [],
    assets: includeFont
      ? [
          {
            id: "font-asset",
            type: "font",
            name: "OpenSans-Regular.ttf",
            source: "font-key",
            mimeType: "font/ttf",
          },
        ]
      : [],
    rules: [],
  };
}

function createFakeDb(document: Record<string, unknown>) {
  const state = {
    job: {
      id: "job-1",
      workspaceId: "workspace-1",
      configurationId: "config-1",
      status: "PENDING",
      output: null,
      errorMessage: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    configuration: {
      id: "config-1",
      workspaceId: "workspace-1",
      productId: null,
      templateId: null,
      document,
      status: "DRAFT",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    assets: [] as Array<{
      id: string;
      workspaceId: string;
      type: string;
      name: string;
      source: string;
      mimeType: string | null;
      width: number | null;
      height: number | null;
      sizeBytes: bigint | null;
      createdAt: Date;
      updatedAt: Date;
    }>,
    inputAsset: {
      id: "input-image-asset",
      workspaceId: "workspace-1",
      type: "IMAGE",
      name: "input.png",
      source: "input-image-key",
      mimeType: "image/png",
      width: null,
      height: null,
      sizeBytes: BigInt(TINY_PNG.byteLength),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  };

  const db = {
    renderJob: {
      findUnique: async () => state.job,
      update: async ({ data }: { data: Partial<typeof state.job> }) => {
        state.job = {
          ...state.job,
          ...data,
          updatedAt: new Date("2026-01-01T00:00:01.000Z"),
        };

        return state.job;
      },
    },
    configuration: {
      findUnique: async () => state.configuration,
    },
    asset: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === state.inputAsset.id
          ? state.inputAsset
          : (state.assets.find((asset) => asset.id === where.id) ?? null),
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const asset = {
          id: "asset-1",
          workspaceId: data.workspaceId as string,
          type: data.type as string,
          name: data.name as string,
          source: data.source as string,
          mimeType: (data.mimeType as string | undefined) ?? null,
          width: null,
          height: null,
          sizeBytes: data.sizeBytes as bigint | null,
          createdAt: new Date("2026-01-01T00:00:02.000Z"),
          updatedAt: new Date("2026-01-01T00:00:02.000Z"),
        };

        state.assets.push(asset);

        return asset;
      },
    },
  };

  return { db: db as unknown as PrismaClient, state };
}

describe("renderRenderJobToPdf", () => {
  it("renders a configuration into a PDF asset and completes the render job", async () => {
    const { db, state } = createFakeDb(createSampleDocument());
    const storage = new MemoryStorageProvider();

    const result = await renderRenderJobToPdf(db, storage, "job-1");

    expect(result.status).toBe("done");
    expect(result.output?.assetId).toBe("asset-1");
    expect(result.output?.downloadUrl).toBe("/assets/asset-1/file");
    expect(state.assets).toHaveLength(1);
    expect(state.assets[0].type).toBe("PDF");
    expect(state.assets[0].mimeType).toBe("application/pdf");

    const stored = await storage.getObject({
      bucket: "assets/workspace-1",
      key: state.assets[0].source,
    });

    expect(Buffer.from(stored.body).subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  it("renders, stores and downloads a generated PDF asset", async () => {
    const { db, state } = createFakeDb(createSampleDocument());
    const storage = new MemoryStorageProvider();
    const server = Fastify({ logger: false });

    server.decorate("storage", storage);
    server.decorate("db", db);
    await registerAssetFileRoutes(server);

    try {
      const result = await renderRenderJobToPdf(db, storage, "job-1");

      expect(result.status).toBe("done");
      expect(result.output?.downloadUrl).toBe("/assets/asset-1/file");
      expect(state.assets).toHaveLength(1);

      const response = await server.inject({
        method: "GET",
        url: result.output?.downloadUrl as string,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toBe("application/pdf");
      expect(response.rawPayload.subarray(0, 4).toString("latin1")).toBe("%PDF");
    } finally {
      await server.close();
    }
  });

  it("marks the render job failed when the configuration document is invalid", async () => {
    const { db, state } = createFakeDb({ id: "invalid-doc" });
    const storage = new MemoryStorageProvider();

    const result = await renderRenderJobToPdf(db, storage, "job-1");

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toBe("Configuration document is not renderable.");
    expect(state.assets).toHaveLength(0);
  });

  it("exposes preflight warnings on the rendered render job", async () => {
    const document = createSampleDocument() as Record<string, unknown>;
    const pages = document.pages as Array<Record<string, unknown>>;
    const surface = (pages[0].surfaces as Array<Record<string, unknown>>)[0];
    surface.printArea = {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      bleed: 10,
      safeArea: { x: 0, y: 0, width: 50, height: 50 },
    };

    const { db } = createFakeDb(document);
    const storage = new MemoryStorageProvider();

    const result = await renderRenderJobToPdf(db, storage, "job-1");

    expect(result.status).toBe("done");
    expect(result.output?.warnings).toMatchObject([
      expect.objectContaining({ code: "text_outside_safe_area" }),
    ]);
  });

  it("renders a configuration containing an image asset", async () => {
    const { db, state } = createFakeDb(createSampleDocument(true));
    const storage = new MemoryStorageProvider();

    await storage.putObject({
      bucket: "assets/workspace-1",
      key: "input-image-key",
      body: TINY_PNG,
      contentType: "image/png",
    });

    const result = await renderRenderJobToPdf(db, storage, "job-1");

    expect(result.status).toBe("done");
    expect(result.output?.assetId).toBe("asset-1");
    expect(result.output?.warnings).toBeUndefined();
    expect(state.assets).toHaveLength(1);
    expect(state.assets[0].mimeType).toBe("application/pdf");
  });

  it("renders a configuration containing an image asset from file system storage", async () => {
    const uploadDir = await mkdtemp(join(tmpdir(), "creationflow-render-"));

    try {
      const { db, state } = createFakeDb(createSampleDocument(true));
      const storage = new FileSystemStorageProvider({ uploadDir, baseUrl: "http://localhost" });

      await storage.init();
      await storage.putObject({
        bucket: "assets/workspace-1",
        key: "input-image-key",
        body: TINY_PNG,
        contentType: "image/png",
      });

      const result = await renderRenderJobToPdf(db, storage, "job-1");

      expect(result.status).toBe("done");
      expect(result.output?.warnings).toBeUndefined();
      expect(state.assets).toHaveLength(1);

      const storedPdf = await storage.getObject({
        bucket: "assets/workspace-1",
        key: state.assets[0].source,
      });

      expect(Buffer.from(storedPdf.body).subarray(0, 4).toString("latin1")).toBe("%PDF");
    } finally {
      await rm(uploadDir, { recursive: true, force: true });
    }
  });

  it("completes rendering with a warning when an image file is missing from storage", async () => {
    const { db } = createFakeDb(createSampleDocument(true));
    const storage = new MemoryStorageProvider();

    const result = await renderRenderJobToPdf(db, storage, "job-1");

    expect(result.status).toBe("done");
    expect(result.output?.warnings).toMatchObject([
      {
        code: "image_resolve_failed",
        assetId: "input-image-asset",
      },
    ]);
  });

  it("renders a configuration containing a font asset from storage", async () => {
    const { db, state } = createFakeDb(createSampleDocument(false, true));
    const storage = new MemoryStorageProvider();

    await storage.putObject({
      bucket: "assets/workspace-1",
      key: "font-key",
      body: await readFile(TEST_FONT_PATH),
      contentType: "font/ttf",
    });

    const result = await renderRenderJobToPdf(db, storage, "job-1");

    expect(result.status).toBe("done");
    expect(result.output?.warnings).toBeUndefined();
    expect(state.assets).toHaveLength(1);
    expect(state.assets[0].mimeType).toBe("application/pdf");
  });
});

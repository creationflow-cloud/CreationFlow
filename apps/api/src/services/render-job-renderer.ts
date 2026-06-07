import { renderDocumentToPdf, runDocumentPreflight } from "@creationflow/pdf-engine";
import type { RenderDocumentWarning } from "@creationflow/pdf-engine";
import type { PrismaClient } from "@creationflow/database";
import type { StorageProvider } from "@creationflow/storage";
import type { CreationFlowDocument } from "@creationflow/schema";

import { createAsset } from "./assets.js";
import { getAssetById } from "./assets.js";
import { getConfigurationById } from "./configurations.js";
import { getRenderJobById, recordRenderJobAttempt, updateRenderJob } from "./render-jobs.js";
import type { RenderJobDto } from "./render-jobs.js";

export class RenderJobTransientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
  }
}

const TRANSIENT_ERROR_CODES: ReadonlySet<string> = new Set([
  "storage_unavailable",
  "asset_resolve_failed",
  "render_failed",
  "internal_error",
]);

function classifyRenderError(error: unknown): { code: string; transient: boolean } {
  if (error instanceof RenderJobTransientError) {
    return { code: error.code, transient: true };
  }

  if (error instanceof Error) {
    const code = error.name && error.name !== "Error" ? error.name : "render_failed";
    return {
      code,
      transient: error.message.toLowerCase().includes("timeout")
        || error.message.toLowerCase().includes("storage")
        || error.message.toLowerCase().includes("network"),
    };
  }

  return { code: "render_failed", transient: true };
}

export class RenderJobNotFoundError extends Error {
  constructor() {
    super("Render job not found.");
  }
}

export class RenderJobConfigurationNotFoundError extends Error {
  constructor() {
    super("Render job configuration not found.");
  }
}

function isRenderableDocument(document: unknown): document is CreationFlowDocument {
  if (document === null || typeof document !== "object") {
    return false;
  }

  const candidate = document as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.version === "string" &&
    typeof candidate.metadata === "object" &&
    candidate.metadata !== null &&
    Array.isArray(candidate.pages)
  );
}

function getPdfFilename(configurationId: string, jobId: string): string {
  return `creationflow-${configurationId}-${jobId}.pdf`;
}

export async function renderRenderJobToPdf(
  db: PrismaClient,
  storage: StorageProvider,
  jobId: string,
): Promise<RenderJobDto> {
  const job = await getRenderJobById(db, jobId);

  if (!job) {
    throw new RenderJobNotFoundError();
  }

  if (!job.configurationId) {
    const failed = await updateRenderJob(db, job.id, {
      status: "failed",
      errorMessage: "Render job has no configurationId.",
    });

    return failed ?? job;
  }

  await updateRenderJob(db, job.id, {
    status: "processing",
    errorMessage: null,
  });

  try {
    const configuration = await getConfigurationById(db, job.configurationId);

    if (!configuration) {
      throw new RenderJobConfigurationNotFoundError();
    }

    if (configuration.workspaceId !== job.workspaceId) {
      throw new Error("Render job and configuration belong to different workspaces.");
    }

    if (!isRenderableDocument(configuration.document)) {
      throw new Error("Configuration document is not renderable.");
    }

    const renderDocument = configuration.document;

    if (process.env.CREATIONFLOW_PDF_DEBUG_VERBOSE === "true") {
      const doc = renderDocument as Record<string, unknown>;
      const pages = (doc.pages as Record<string, unknown>[]) ?? [];
      console.log("=== RENDER DOCUMENT STRUCTURE DEBUG ===");
      console.log(`Total pages: ${pages.length}`);
      for (const page of pages) {
        const pageId = page.id as string;
        const pageName = page.name as string;
        const surfaces = (page.surfaces as Record<string, unknown>[]) ?? [];
        console.log(`  Page: ${pageName} (${pageId}) - ${surfaces.length} surfaces`);
        for (const surface of surfaces) {
          const surfaceId = surface.id as string;
          const surfaceName = surface.name as string;
          const shape = surface.shape as string | undefined;
          const role = surface.role as string | undefined;
          const clipContent = surface.clipContent as boolean | undefined;
          const pathData = surface.pathData as string | undefined;
          const elements = (surface.elements as Record<string, unknown>[]) ?? [];
          console.log(`    Surface: ${surfaceName} (${surfaceId})`);
          console.log(`      shape: ${shape ?? "rect"}`);
          console.log(`      role: ${role ?? "default"}`);
          console.log(`      clipContent: ${clipContent ?? false}`);
          console.log(`      pathData: ${pathData ? "present (" + pathData.length + " chars)" : "absent"}`);
          console.log(`      elements: ${elements.length}`);
          for (const el of elements) {
            const elType = el.type as string;
            const elName = el.name as string | undefined;
            const elX = el.x as number;
            const elY = el.y as number;
            console.log(`        - ${elType} "${elName ?? "unnamed"}" at (${elX},${elY})`);
          }
        }
      }
      console.log("=== END RENDER DOCUMENT STRUCTURE DEBUG ===");
    }

    const renderWarnings: RenderDocumentWarning[] = [];

    runDocumentPreflight({ document: renderDocument }, (warning) => {
      renderWarnings.push(warning);
    });
    const debugSurfaces = process.env.CREATIONFLOW_PDF_DEBUG_SURFACES === "true";
    const pdf = await renderDocumentToPdf(renderDocument, {
      resolveAsset: async (assetId) => {
        const asset = await getAssetById(db, assetId);

        if (!asset || asset.type !== "image") {
          return null;
        }

        const object = await storage.getObject({
          bucket: `assets/${asset.workspaceId}`,
          key: asset.source,
        });

        return {
          data: object.body,
          mimeType: asset.mimeType,
        };
      },
      resolveFont: async (fontFamily) => {
        const normalizedFontFamily = fontFamily.toLowerCase();
        const documentFont = renderDocument.assets.find((asset) => {
          if (asset.type !== "font") {
            return false;
          }

          const normalizedName = asset.name.toLowerCase();
          const normalizedNameWithoutExtension = normalizedName.replace(/\.[^.]+$/, "");

          return (
            asset.id === fontFamily ||
            normalizedName === normalizedFontFamily ||
            normalizedNameWithoutExtension === normalizedFontFamily
          );
        });

        if (!documentFont) {
          return null;
        }

        const object = await storage.getObject({
          bucket: `assets/${renderDocument.metadata.workspaceId}`,
          key: documentFont.source,
        });

        return {
          data: object.body,
          mimeType: documentFont.mimeType,
        };
      },
      onWarning: (warning) => {
        renderWarnings.push(warning);
      },
      debugSurfaces,
    });
    const storageKey = crypto.randomUUID();
    const filename = getPdfFilename(configuration.id, job.id);
    const bucket = `assets/${job.workspaceId}`;

    await storage.putObject({
      bucket,
      key: storageKey,
      body: pdf,
      contentType: "application/pdf",
    });

    const asset = await createAsset(db, {
      workspaceId: job.workspaceId,
      type: "pdf",
      name: filename,
      source: storageKey,
      mimeType: "application/pdf",
      sizeBytes: pdf.byteLength.toString(),
    });

    const completed = await updateRenderJob(db, job.id, {
      status: "done",
      output: {
        assetId: asset.id,
        downloadUrl: `/assets/${asset.id}/file`,
        filename,
        mimeType: "application/pdf",
        sizeBytes: pdf.byteLength.toString(),
        ...(renderWarnings.length > 0 && { warnings: renderWarnings }),
      },
      errorMessage: null,
    });

    if (!completed) {
      throw new RenderJobNotFoundError();
    }

    return completed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to render PDF.";
    const classification = classifyRenderError(error);

    const recorded = await recordRenderJobAttempt(db, job.id, {
      errorCode: classification.code,
      transient: classification.transient,
      errorMessage: message,
    });

    const failed = await updateRenderJob(db, job.id, {
      status: "failed",
      errorMessage: message,
    });

    if (!failed) {
      throw new RenderJobNotFoundError();
    }

    if (recorded && classification.transient) {
      throw new RenderJobTransientError(message, classification.code);
    }

    return failed;
  }
}

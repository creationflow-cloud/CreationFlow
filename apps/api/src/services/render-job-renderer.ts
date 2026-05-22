import { renderDocumentToPdf } from "@creationflow/pdf-engine";
import type { PrismaClient } from "@creationflow/database";
import type { StorageProvider } from "@creationflow/storage";
import type { CreationFlowDocument } from "@creationflow/schema";

import { createAsset } from "./assets.js";
import { getConfigurationById } from "./configurations.js";
import { getRenderJobById, updateRenderJob } from "./render-jobs.js";
import type { RenderJobDto } from "./render-jobs.js";

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

    const pdf = await renderDocumentToPdf(configuration.document);
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
      },
      errorMessage: null,
    });

    if (!completed) {
      throw new RenderJobNotFoundError();
    }

    return completed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to render PDF.";
    const failed = await updateRenderJob(db, job.id, {
      status: "failed",
      errorMessage: message,
    });

    if (!failed) {
      throw new RenderJobNotFoundError();
    }

    return failed;
  }
}

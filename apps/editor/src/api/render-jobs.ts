import { post } from "./client.js";

const BASE_URL = import.meta.env.VITE_CREATIONFLOW_API_URL ?? "http://localhost:3000";

export type RenderJobStatus = "pending" | "processing" | "done" | "failed";

export interface RenderJobDto {
  readonly id: string;
  readonly workspaceId: string;
  readonly configurationId?: string;
  readonly status: RenderJobStatus;
  readonly output?: Record<string, unknown>;
  readonly errorMessage?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateRenderJobInput {
  readonly workspaceId: string;
  readonly configurationId: string;
}

export interface RenderJobPdfOutput {
  readonly assetId: string;
  readonly downloadUrl: string;
  readonly filename: string;
  readonly mimeType: "application/pdf";
  readonly sizeBytes?: string;
}

export async function createRenderJob(input: CreateRenderJobInput): Promise<RenderJobDto> {
  return post<RenderJobDto>("/render-jobs", input);
}

export async function renderRenderJob(id: string): Promise<RenderJobDto> {
  return post<RenderJobDto>(`/render-jobs/${id}/render`, {});
}

export function getRenderJobPdfOutput(job: RenderJobDto | null): RenderJobPdfOutput | null {
  const output = job?.output;

  if (!output) {
    return null;
  }

  const assetId = output.assetId;
  const downloadUrl = output.downloadUrl;
  const filename = output.filename;
  const mimeType = output.mimeType;
  const sizeBytes = output.sizeBytes;

  if (
    typeof assetId !== "string" ||
    typeof downloadUrl !== "string" ||
    typeof filename !== "string" ||
    mimeType !== "application/pdf"
  ) {
    return null;
  }

  return {
    assetId,
    downloadUrl: downloadUrl.startsWith("http")
      ? `${downloadUrl}${downloadUrl.includes("?") ? "&" : "?"}v=${assetId}`
      : `${BASE_URL}${downloadUrl}?v=${assetId}`,
    filename,
    mimeType,
    sizeBytes: typeof sizeBytes === "string" ? sizeBytes : undefined,
  };
}

export type RenderJobPhase = "pending" | "processing" | "done" | "failed";

export interface RenderJobStatus {
  readonly phase: RenderJobPhase;
  readonly progress: number;
  readonly message: string;
  readonly finishedAt: string | null;
}

export function buildRenderJobStatus(
  phase: RenderJobPhase,
  progress: number,
  message: string,
): RenderJobStatus {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  const finishedAt = phase === "done" || phase === "failed" ? new Date().toISOString() : null;
  return {
    phase,
    progress: clamped,
    message,
    finishedAt,
  };
}

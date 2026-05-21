export type JobType = "render" | "export" | "cleanup" | "order-sync";

export interface WorkerJobPlaceholder {
  readonly type: JobType;
  readonly status: "placeholder";
}

export function createWorkerJobPlaceholder(type: JobType = "render"): WorkerJobPlaceholder {
  return {
    type,
    status: "placeholder",
  };
}

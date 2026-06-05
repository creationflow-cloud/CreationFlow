import { createRenderWorker } from "./jobs.js";

const worker = createRenderWorker();

worker.on("ready", () => {
  console.log("CreationFlow Worker started");
});

worker.on("completed", (job) => {
  console.log(`Render job ${job.data.jobId} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Render job ${job?.data.jobId ?? "unknown"} failed`, error);
});

async function shutdown(): Promise<void> {
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

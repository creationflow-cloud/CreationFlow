# @creationflow/worker

Background worker for CreationFlow.

## Current Status

This package consumes render jobs from the Redis-backed `creationflow-render-jobs` queue, calls the API to perform the render, and retries transient failures with exponential backoff.

## Configuration

- `REDIS_URL`: Redis connection string. Defaults to `redis://localhost:6379`.
- `API_URL`: API base URL used to trigger rendering. Defaults to `http://localhost:3000`.
- `WORKER_CONCURRENCY`: Number of render jobs processed concurrently. Defaults to `2`.
- `RENDER_JOB_MAX_ATTEMPTS`: Maximum number of attempts per job (overrides the API default). Defaults to `3`.
- `RENDER_JOB_BACKOFF_MS`: Base delay for the exponential backoff between attempts. Defaults to `2000` ms.

## Flow

1. The API creates a `RenderJob` and enqueues its ID in Redis (with `attempts` and exponential `backoff`).
2. The worker consumes the queue job.
3. The worker calls `POST /render-jobs/:id/render` on the API.
4. The API performs preflight, renders the PDF and stores the generated PDF asset.
5. If the API call returns a retryable status (5xx, 408, 429) the worker throws; BullMQ will re-enqueue the job with exponential backoff.
6. If the API call returns a 4xx (other than 408/429) the worker throws a `PermanentRenderError` and BullMQ will not retry.
7. Each failed attempt bumps the job's `attempts` counter on the render job, and the last error code / message is persisted so operators can see what went wrong.

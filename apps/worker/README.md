# @creationflow/worker

Background worker for CreationFlow.

## Current Status

This package consumes render jobs from the Redis-backed `creationflow-render-jobs` queue.

## Configuration

- `REDIS_URL`: Redis connection string. Defaults to `redis://localhost:6379`.
- `API_URL`: API base URL used to trigger rendering. Defaults to `http://localhost:3000`.
- `WORKER_CONCURRENCY`: Number of render jobs processed concurrently. Defaults to `2`.

## Flow

1. The API creates a `RenderJob` and enqueues its ID in Redis.
2. The worker consumes the queue job.
3. The worker calls `POST /render-jobs/:id/render` on the API.
4. The API performs PDF rendering and stores the generated PDF asset.

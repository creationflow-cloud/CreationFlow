# @creationflow/renderer

Rendering service for CreationFlow.

## Responsibility split

The render pipeline is split across three apps / packages:

| Component                                  | Responsibility                                                                                                                                                              |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@creationflow/api` (`apps/api`)           | Owns the data model, exposes HTTP routes, persists render jobs and their output, and calls the renderer. It also runs the preflight validation before kicking off a render. |
| `@creationflow/worker` (`apps/worker`)     | Consumes render jobs from the Redis-backed `bullmq` queue, signals progress to the API (`pending` → `processing` → `done` / `failed`) and triggers the actual render.       |
| `@creationflow/renderer` (`apps/renderer`) | Pure rendering library that wraps `@creationflow/pdf-engine`. The API imports it directly; the worker does not import it (it triggers renders via the API's HTTP endpoint). |

In short: the API orchestrates, the worker schedules, and the renderer renders.

## Exports

- `renderDocument(document, options?)` — runs preflight + `renderDocumentToPdf` and returns `{ status, pdf, warnings }`.
- `createRenderJobPlaceholder(document?)` — kept for backwards compatibility with the previous placeholder; returns a `{ status: "placeholder" }` object.

The placeholder entry point script (`tsx src/index.ts` / `node dist/index.js`) just prints a ready message. Use `renderDocument` from your own code.

## Run

```sh
# Run as a CLI (placeholder)
npx pnpm --filter @creationflow/renderer dev
# or build & start
npx pnpm --filter @creationflow/renderer build
npx pnpm --filter @creationflow/renderer start
```

## Status

- Renderer is now a real library used by the API for document rendering.
- Worker still drives the queue and asks the API to render; renderer is reachable through the API.

import type { FastifyInstance } from "fastify";

import type { ApiConfig } from "../config.js";
import { registerMetrics, metricsRoute } from "../plugins/metrics.js";
import { refreshQueueSizeMetrics } from "../services/render-job-queue.js";
import { registerAssetFileRoutes } from "./asset-file.js";
import { registerAssetRoutes } from "./assets.js";
import { registerConfigurationRoutes } from "./configurations.js";
import { registerHealthDbRoute } from "./health-db.js";
import { registerHealthRedisRoute } from "./health-redis.js";
import { registerHealthRoute } from "./health.js";
import { registerProductRoutes } from "./products.js";
import { registerProductTemplateRoutes } from "./product-templates.js";
import { registerRenderJobRoutes } from "./render-jobs.js";
import { registerVersionRoute } from "./version.js";
import { registerWorkspaceRoutes } from "./workspaces.js";

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export async function registerRoutes(server: FastifyInstance, config: ApiConfig): Promise<void> {
  await registerHealthRoute(server);
  await registerHealthDbRoute(server);
  await registerHealthRedisRoute(server);
  await registerVersionRoute(server, config.version);

  await registerMetrics(server);
  server.get("/metrics", async (request, reply) => {
    try {
      await refreshQueueSizeMetrics(server);
    } catch (error) {
      server.log.warn({ err: error }, "queue size refresh failed");
    }
    return metricsRoute.call(server, request, reply);
  });

  await server.register(async (protectedScope) => {
    protectedScope.addHook("preHandler", server.auth.requireAuth);
    protectedScope.addHook("preHandler", async (request, reply) => {
      const method = request.method.toUpperCase();
      if (READ_METHODS.has(method)) {
        return;
      }
      const requireEditor = server.auth.requireRole("editor");
      await requireEditor(request, reply);
    });

    await registerWorkspaceRoutes(protectedScope);
    await registerConfigurationRoutes(protectedScope);
    await registerProductRoutes(protectedScope);
    await registerProductTemplateRoutes(protectedScope);
    await registerRenderJobRoutes(protectedScope);
    await registerAssetRoutes(protectedScope);
  });

  await registerAssetFileRoutes(server);

  // Future API groups:
  // - /orders
}

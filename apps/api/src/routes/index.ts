import type { FastifyInstance } from "fastify";

import type { ApiConfig } from "../config.js";
import { registerAssetFileRoutes } from "./asset-file.js";
import { registerAssetRoutes } from "./assets.js";
import { registerConfigurationRoutes } from "./configurations.js";
import { registerHealthDbRoute } from "./health-db.js";
import { registerHealthRoute } from "./health.js";
import { registerProductRoutes } from "./products.js";
import { registerProductTemplateRoutes } from "./product-templates.js";
import { registerRenderJobRoutes } from "./render-jobs.js";
import { registerVersionRoute } from "./version.js";
import { registerWorkspaceRoutes } from "./workspaces.js";

export async function registerRoutes(server: FastifyInstance, config: ApiConfig): Promise<void> {
  await registerHealthRoute(server);
  await registerHealthDbRoute(server);
  await registerVersionRoute(server, config.version);

  await server.register(async (protectedScope) => {
    protectedScope.addHook("preHandler", server.auth.requireAuth);

    await registerWorkspaceRoutes(protectedScope);
    await registerConfigurationRoutes(protectedScope);
    await registerProductRoutes(protectedScope);
    await registerProductTemplateRoutes(protectedScope);
    await registerRenderJobRoutes(protectedScope);
    await registerAssetRoutes(protectedScope);
    await registerAssetFileRoutes(protectedScope);
  });

  // Future API groups:
  // - /orders
}

import type { FastifyInstance } from "fastify";

import type { ApiConfig } from "../config.js";
import { registerHealthDbRoute } from "./health-db.js";
import { registerHealthRoute } from "./health.js";
import { registerVersionRoute } from "./version.js";

export async function registerRoutes(server: FastifyInstance, config: ApiConfig): Promise<void> {
  await registerHealthRoute(server);
  await registerHealthDbRoute(server);
  await registerVersionRoute(server, config.version);

  // Future API groups:
  // - /workspaces
  // - /products
  // - /templates
  // - /configurations
  // - /render-jobs
  // - /orders
}

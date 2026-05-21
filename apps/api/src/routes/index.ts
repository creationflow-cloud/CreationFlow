import type { FastifyInstance } from "fastify";

import type { ApiConfig } from "../config.js";
import { registerHealthRoute } from "./health.js";
import { registerVersionRoute } from "./version.js";

export async function registerRoutes(server: FastifyInstance, config: ApiConfig): Promise<void> {
  await registerHealthRoute(server);
  await registerVersionRoute(server, config.version);

  // Future API groups:
  // - /tenants
  // - /products
  // - /templates
  // - /configurations
  // - /render-jobs
  // - /orders
}

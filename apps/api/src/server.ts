import Fastify from "fastify";

import type { ApiConfig } from "./config.js";
import { registerDatabase } from "./plugins/database.js";
import { registerOpenApi } from "./plugins/openapi.js";
import { registerRoutes } from "./routes/index.js";

export async function createServer(config: ApiConfig) {
  const server = Fastify({
    logger: true,
  });

  await registerOpenApi(server, config);
  await registerDatabase(server, config);
  await registerRoutes(server, config);

  return server;
}

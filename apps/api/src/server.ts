import Fastify from "fastify";

import type { ApiConfig } from "./config.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerVersionRoute } from "./routes/version.js";

export async function createServer(config: ApiConfig) {
  const server = Fastify({
    logger: true,
  });

  await registerHealthRoute(server);
  await registerVersionRoute(server, config.version);

  return server;
}

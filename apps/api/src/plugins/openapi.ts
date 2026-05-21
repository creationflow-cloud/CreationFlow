import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";

import type { ApiConfig } from "../config.js";

export async function registerOpenApi(server: FastifyInstance, config: ApiConfig): Promise<void> {
  await server.register(swagger, {
    openapi: {
      info: {
        title: "CreationFlow API",
        version: config.version,
      },
    },
  });

  await server.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
  });

  server.get("/openapi.json", { schema: { hide: true } }, async () => server.swagger());
}

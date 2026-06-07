import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { registerAuth, type ApiAuthConfig } from "./auth.js";

interface TestServer {
  readonly server: FastifyInstance;
  readonly auth: ApiAuthConfig;
}

async function buildTestServer(options: { apiKey?: string; authDisabled?: boolean }): Promise<TestServer> {
  const auth: ApiAuthConfig = {
    apiKey: options.apiKey,
    authDisabled: options.authDisabled ?? false,
  };

  const server = Fastify({ logger: false });
  await registerAuth(server, auth);

  server.get(
    "/protected",
    { preHandler: server.auth.requireAuth },
    async () => ({ status: "ok" }),
  );

  server.get(
    "/health",
    async () => ({ status: "ok" }),
  );

  return { server, auth };
}

let current: TestServer | undefined;

afterEach(async () => {
  if (current) {
    await current.server.close();
    current = undefined;
  }
});

describe("auth plugin", () => {
  it("rejects requests without credentials when API key is configured", async () => {
    current = await buildTestServer({ apiKey: "super-secret-key" });

    const response = await current.server.inject({ method: "GET", url: "/protected" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ status: "error" });
  });

  it("rejects requests with an invalid X-API-Key header", async () => {
    current = await buildTestServer({ apiKey: "super-secret-key" });

    const response = await current.server.inject({
      method: "GET",
      url: "/protected",
      headers: { "x-api-key": "wrong-key" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("accepts requests with a matching X-API-Key header", async () => {
    current = await buildTestServer({ apiKey: "super-secret-key" });

    const response = await current.server.inject({
      method: "GET",
      url: "/protected",
      headers: { "x-api-key": "super-secret-key" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("accepts requests with a matching Bearer token", async () => {
    current = await buildTestServer({ apiKey: "super-secret-key" });

    const response = await current.server.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: "Bearer super-secret-key" },
    });

    expect(response.statusCode).toBe(200);
  });

  it("rejects requests with the wrong Bearer token", async () => {
    current = await buildTestServer({ apiKey: "super-secret-key" });

    const response = await current.server.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: "Bearer not-the-right-key" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns 500 when auth is required but no API key is configured", async () => {
    current = await buildTestServer({});

    const response = await current.server.inject({ method: "GET", url: "/protected" });

    expect(response.statusCode).toBe(500);
  });

  it("skips auth when CREATIONFLOW_AUTH_DISABLED is true", async () => {
    current = await buildTestServer({ authDisabled: true });

    const response = await current.server.inject({ method: "GET", url: "/protected" });

    expect(response.statusCode).toBe(200);
  });

  it("leaves unprotected routes untouched", async () => {
    current = await buildTestServer({ apiKey: "super-secret-key" });

    const response = await current.server.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
  });
});

import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { registerAuth, WorkspaceScopeError, type ApiAuthConfig } from "./auth.js";

interface TestServer {
  readonly server: FastifyInstance;
  readonly auth: ApiAuthConfig;
}

async function buildTestServer(
  options: {
    apiKey?: string;
    authDisabled?: boolean;
    allowedWorkspaces?: ReadonlySet<string> | "all";
  } = {},
): Promise<TestServer> {
  const auth: ApiAuthConfig = {
    apiKey: options.apiKey,
    authDisabled: options.authDisabled ?? false,
    allowedWorkspaces: options.allowedWorkspaces ?? new Set(),
  };

  const server = Fastify({ logger: false });
  server.setErrorHandler((error, _request, reply) => {
    if (error instanceof WorkspaceScopeError) {
      return reply.code(403).send({ status: "error", message: error.message });
    }
    if (!reply.sent) {
      return reply.code(500).send({ status: "error", message: "Internal server error." });
    }
    return reply;
  });

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

  server.get<{ Querystring: { workspaceId?: string } }>(
    "/by-query",
    async (request) => ({
      status: "ok",
      workspaceId: request.query.workspaceId,
    }),
  );

  server.post<{ Body: { workspaceId?: string } }>(
    "/by-body",
    async (request) => ({
      status: "ok",
      workspaceId: request.body.workspaceId,
    }),
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

  it("returns 403 for query workspaceId outside allowed set", async () => {
    current = await buildTestServer({
      apiKey: "key",
      allowedWorkspaces: new Set(["ws-a"]),
    });

    const response = await current.server.inject({
      method: "GET",
      url: "/by-query?workspaceId=ws-b",
      headers: { "x-api-key": "key" },
    });

    expect(response.statusCode).toBe(403);
  });

  it("allows query workspaceId in allowed set", async () => {
    current = await buildTestServer({
      apiKey: "key",
      allowedWorkspaces: new Set(["ws-a"]),
    });

    const response = await current.server.inject({
      method: "GET",
      url: "/by-query?workspaceId=ws-a",
      headers: { "x-api-key": "key" },
    });

    expect(response.statusCode).toBe(200);
  });

  it("allows all workspaces when configured as all", async () => {
    current = await buildTestServer({
      apiKey: "key",
      allowedWorkspaces: "all",
    });

    const response = await current.server.inject({
      method: "GET",
      url: "/by-query?workspaceId=ws-anywhere",
      headers: { "x-api-key": "key" },
    });

    expect(response.statusCode).toBe(200);
  });

  it("returns 403 for body workspaceId outside allowed set", async () => {
    current = await buildTestServer({
      apiKey: "key",
      allowedWorkspaces: new Set(["ws-a"]),
    });

    const response = await current.server.inject({
      method: "POST",
      url: "/by-body",
      headers: { "x-api-key": "key", "content-type": "application/json" },
      payload: JSON.stringify({ workspaceId: "ws-b" }),
    });

    expect(response.statusCode).toBe(403);
  });
});

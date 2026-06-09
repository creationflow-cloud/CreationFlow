import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    requestId: string;
  }
}

export const REQUEST_ID_HEADER = "x-request-id";

export async function registerLogging(server: FastifyInstance) {
  server.addHook("onRequest", (request: FastifyRequest, _reply, done) => {
    const incoming = request.headers[REQUEST_ID_HEADER];
    const id =
      typeof incoming === "string" && incoming.length > 0 && incoming.length <= 128
        ? incoming
        : randomUUID();
    request.requestId = id;
    request.headers[REQUEST_ID_HEADER] = id;
    done();
  });

  server.addHook("onResponse", (request, reply, done) => {
    const method = request.method;
    const url = request.url;
    const status = reply.statusCode;
    const ms = reply.elapsedTime?.toFixed(1) ?? "?";
    const rid = request.requestId ?? "-";
    server.log.info(
      { requestId: rid, method, url, status, ms: Number(ms) },
      "request completed",
    );
    done();
  });

  server.addHook("onError", (request, _reply, error, done) => {
    const rid = request.requestId ?? "-";
    server.log.error(
      {
        requestId: rid,
        method: request.method,
        url: request.url,
        err: error,
      },
      "request failed",
    );
    done();
  });

  server.addHook("onSend", (request: FastifyRequest, reply: FastifyReply, payload, done) => {
    if (reply.hasHeader(REQUEST_ID_HEADER) === false) {
      void reply.header(REQUEST_ID_HEADER, request.requestId ?? "-");
    }
    done(null, payload);
  });
}

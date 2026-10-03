import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

export const TRACE_ID_HEADER = "x-trace-id";
const traceContext = new AsyncLocalStorage<string>();

/** Accept one bounded, header-safe ID; replace missing or ambiguous values. */
export function resolveTraceId(value?: string | string[]): string {
  return typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)
    ? value
    : randomUUID();
}

export function getTraceId(): string | undefined {
  return traceContext.getStore();
}

export function requestTraceMiddleware(
  request: IncomingMessage & { id?: string },
  response: ServerResponse,
  next: () => void,
): void {
  const traceId = resolveTraceId(request.headers[TRACE_ID_HEADER]);
  request.id = traceId;
  request.headers[TRACE_ID_HEADER] = traceId;
  response.setHeader(TRACE_ID_HEADER, traceId);
  traceContext.run(traceId, next);
}

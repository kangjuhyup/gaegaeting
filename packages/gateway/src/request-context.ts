import type { NextFunction, Request, Response } from "express";
import { requestTraceMiddleware, TRACE_ID_HEADER } from "@core/util/trace";
import type { AuthenticatedRequest } from "./auth/authentication-middleware.js";
import type { GatewayContext } from "./gateway.js";

export function gatewayRequestMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  requestTraceMiddleware(req, res, () => {
    const traceId = req.headers[TRACE_ID_HEADER] as string;
    const startedAt = Date.now();
    res.once("finish", () => {
      console.log(
        JSON.stringify({
          name: "Gateway",
          traceId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          responseTime: Date.now() - startedAt,
        }),
      );
    });
    next();
  });
}

export function createGatewayContext(
  req: AuthenticatedRequest,
): GatewayContext {
  return {
    traceId: req.headers[TRACE_ID_HEADER] as string,
    authenticatedPrincipal: req.authenticatedPrincipal,
  };
}

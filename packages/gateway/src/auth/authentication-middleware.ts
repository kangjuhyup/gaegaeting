import type { NextFunction, Request, Response } from "express";
import {
  AccountSubjectNotLinkedError,
  type AccountSubjectClient,
} from "./account-subject-client.js";
import {
  AuthServiceUnavailableError,
  InactiveTokenError,
  type OpaqueTokenIntrospector,
} from "./introspection-client.js";

export interface GatewayPrincipal {
  tenantId: string;
  subject: string;
  userId: string;
  scopes: string[];
  roles?: string[];
}

export type AuthenticatedRequest = Request & {
  authenticatedPrincipal?: GatewayPrincipal;
};

export function createAuthenticationMiddleware(
  introspector: Pick<OpaqueTokenIntrospector, "introspect">,
  subjects: Pick<AccountSubjectClient, "resolve">,
) {
  return async (
    request: AuthenticatedRequest,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    delete request.headers["x-jwt-payload"];
    delete request.headers["x-gaegaeting-principal"];

    const authorization = request.headers.authorization;
    const match =
      typeof authorization === "string"
        ? /^Bearer ([^\s]+)$/.exec(authorization)
        : null;
    if (!match) {
      response.status(401).json({ error: "authentication_required" });
      return;
    }

    delete request.headers.authorization;
    try {
      const external = await introspector.introspect(match[1]);
      const mapped = await subjects.resolve({
        tenantId: external.issuer,
        subject: external.subject,
      });
      request.authenticatedPrincipal = {
        tenantId: external.tenantId,
        subject: external.subject,
        userId: mapped.userId,
        scopes: external.scopes,
        ...(external.roles === undefined ? {} : { roles: external.roles }),
      };
      next();
    } catch (error) {
      if (
        error instanceof InactiveTokenError ||
        error instanceof AccountSubjectNotLinkedError
      ) {
        response.status(401).json({ error: "authentication_required" });
        return;
      }
      const status = error instanceof AuthServiceUnavailableError ? 503 : 503;
      response
        .status(status)
        .json({ error: "authentication_service_unavailable" });
    }
  };
}

import type { NextFunction, Request, Response } from 'express';
import { AccountSubjectNotLinkedError, type AccountSubjectClient } from './account-subject-client.js';
import { EDGE_ASSERTION_HEADER, verifyEdgeAssertion } from './edge-assertion.js';
import type { GatewayPrincipal } from './authentication-middleware.js';

type EdgeRequest = Request & { authenticatedPrincipal?: GatewayPrincipal };

export function createEdgeAuthenticationMiddleware(
  subjects: Pick<AccountSubjectClient, 'resolve'>,
  secret: string,
) {
  if (secret.length < 32) throw new Error('EDGE_AUTH_ASSERTION_SECRET must contain at least 32 characters');
  return async (request: EdgeRequest, response: Response, next: NextFunction): Promise<void> => {
    delete request.headers['x-jwt-payload'];
    delete request.headers['x-gaegaeting-principal'];
    const authorization = request.headers.authorization;
    const assertion = request.headers[EDGE_ASSERTION_HEADER];
    delete request.headers[EDGE_ASSERTION_HEADER];
    delete request.headers.authorization;
    const bearer = typeof authorization === 'string' ? /^Bearer ([^\s]+)$/.exec(authorization) : null;
    if (!bearer || typeof assertion !== 'string') {
      response.status(401).json({ error: 'authentication_required' });
      return;
    }
    let external: ReturnType<typeof verifyEdgeAssertion>;
    try {
      external = verifyEdgeAssertion(assertion, bearer[1], secret);
    } catch {
      response.status(401).json({ error: 'authentication_required' });
      return;
    }
    try {
      const mapped = await subjects.resolve({ tenantId: external.issuer, subject: external.subject });
      request.authenticatedPrincipal = {
        tenantId: external.tenantId,
        subject: external.subject,
        userId: mapped.userId,
        scopes: external.scopes,
        ...(external.roles === undefined ? {} : { roles: external.roles }),
      };
      next();
    } catch (error) {
      if (error instanceof AccountSubjectNotLinkedError) {
        response.status(401).json({ error: 'account_not_registered' });
        return;
      }
      response.status(503).json({ error: 'authentication_service_unavailable' });
    }
  };
}

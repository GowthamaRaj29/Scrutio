/* eslint-disable @typescript-eslint/no-namespace */
import type { NextFunction, Request, Response } from 'express';
import { AuthService, SessionError, type AuthenticatedUser } from '../services/auth-service.js';

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: AuthenticatedUser;
    }
  }
}

export function readSessionToken(request: Request): string | null {
  const header = request.headers.cookie;
  if (header === undefined) {
    return null;
  }
  const token = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('scrutio_session='))
    ?.slice('scrutio_session='.length);
  return token === undefined || token.length === 0 ? null : decodeURIComponent(token);
}

export function requireAuthentication(authService: AuthService) {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const token = readSessionToken(request);
    if (token === null) {
      response.status(401).json({ error: 'Authentication required' });
      return;
    }
    try {
      request.authenticatedUser = await authService.currentUser(token);
      next();
    } catch (error: unknown) {
      if (error instanceof SessionError) {
        response.status(401).json({ error: error.message });
        return;
      }
      next(error);
    }
  };
}

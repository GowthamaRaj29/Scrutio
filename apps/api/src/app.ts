import express, { type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuthentication, readSessionToken } from './middleware/auth.js';
import { PostgresPaymentRepository } from './infrastructure/repositories/postgres-payment-repository.js';
import { AuthService, AuthenticationError, LoginRateLimiter } from './services/auth-service.js';
import { PaymentNotFoundError, PaymentStatusService } from './services/payment-status-service.js';
import type { Database } from './infrastructure/postgres/database.js';
import type { PaymentStatusCache } from './infrastructure/cache/payment-status-cache.js';

const paymentPathSchema = z.object({
  organizationId: z.uuid(),
  paymentId: z.string().min(1),
});
const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(256),
  organizationId: z.uuid().optional(),
});

export type AppDependencies = {
  paymentStatusCache: PaymentStatusCache;
  authService: AuthService;
  database: Database;
};

function setSessionCookie(response: Response, token: string): void {
  response.setHeader(
    'Set-Cookie',
    `scrutio_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
  );
}

export function createApp(dependencies: AppDependencies): express.Express {
  const app = express();
  const { paymentStatusCache, authService, database } = dependencies;
  const loginRateLimiter = new LoginRateLimiter();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.post('/api/v1/auth/login', async (request: Request, response: Response): Promise<void> => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: 'Invalid login request' });
      return;
    }
    const key = `${request.ip ?? 'unknown'}:${parsed.data.email.toLowerCase()}`;
    if (!loginRateLimiter.allow(key)) {
      response.status(429).json({ error: 'Too many authentication attempts' });
      return;
    }
    try {
      const session = await authService.login(
        parsed.data.email,
        parsed.data.password,
        parsed.data.organizationId,
      );
      loginRateLimiter.clear(key);
      setSessionCookie(response, session.token);
      response.json({
        user: {
          id: session.user.userId,
          email: session.user.email,
          organizationId: session.user.organizationId,
          role: session.user.role,
        },
      });
    } catch (error: unknown) {
      if (error instanceof AuthenticationError) {
        response.status(401).json({ error: error.message });
        return;
      }
      response.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post(
    '/api/v1/auth/logout',
    requireAuthentication(authService),
    async (request: Request, response: Response): Promise<void> => {
      const token = readSessionToken(request);
      if (token !== null) {
        await authService.logout(token);
      }
      response.setHeader(
        'Set-Cookie',
        'scrutio_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
      );
      response.status(204).send();
    },
  );

  app.get(
    '/api/v1/organizations/:organizationId/payments/:paymentId/status',
    requireAuthentication(authService),
    async (request: Request, response: Response): Promise<void> => {
      const parsed = paymentPathSchema.safeParse(request.params);
      if (!parsed.success) {
        response.status(400).json({ error: 'Invalid payment path' });
        return;
      }

      const user = request.authenticatedUser;
      if (user === undefined || user.organizationId !== parsed.data.organizationId) {
        response.status(403).json({ error: 'Forbidden' });
        return;
      }

      try {
        const paymentStatus = await database.withTransaction(user.organizationId, async (client) =>
          new PaymentStatusService(
            new PostgresPaymentRepository(client),
            paymentStatusCache,
          ).getStatus(user.organizationId, parsed.data.paymentId),
        );
        response.json(paymentStatus);
      } catch (error: unknown) {
        if (error instanceof PaymentNotFoundError) {
          response.status(404).json({ error: error.message });
          return;
        }
        response.status(500).json({ error: 'Internal server error' });
      }
    },
  );

  return app;
}

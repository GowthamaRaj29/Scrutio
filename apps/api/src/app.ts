import express, { type Request, type Response } from 'express';
import { z } from 'zod';
import {
  ledgerEntryIngestionSchema,
  orderIngestionSchema,
  providerPaymentEventIngestionSchema,
  settlementIngestionSchema,
  webhookIngestionSchema,
} from './domain/ingestion.js';
import { requireAuthentication, readSessionToken } from './middleware/auth.js';
import { AuthService, AuthenticationError, LoginRateLimiter } from './services/auth-service.js';
import { PaymentNotFoundError } from './services/payment-status-service.js';
import {
  InvestigationNotFoundError,
  InvestigationService,
} from './services/investigation-service.js';
import type { PaymentStatusService } from './services/payment-status-service.js';
import { IngestionConflictError, IngestionService } from './services/ingestion-service.js';

const paymentPathSchema = z.object({
  organizationId: z.uuid(),
  paymentId: z.string().min(1),
});
const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(256),
  organizationId: z.uuid().optional(),
});
const investigationPathSchema = z.object({
  organizationId: z.uuid(),
});
const investigationIdPathSchema = investigationPathSchema.extend({
  investigationId: z.uuid(),
});
const investigationRequestSchema = z.object({
  paymentId: z.string().min(1).max(100),
  evaluationTimestamp: z.iso.datetime({ offset: true }).optional(),
});

export type AppDependencies = {
  paymentStatusService: PaymentStatusService;
  authService: AuthService;
  investigationService: InvestigationService;
  ingestionService: IngestionService;
};

function setSessionCookie(response: Response, token: string): void {
  response.setHeader(
    'Set-Cookie',
    `scrutio_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
  );
}

export function createApp(dependencies: AppDependencies): express.Express {
  const app = express();
  const { paymentStatusService, authService, investigationService, ingestionService } =
    dependencies;
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
    '/api/v1/organizations/:organizationId/provider/payment-events',
    requireAuthentication(authService),
    async (request: Request, response: Response): Promise<void> => {
      const path = investigationPathSchema.safeParse(request.params);
      const body = providerPaymentEventIngestionSchema.safeParse(request.body);
      const user = request.authenticatedUser;
      if (!path.success || !body.success) {
        response.status(400).json({ error: 'Invalid provider event request' });
        return;
      }
      if (user === undefined || user.organizationId !== path.data.organizationId) {
        response.status(403).json({ error: 'Forbidden' });
        return;
      }
      try {
        await ingestionService.ingestProviderPaymentEvent(user.organizationId, body.data);
        response.status(202).json({ status: 'accepted' });
      } catch (error: unknown) {
        if (error instanceof IngestionConflictError) {
          response.status(409).json({ error: error.message });
          return;
        }
        response.status(500).json({ error: 'Provider event ingestion failed' });
      }
    },
  );

  app.post(
    '/api/v1/organizations/:organizationId/settlements',
    requireAuthentication(authService),
    async (request: Request, response: Response): Promise<void> => {
      const path = investigationPathSchema.safeParse(request.params);
      const body = settlementIngestionSchema.safeParse(request.body);
      const user = request.authenticatedUser;
      if (!path.success || !body.success) {
        response.status(400).json({ error: 'Invalid settlement ingestion request' });
        return;
      }
      if (user === undefined || user.organizationId !== path.data.organizationId) {
        response.status(403).json({ error: 'Forbidden' });
        return;
      }
      try {
        await ingestionService.ingestSettlement(user.organizationId, body.data);
        response.status(202).json({ status: 'accepted' });
      } catch (error: unknown) {
        if (error instanceof IngestionConflictError) {
          response.status(409).json({ error: error.message });
          return;
        }
        response.status(500).json({ error: 'Settlement ingestion failed' });
      }
    },
  );

  app.post(
    '/api/v1/organizations/:organizationId/ledger/entries',
    requireAuthentication(authService),
    async (request: Request, response: Response): Promise<void> => {
      const path = investigationPathSchema.safeParse(request.params);
      const body = ledgerEntryIngestionSchema.safeParse(request.body);
      const user = request.authenticatedUser;
      if (!path.success || !body.success) {
        response.status(400).json({ error: 'Invalid ledger ingestion request' });
        return;
      }
      if (user === undefined || user.organizationId !== path.data.organizationId) {
        response.status(403).json({ error: 'Forbidden' });
        return;
      }
      try {
        await ingestionService.ingestLedgerEntry(user.organizationId, body.data);
        response.status(202).json({ status: 'accepted' });
      } catch (error: unknown) {
        if (error instanceof IngestionConflictError) {
          response.status(409).json({ error: error.message });
          return;
        }
        response.status(500).json({ error: 'Ledger ingestion failed' });
      }
    },
  );

  app.post(
    '/api/v1/organizations/:organizationId/orders',
    requireAuthentication(authService),
    async (request: Request, response: Response): Promise<void> => {
      const path = investigationPathSchema.safeParse(request.params);
      const body = orderIngestionSchema.safeParse(request.body);
      const user = request.authenticatedUser;
      if (!path.success || !body.success) {
        response.status(400).json({ error: 'Invalid order ingestion request' });
        return;
      }
      if (user === undefined || user.organizationId !== path.data.organizationId) {
        response.status(403).json({ error: 'Forbidden' });
        return;
      }
      try {
        await ingestionService.ingestOrder(user.organizationId, body.data);
        response.status(202).json({ status: 'accepted' });
      } catch (error: unknown) {
        response.status(409).json({
          error: error instanceof Error ? error.message : 'Ingestion failed',
        });
      }
    },
  );

  app.post(
    '/api/v1/organizations/:organizationId/webhooks',
    requireAuthentication(authService),
    async (request: Request, response: Response): Promise<void> => {
      const path = investigationPathSchema.safeParse(request.params);
      const body = webhookIngestionSchema.safeParse(request.body);
      const user = request.authenticatedUser;
      if (!path.success || !body.success) {
        response.status(400).json({ error: 'Invalid webhook ingestion request' });
        return;
      }
      if (user === undefined || user.organizationId !== path.data.organizationId) {
        response.status(403).json({ error: 'Forbidden' });
        return;
      }
      try {
        await ingestionService.ingestWebhook(user.organizationId, body.data);
        response.status(202).json({ status: 'accepted' });
      } catch (error: unknown) {
        if (error instanceof IngestionConflictError) {
          response.status(409).json({ error: error.message });
          return;
        }
        response.status(500).json({ error: 'Ingestion failed' });
      }
    },
  );

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

  app.post(
    '/api/v1/organizations/:organizationId/investigations',
    requireAuthentication(authService),
    async (request: Request, response: Response): Promise<void> => {
      const path = investigationPathSchema.safeParse(request.params);
      const body = investigationRequestSchema.safeParse(request.body);
      const user = request.authenticatedUser;
      if (!path.success || !body.success) {
        response.status(400).json({ error: 'Invalid investigation request' });
        return;
      }
      if (
        user === undefined ||
        user.organizationId !== path.data.organizationId ||
        !['owner', 'admin', 'analyst'].includes(user.role)
      ) {
        response.status(403).json({ error: 'Forbidden' });
        return;
      }
      try {
        const investigation = await investigationService.execute(
          user.organizationId,
          user.userId,
          body.data.paymentId,
          body.data.evaluationTimestamp ?? new Date().toISOString(),
        );
        response.status(201).json(investigation);
      } catch (error: unknown) {
        if (error instanceof InvestigationNotFoundError) {
          response.status(404).json({ error: error.message });
          return;
        }
        response.status(500).json({ error: 'Internal server error' });
      }
    },
  );

  app.get(
    '/api/v1/organizations/:organizationId/investigations/:investigationId',
    requireAuthentication(authService),
    async (request: Request, response: Response): Promise<void> => {
      const parsed = investigationIdPathSchema.safeParse(request.params);
      const user = request.authenticatedUser;
      if (!parsed.success) {
        response.status(400).json({ error: 'Invalid investigation path' });
        return;
      }
      if (user === undefined || user.organizationId !== parsed.data.organizationId) {
        response.status(403).json({ error: 'Forbidden' });
        return;
      }
      try {
        const investigation = await investigationService.findById(
          user.organizationId,
          parsed.data.investigationId,
        );
        response.json(investigation);
      } catch (error: unknown) {
        if (error instanceof InvestigationNotFoundError) {
          response.status(404).json({ error: error.message });
          return;
        }
        response.status(500).json({ error: 'Internal server error' });
      }
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
        const paymentStatus = await paymentStatusService.getStatus(
          user.organizationId,
          parsed.data.paymentId,
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

import express, { type Request, type Response } from 'express';
import { z } from 'zod';
import { PaymentNotFoundError, PaymentStatusService } from './services/payment-status-service.js';

const paymentPathSchema = z.object({
  organizationId: z.string().min(1),
  paymentId: z.string().min(1),
});

export function createApp(paymentStatusService: PaymentStatusService): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.get(
    '/api/v1/organizations/:organizationId/payments/:paymentId/status',
    async (request: Request, response: Response): Promise<void> => {
      const parsed = paymentPathSchema.safeParse(request.params);
      if (!parsed.success) {
        response.status(400).json({ error: 'Invalid payment path' });
        return;
      }

      try {
        const paymentStatus = await paymentStatusService.getStatus(
          parsed.data.organizationId,
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

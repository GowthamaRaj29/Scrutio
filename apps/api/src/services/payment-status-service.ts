import {
  toPaymentStatusResponse,
  type PaymentRepository,
  type PaymentStatusResponse,
} from '../domain/payments.js';
import { PaymentStatusCache } from '../infrastructure/cache/payment-status-cache.js';

export class PaymentNotFoundError extends Error {
  public constructor() {
    super('Payment not found');
    this.name = 'PaymentNotFoundError';
  }
}

export class PaymentStatusService {
  public constructor(
    private readonly repository: PaymentRepository,
    private readonly cache: PaymentStatusCache,
  ) {}

  public async getStatus(
    organizationId: string,
    paymentId: string,
  ): Promise<PaymentStatusResponse> {
    const cached = this.cache.get(organizationId, paymentId);
    if (cached !== null) {
      return cached;
    }

    const payment = await this.repository.findByOrganizationAndPaymentId(organizationId, paymentId);
    if (payment === null) {
      throw new PaymentNotFoundError();
    }
    const response = toPaymentStatusResponse(payment, 'database');
    this.cache.set(organizationId, paymentId, response);
    return response;
  }
}

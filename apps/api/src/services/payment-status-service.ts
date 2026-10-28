import {
  toPaymentStatusResponse,
  type PaymentRecord,
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
  private readonly inFlight = new Map<string, InFlightRequest>();

  public constructor(
    private readonly repository: PaymentRepository | PaymentLookup,
    public readonly cache: PaymentStatusCache,
    private readonly maxInFlight = 100,
  ) {}

  public async getStatus(
    organizationId: string,
    paymentId: string,
  ): Promise<PaymentStatusResponse> {
    const cached = this.cache.get(organizationId, paymentId);
    if (cached !== null) {
      return cached;
    }

    const key = this.key(organizationId, paymentId);
    const version = this.cache.currentVersion();
    const existing = this.inFlight.get(key);
    if (existing !== undefined && existing.version === version) {
      return existing.promise;
    }

    if (existing !== undefined) {
      this.inFlight.delete(key);
    }

    const promise = this.loadAndCache(organizationId, paymentId, version);
    if (this.inFlight.size >= this.maxInFlight) {
      return promise;
    }
    const request: InFlightRequest = { promise, version };
    this.inFlight.set(key, request);
    void promise.then(
      () => {
        if (this.inFlight.get(key) === request) {
          this.inFlight.delete(key);
        }
      },
      () => {
        if (this.inFlight.get(key) === request) {
          this.inFlight.delete(key);
        }
      },
    );
    return promise;
  }

  public invalidateAfterMutation(organizationId: string, paymentId: string): void {
    this.cache.invalidate(organizationId, paymentId);
    this.inFlight.delete(this.key(organizationId, paymentId));
  }

  public inFlightSize(): number {
    return this.inFlight.size;
  }

  private async loadAndCache(
    organizationId: string,
    paymentId: string,
    version: number,
  ): Promise<PaymentStatusResponse> {
    const payment =
      typeof this.repository === 'function'
        ? await this.repository(organizationId, paymentId)
        : await this.repository.findByOrganizationAndPaymentId(organizationId, paymentId);
    if (payment === null) {
      throw new PaymentNotFoundError();
    }
    const response = toPaymentStatusResponse(payment, 'database');
    this.cache.setIfCurrent(organizationId, paymentId, response, version);
    return response;
  }

  private key(organizationId: string, paymentId: string): string {
    return `payment:${organizationId}:${paymentId}`;
  }
}

export type PaymentLookup = (
  organizationId: string,
  paymentId: string,
) => Promise<PaymentRecord | null>;

type InFlightRequest = {
  promise: Promise<PaymentStatusResponse>;
  version: number;
};

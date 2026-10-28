import type { PaymentStatusResponse } from '../../domain/payments.js';

type CacheEntry = {
  value: PaymentStatusResponse;
  expiresAt: number;
};

export class PaymentStatusCache {
  private readonly entries = new Map<string, CacheEntry>();
  private invalidationVersion = 0;

  public constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number,
    private readonly clock: () => number = Date.now,
  ) {}

  public get(organizationId: string, paymentId: string): PaymentStatusResponse | null {
    const key = this.key(organizationId, paymentId);
    const entry = this.entries.get(key);
    if (entry === undefined) {
      return null;
    }
    if (entry.expiresAt <= this.clock()) {
      this.entries.delete(key);
      return null;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return { ...entry.value, source: 'cache' };
  }

  public set(organizationId: string, paymentId: string, value: PaymentStatusResponse): void {
    this.setIfCurrent(organizationId, paymentId, value, this.invalidationVersion);
  }

  public currentVersion(): number {
    return this.invalidationVersion;
  }

  public setIfCurrent(
    organizationId: string,
    paymentId: string,
    value: PaymentStatusResponse,
    version: number,
  ): void {
    if (version !== this.invalidationVersion) {
      return;
    }
    const key = this.key(organizationId, paymentId);
    this.entries.delete(key);
    while (this.entries.size >= this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      this.entries.delete(oldestKey);
    }
    this.entries.set(key, {
      value: { ...value, source: 'database' },
      expiresAt: this.clock() + this.ttlMs,
    });
  }

  public invalidate(organizationId: string, paymentId: string): void {
    this.invalidationVersion += 1;
    this.entries.delete(this.key(organizationId, paymentId));
  }

  public size(): number {
    return this.entries.size;
  }

  private key(organizationId: string, paymentId: string): string {
    return `payment:${organizationId}:${paymentId}`;
  }
}

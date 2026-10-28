import { createApp } from './app.js';
import { loadConfig } from './config/index.js';
import { InMemoryPaymentRepository } from './infrastructure/repositories/in-memory-payment-repository.js';
import { PaymentStatusCache } from './infrastructure/cache/payment-status-cache.js';
import { PaymentStatusService } from './services/payment-status-service.js';

const config = loadConfig();
const repository = new InMemoryPaymentRepository();
const cache = new PaymentStatusCache(config.cacheMaxEntries, config.cachePaymentStatusTtlMs);
const paymentStatusService = new PaymentStatusService(repository, cache);

createApp(paymentStatusService).listen(config.port, () => {
  console.log('Scrutio API listening on port', config.port);
});

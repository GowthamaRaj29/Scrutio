import { createApp } from './app.js';
import { loadConfig } from './config/index.js';
import { PaymentStatusCache } from './infrastructure/cache/payment-status-cache.js';
import { Database } from './infrastructure/postgres/database.js';
import { AuthService } from './services/auth-service.js';

const config = loadConfig();
if (config.databaseUrl === undefined) {
  throw new Error('DATABASE_URL is required to start the API');
}
const database = new Database(config.databaseUrl);
const cache = new PaymentStatusCache(config.cacheMaxEntries, config.cachePaymentStatusTtlMs);
const authService = new AuthService(database);

createApp({ paymentStatusCache: cache, authService, database }).listen(config.port, () => {
  console.log('Scrutio API listening on port', config.port);
});

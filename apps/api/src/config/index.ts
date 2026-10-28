import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.url().optional(),
  DATABASE_ADMIN_URL: z.url().optional(),
  DATABASE_APP_PASSWORD: z.string().min(1).optional(),
  AI_PROVIDER_API_KEY: z.string().min(1).optional(),
  AI_PROVIDER_MODEL: z.string().min(1).default('gemini-3.8-flash'),
  AI_PROMPT_VERSION: z.coerce.number().int().positive().default(1),
  CACHE_MAX_ENTRIES: z.coerce.number().int().positive().default(500),
  CACHE_PAYMENT_STATUS_TTL_MS: z.coerce.number().int().positive().default(30_000),
});

export type AppConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl?: string;
  databaseAdminUrl?: string;
  databaseAppPassword?: string;
  aiProviderApiKey?: string;
  aiProviderModel: string;
  aiPromptVersion: number;
  cacheMaxEntries: number;
  cachePaymentStatusTtlMs: number;
};

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = environmentSchema.parse(environment);
  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    ...(parsed.DATABASE_URL === undefined ? {} : { databaseUrl: parsed.DATABASE_URL }),
    ...(parsed.DATABASE_ADMIN_URL === undefined
      ? {}
      : { databaseAdminUrl: parsed.DATABASE_ADMIN_URL }),
    ...(parsed.DATABASE_APP_PASSWORD === undefined
      ? {}
      : { databaseAppPassword: parsed.DATABASE_APP_PASSWORD }),
    ...(parsed.AI_PROVIDER_API_KEY === undefined
      ? {}
      : { aiProviderApiKey: parsed.AI_PROVIDER_API_KEY }),
    aiProviderModel: parsed.AI_PROVIDER_MODEL,
    aiPromptVersion: parsed.AI_PROMPT_VERSION,
    cacheMaxEntries: parsed.CACHE_MAX_ENTRIES,
    cachePaymentStatusTtlMs: parsed.CACHE_PAYMENT_STATUS_TTL_MS,
  };
}

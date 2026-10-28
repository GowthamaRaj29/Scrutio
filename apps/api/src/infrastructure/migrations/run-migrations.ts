import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { loadConfig } from '../../config/index.js';
import { Database } from '../postgres/database.js';

const migrationNameSchema = z.string().regex(/^\d{3}_[a-z0-9-]+\.sql$/);
const migrationsDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../database/migrations',
);

export async function runMigrations(databaseUrl: string): Promise<void> {
  const database = new Database(databaseUrl);
  try {
    await database.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const files = (await readdir(migrationsDirectory))
      .map((fileName) => migrationNameSchema.parse(basename(fileName)))
      .sort();
    for (const fileName of files) {
      const existing = await database.query<{ version: string }>(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [fileName],
      );
      if (existing.rowCount !== 0) {
        continue;
      }
      const sql = await readFile(join(migrationsDirectory, fileName), 'utf8');
      await database.withTransaction(null, async (client) => {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [fileName]);
      });
    }
  } finally {
    await database.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = loadConfig();
  if (config.databaseUrl === undefined) {
    throw new Error('DATABASE_URL is required to run migrations');
  }
  await runMigrations(config.databaseUrl);
}

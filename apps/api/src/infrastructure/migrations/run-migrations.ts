import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { loadConfig } from '../../config/index.js';
import { Database } from '../postgres/database.js';

const migrationNameSchema = z.string().regex(/^\d{3}_[a-z0-9_-]+\.sql$/);
const migrationsDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../database/migrations',
);

export async function runMigrations(databaseUrl: string): Promise<void> {
  const database = new Database(databaseUrl);
  try {
    await database.query("SELECT pg_advisory_lock(hashtextextended('scrutio:migrations', 0))");
    await database.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const config = loadConfig();
    if (config.databaseAppPassword !== undefined) {
      const roleSql = await database.query<{ statement: string }>(
        `SELECT format(
          'DO $role$ BEGIN
             IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = %L) THEN
               CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOBYPASSRLS;
             ELSE
               ALTER ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOBYPASSRLS;
             END IF;
           END $role$;',
          'scrutio_app',
          'scrutio_app',
          $1::text,
          'scrutio_app',
          $1::text
        ) AS statement`,
        [config.databaseAppPassword],
      );
      await database.query(roleSql.rows[0]?.statement ?? '');
      await database.query('GRANT CONNECT ON DATABASE scrutio TO scrutio_app');
      await database.query('GRANT USAGE ON SCHEMA public TO scrutio_app');
    }
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
    await database.query("SELECT pg_advisory_unlock(hashtextextended('scrutio:migrations', 0))");
    await database.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = loadConfig();
  const migrationDatabaseUrl = config.databaseAdminUrl ?? config.databaseUrl;
  if (migrationDatabaseUrl === undefined) {
    throw new Error('DATABASE_ADMIN_URL or DATABASE_URL is required to run migrations');
  }
  await runMigrations(migrationDatabaseUrl);
}

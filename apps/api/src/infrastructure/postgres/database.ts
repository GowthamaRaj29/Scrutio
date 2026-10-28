import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

export type Queryable = Pick<PoolClient, 'query'>;

export class Database {
  private readonly pool: Pool;

  public constructor(databaseUrl: string, maxConnections = 10) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      max: maxConnections,
      application_name: 'scrutio-api',
    });
  }

  public query<Row extends QueryResultRow>(
    text: string,
    values: unknown[] = [],
  ): Promise<QueryResult<Row>> {
    return this.pool.query<Row>(text, values);
  }

  public async withTransaction<Result>(
    organizationId: string | null,
    operation: (client: PoolClient) => Promise<Result>,
  ): Promise<Result> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      if (organizationId === null) {
        await client.query("SELECT set_config('app.organization_id', '', true)");
      } else {
        await client.query("SELECT set_config('app.organization_id', $1, true)", [organizationId]);
      }
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

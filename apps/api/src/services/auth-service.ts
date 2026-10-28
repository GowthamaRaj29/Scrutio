import { createHash, randomBytes } from 'node:crypto';
import type { Database, Queryable } from '../infrastructure/postgres/database.js';
import { hashPassword, verifyPassword } from './password-hasher.js';

export type UserRole = 'owner' | 'admin' | 'analyst' | 'viewer';

export type AuthenticatedUser = {
  userId: string;
  email: string;
  organizationId: string;
  role: UserRole;
  sessionId: string;
};

type UserRow = { id: string; email: string; password_hash: string; status: 'active' | 'disabled' };
type MembershipRow = { organization_id: string; role: UserRole };
type SessionRow = AuthenticatedUser & {
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
};

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export class AuthenticationError extends Error {
  public constructor() {
    super('Invalid email or password');
    this.name = 'AuthenticationError';
  }
}

export class SessionError extends Error {
  public constructor() {
    super('Authentication required');
    this.name = 'SessionError';
  }
}

export class AuthorizationError extends Error {
  public constructor() {
    super('Forbidden');
    this.name = 'AuthorizationError';
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class LoginRateLimiter {
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();

  public constructor(
    private readonly maxAttempts = 5,
    private readonly windowMs = 15 * 60 * 1000,
  ) {}

  public allow(key: string, now = Date.now()): boolean {
    const current = this.attempts.get(key);
    if (current === undefined || current.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (current.count >= this.maxAttempts) {
      return false;
    }
    current.count += 1;
    return true;
  }

  public clear(key: string): void {
    this.attempts.delete(key);
  }
}

export class AuthService {
  public constructor(private readonly database: Database) {}

  public async login(
    email: string,
    password: string,
    organizationId?: string,
  ): Promise<{ user: AuthenticatedUser; token: string }> {
    const normalizedEmail = normalizeEmail(email);
    const result = await this.database.withTransaction(null, async (client) => {
      const userResult = await client.query<UserRow>(
        'SELECT id, email, password_hash, status FROM users WHERE email = $1',
        [normalizedEmail],
      );
      const user = userResult.rows[0];
      if (
        user === undefined ||
        user.status !== 'active' ||
        !(await verifyPassword(password, user.password_hash))
      ) {
        await this.recordAudit(client, null, null, 'authentication_failed', {});
        throw new AuthenticationError();
      }
      const memberships = await client.query<MembershipRow>(
        `SELECT organization_id, role
           FROM organization_memberships
          WHERE user_id = $1
          ORDER BY organization_id`,
        [user.id],
      );
      const membership =
        organizationId === undefined
          ? memberships.rows.length === 1
            ? memberships.rows[0]
            : undefined
          : memberships.rows.find((item) => item.organization_id === organizationId);
      if (membership === undefined) {
        await this.recordAudit(client, user.id, null, 'authorization_failed', {});
        throw new AuthenticationError();
      }
      const token = randomBytes(32).toString('base64url');
      const session = await client.query<{ id: string }>(
        `INSERT INTO sessions (user_id, organization_id, token_hash, expires_at)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [
          user.id,
          membership.organization_id,
          tokenHash(token),
          new Date(Date.now() + SESSION_TTL_MS),
        ],
      );
      const sessionRow = session.rows[0];
      if (sessionRow === undefined) {
        throw new Error('Session creation failed');
      }
      const authenticatedUser: AuthenticatedUser = {
        userId: user.id,
        email: user.email,
        organizationId: membership.organization_id,
        role: membership.role,
        sessionId: sessionRow.id,
      };
      await this.recordAudit(
        client,
        user.id,
        membership.organization_id,
        'authentication_succeeded',
        {},
      );
      return { user: authenticatedUser, token };
    });
    return result;
  }

  public async currentUser(token: string): Promise<AuthenticatedUser> {
    return this.database.withTransaction(null, async (client) => {
      const result = await client.query<SessionRow>(
        `SELECT s.id AS "sessionId", s.user_id AS "userId", u.email,
                s.organization_id AS "organizationId", m.role, s.token_hash,
                s.expires_at, s.revoked_at
           FROM sessions s
           JOIN users u ON u.id = s.user_id
           JOIN organization_memberships m
             ON m.user_id = s.user_id AND m.organization_id = s.organization_id
          WHERE s.token_hash = $1
            AND s.revoked_at IS NULL
            AND s.expires_at > NOW()
            AND u.status = 'active'`,
        [tokenHash(token)],
      );
      const session = result.rows[0];
      if (session === undefined) {
        throw new SessionError();
      }
      await client.query('UPDATE sessions SET last_seen_at = NOW() WHERE id = $1', [
        session.sessionId,
      ]);
      return {
        userId: session.userId,
        email: session.email,
        organizationId: session.organizationId,
        role: session.role,
        sessionId: session.sessionId,
      };
    });
  }

  public async logout(token: string): Promise<void> {
    await this.database.withTransaction(null, async (client) => {
      const result = await client.query<{ user_id: string; organization_id: string }>(
        `UPDATE sessions SET revoked_at = NOW()
          WHERE token_hash = $1 AND revoked_at IS NULL
          RETURNING user_id, organization_id`,
        [tokenHash(token)],
      );
      const session = result.rows[0];
      if (session !== undefined) {
        await this.recordAudit(client, session.user_id, session.organization_id, 'logout', {});
      }
    });
  }

  private async recordAudit(
    client: Queryable,
    userId: string | null,
    organizationId: string | null,
    eventType: string,
    metadata: Record<string, string>,
  ): Promise<void> {
    await client.query(
      `INSERT INTO security_audit_events (user_id, organization_id, event_type, metadata)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [userId, organizationId, eventType, JSON.stringify(metadata)],
    );
  }
}

export async function createPasswordHash(password: string): Promise<string> {
  return hashPassword(password);
}

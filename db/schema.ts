import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const investigations = sqliteTable(
  'investigations',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull(),
    title: text('title').notNull(),
    experimentId: text('experiment_id').notNull(),
    mode: text('mode').notNull(),
    trace: text('trace').notNull(),
    notes: text('notes').notNull().default(''),
    version: integer('version').notNull().default(1),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('idx_investigations_owner_updated').on(t.ownerId, t.updatedAt)],
);

export const authCodes = sqliteTable(
  'auth_codes',
  {
    codeHash: text('code_hash').primaryKey(),
    ownerId: text('owner_id').notNull(),
    email: text('email').notNull(),
    challenge: text('challenge').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (t) => [
    index('idx_auth_codes_expiry').on(t.expiresAt),
    index('idx_auth_codes_owner').on(t.ownerId),
  ],
);
export const gatewaySessions = sqliteTable(
  'gateway_sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    ownerId: text('owner_id').notNull(),
    email: text('email').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (t) => [
    index('idx_gateway_sessions_expiry').on(t.expiresAt),
    index('idx_gateway_sessions_owner_expiry').on(t.ownerId, t.expiresAt),
  ],
);

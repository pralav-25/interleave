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

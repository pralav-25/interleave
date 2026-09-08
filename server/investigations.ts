import type {
  CreateInvestigation,
  Investigation,
} from '../lib/investigations.ts';
import { MAX_INVESTIGATIONS } from '../lib/investigations.ts';
export class StoreError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
const fields =
  'id, title, experiment_id as experimentId, mode, trace, notes, version, created_at as createdAt, updated_at as updatedAt';
/** Every statement scopes the record to the authenticated owner, including updates and deletes. */
export function investigationStore(db: D1Database) {
  return {
    async list(owner: string) {
      return (
        await db
          .prepare(
            `SELECT ${fields} FROM investigations WHERE owner_id = ? ORDER BY updated_at DESC, id DESC LIMIT ?`,
          )
          .bind(owner, MAX_INVESTIGATIONS)
          .all<Investigation>()
      ).results;
    },
    async get(owner: string, id: string) {
      const row = await db
        .prepare(
          `SELECT ${fields} FROM investigations WHERE owner_id = ? AND id = ?`,
        )
        .bind(owner, id)
        .first<Investigation>();
      if (!row) throw new StoreError(404, 'Investigation not found.');
      return row;
    },
    async create(owner: string, input: CreateInvestigation) {
      const id = crypto.randomUUID();
      const now = Date.now();
      // Quota check and insert happen in one SQLite statement, avoiding a count-then-insert race.
      const result = await db
        .prepare(
          `INSERT INTO investigations (id,owner_id,title,experiment_id,mode,trace,notes,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM investigations WHERE owner_id = ?) < ?`,
        )
        .bind(
          id,
          owner,
          input.title,
          input.experimentId,
          input.mode,
          input.trace,
          input.notes,
          now,
          now,
          owner,
          MAX_INVESTIGATIONS,
        )
        .run();
      if (!result.meta.changes)
        throw new StoreError(
          409,
          `Your workspace holds up to ${MAX_INVESTIGATIONS} investigations. Delete one before saving another.`,
        );
      return { id, ...input, version: 1, createdAt: now, updatedAt: now };
    },
    async update(
      owner: string,
      id: string,
      input: { title: string; notes: string; version: number },
    ) {
      const result = await db
        .prepare(
          'UPDATE investigations SET title = ?, notes = ?, updated_at = ?, version = version + 1 WHERE id = ? AND owner_id = ? AND version = ?',
        )
        .bind(input.title, input.notes, Date.now(), id, owner, input.version)
        .run();
      if (!result.meta.changes) {
        const row = await db
          .prepare(
            'SELECT id FROM investigations WHERE id = ? AND owner_id = ?',
          )
          .bind(id, owner)
          .first();
        if (!row) throw new StoreError(404, 'Investigation not found.');
        throw new StoreError(
          409,
          'This investigation changed in another tab. Reload it before saving.',
        );
      }
    },
    async delete(owner: string, id: string, version: number) {
      const result = await db
        .prepare(
          'DELETE FROM investigations WHERE id = ? AND owner_id = ? AND version = ?',
        )
        .bind(id, owner, version)
        .run();
      if (!result.meta.changes) {
        const row = await db
          .prepare(
            'SELECT id FROM investigations WHERE id = ? AND owner_id = ?',
          )
          .bind(id, owner)
          .first();
        if (!row) throw new StoreError(404, 'Investigation not found.');
        throw new StoreError(
          409,
          'This investigation changed in another tab. Reload it before deleting.',
        );
      }
    },
  };
}

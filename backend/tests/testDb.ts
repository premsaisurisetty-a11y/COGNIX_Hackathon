import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { DbClient, ExecResult, SqlParam } from '../src/db/types';

/**
 * In-memory SQLite adapter used solely by Vitest so tests run cleanly offline.
 * Production, dev, and Vercel always use MySQL via createMysqlClient().
 */
export function createInMemoryTestClient(): DbClient {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');

  const toSqlParams = (params: SqlParam[]): SQLInputValue[] =>
    params.map((p) => {
      if (p === null) return null;
      if (Buffer.isBuffer(p)) return new Uint8Array(p);
      if (p instanceof Date) return p.toISOString();
      if (typeof p === 'boolean') return p ? 1 : 0;
      return p;
    });

  return {
    dialect: 'sqlite',

    async query<T = Record<string, unknown>>(sql: string, params: SqlParam[] = []): Promise<T[]> {
      const rows = db.prepare(sql).all(...toSqlParams(params));
      return rows.map((r) => Object.assign({}, r) as T);
    },

    async queryOne<T = Record<string, unknown>>(
      sql: string,
      params: SqlParam[] = []
    ): Promise<T | null> {
      const row = db.prepare(sql).get(...toSqlParams(params));
      return row ? (Object.assign({}, row) as T) : null;
    },

    async execute(sql: string, params: SqlParam[] = []): Promise<ExecResult> {
      const res = db.prepare(sql).run(...toSqlParams(params));
      return {
        affectedRows: Number(res.changes ?? 0),
        insertId: Number(res.lastInsertRowid ?? 0),
      };
    },

    async ping(): Promise<void> {
      db.prepare('SELECT 1').get();
    },

    async close(): Promise<void> {
      db.close();
    },
  };
}

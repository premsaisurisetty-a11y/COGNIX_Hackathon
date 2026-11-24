import mysql, { type Pool, type PoolOptions, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import type { DbClient, ExecResult, SqlParam } from './types';

export interface MysqlConfig {
  databaseUrl?: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
  sslRejectUnauthorized: boolean;
  connectionLimit: number;
}

function buildPoolOptions(cfg: MysqlConfig): PoolOptions {
  if (cfg.databaseUrl) {
    const parsed = new URL(cfg.databaseUrl);
    const sslMode = parsed.searchParams.get('ssl-mode') || parsed.searchParams.get('sslmode') || '';
    const sslParam = parsed.searchParams.get('ssl');
    const enableSsl =
      cfg.ssl ||
      sslParam === 'true' ||
      sslParam === '1' ||
      ['REQUIRED', 'VERIFY_CA', 'VERIFY_IDENTITY', 'require'].includes(sslMode);

    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 3306,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ''),
      waitForConnections: true,
      connectionLimit: cfg.connectionLimit,
      queueLimit: 0,
      connectTimeout: 8000,
      charset: 'utf8mb4',
      ...(enableSsl ? { ssl: { rejectUnauthorized: cfg.sslRejectUnauthorized } } : {}),
    };
  }

  return {
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    waitForConnections: true,
    connectionLimit: cfg.connectionLimit,
    queueLimit: 0,
    connectTimeout: 8000,
    charset: 'utf8mb4',
    ...(cfg.ssl ? { ssl: { rejectUnauthorized: cfg.sslRejectUnauthorized } } : {}),
  };
}

export async function ensureMysqlDatabase(cfg: MysqlConfig): Promise<void> {
  // Managed cloud URLs (TiDB, Aiven, Railway) already provision the database.
  if (cfg.databaseUrl) return;

  const opts = buildPoolOptions(cfg);
  const dbName = opts.database;
  if (!dbName || !/^[A-Za-z0-9_]+$/.test(dbName)) return;

  const { database: _omit, ...serverOpts } = opts;
  try {
    const conn = await mysql.createConnection(serverOpts);
    try {
      await conn.query(
        `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
    } finally {
      await conn.end();
    }
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
    if (code !== 'ER_DBACCESS_DENIED_ERROR' && code !== 'ER_ACCESS_DENIED_ERROR') {
      throw err;
    }
  }
}

export function createMysqlClient(cfg: MysqlConfig): DbClient {
  const pool: Pool = mysql.createPool(buildPoolOptions(cfg));

  return {
    dialect: 'mysql',

    async query<T = Record<string, unknown>>(sql: string, params: SqlParam[] = []): Promise<T[]> {
      const [rows] = await pool.query<RowDataPacket[]>(sql, params);
      return rows as unknown as T[];
    },

    async queryOne<T = Record<string, unknown>>(
      sql: string,
      params: SqlParam[] = []
    ): Promise<T | null> {
      const [rows] = await pool.query<RowDataPacket[]>(sql, params);
      return rows.length > 0 ? (rows[0] as unknown as T) : null;
    },

    async execute(sql: string, params: SqlParam[] = []): Promise<ExecResult> {
      const [result] = await pool.query<ResultSetHeader>(sql, params);
      return {
        affectedRows: result.affectedRows ?? 0,
        insertId: result.insertId ?? 0,
      };
    },

    async ping(): Promise<void> {
      const conn = await pool.getConnection();
      try {
        await conn.ping();
      } finally {
        conn.release();
      }
    },

    async close(): Promise<void> {
      await pool.end();
    },
  };
}

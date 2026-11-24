export type SqlParam = string | number | boolean | Buffer | Date | null;

export interface ExecResult {
  affectedRows: number;
  insertId: number;
}

export interface DbClient {
  readonly dialect: 'mysql' | 'sqlite';
  query<T = Record<string, unknown>>(sql: string, params?: SqlParam[]): Promise<T[]>;
  queryOne<T = Record<string, unknown>>(sql: string, params?: SqlParam[]): Promise<T | null>;
  execute(sql: string, params?: SqlParam[]): Promise<ExecResult>;
  ping(): Promise<void>;
  close(): Promise<void>;
}

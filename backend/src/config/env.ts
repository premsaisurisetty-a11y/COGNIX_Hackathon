import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true' || value === '1';
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // MySQL connection configuration
  databaseUrl: process.env.DATABASE_URL || process.env.MYSQL_URL || '',
  dbHost: process.env.DB_HOST ?? '127.0.0.1',
  dbPort: Number(process.env.DB_PORT ?? 3306),
  dbUser: process.env.DB_USER ?? 'root',
  dbPassword: process.env.DB_PASSWORD ?? '',
  dbName: process.env.DB_NAME ?? 'cognix_db',
  dbSsl: parseBool(process.env.DB_SSL, false),
  dbSslRejectUnauthorized: parseBool(process.env.DB_SSL_REJECT_UNAUTHORIZED, true),
  dbConnectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),

  jwtSecret: process.env.JWT_SECRET ?? 'cognix-26-dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@acmklh.org',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'ACM0206',
  adminName: process.env.ADMIN_NAME ?? 'Admin',
};

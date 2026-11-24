import path from 'node:path';
import express, { type Express } from 'express';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { createMysqlClient, ensureMysqlDatabase } from '../src/db/connection';
import { initializeSchema, seedDefaultsIfEmpty } from '../src/db/schema';

const publicDir = path.resolve(__dirname, '..', 'public');
const vercelApp = express();
vercelApp.set('trust proxy', 1);

// Serve static UI pages & assets immediately without requiring DB on initial HTML load
vercelApp.use(express.static(publicDir));
vercelApp.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});
vercelApp.get('/admin', (_req, res) => {
  res.sendFile(path.join(publicDir, 'admin.html'));
});

let apiAppPromise: Promise<Express> | null = null;

async function initApiApp(): Promise<Express> {
  if (process.env.VERCEL && !env.databaseUrl && (env.dbHost === '127.0.0.1' || env.dbHost === 'localhost')) {
    throw new Error(
      'DATABASE_URL is not configured in Vercel Environment Variables. Add a cloud MySQL DATABASE_URL (e.g. TiDB Cloud or Aiven) and redeploy.'
    );
  }

  const connectionLimit = process.env.DB_CONNECTION_LIMIT
    ? Number(process.env.DB_CONNECTION_LIMIT)
    : 2;

  const mysqlConfig = {
    databaseUrl: env.databaseUrl || undefined,
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    database: env.dbName,
    ssl: env.dbSsl,
    sslRejectUnauthorized: env.dbSslRejectUnauthorized,
    connectionLimit,
  };

  await ensureMysqlDatabase(mysqlConfig);
  const db = createMysqlClient(mysqlConfig);
  await db.ping();
  await initializeSchema(db);
  await seedDefaultsIfEmpty(db, {
    adminEmail: env.adminEmail,
    adminPassword: env.adminPassword,
    adminName: env.adminName,
  });

  return createApp({
    db,
    publicDir,
    enableLogging: false,
  });
}

function getApiApp(): Promise<Express> {
  if (!apiAppPromise) {
    apiAppPromise = initApiApp().catch((err) => {
      apiAppPromise = null;
      throw err;
    });
  }
  return apiAppPromise;
}

vercelApp.use((req, res, next) => {
  getApiApp()
    .then((apiApp) => apiApp(req, res, next))
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Database connection failed';
      console.error('[Vercel API Init Error]', err);
      res.status(503).json({
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message,
        },
      });
    });
});

export default vercelApp;

import path from 'node:path';
import type { Express, Request, Response } from 'express';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { createMysqlClient, ensureMysqlDatabase } from '../src/db/connection';
import { initializeSchema, seedDefaultsIfEmpty } from '../src/db/schema';

let appPromise: Promise<Express> | null = null;

async function initServerlessApp(): Promise<Express> {
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

  await initializeSchema(db);
  await seedDefaultsIfEmpty(db, {
    adminEmail: env.adminEmail,
    adminPassword: env.adminPassword,
    adminName: env.adminName,
  });

  return createApp({
    db,
    publicDir: path.resolve(__dirname, '..', 'public'),
    enableLogging: false,
  });
}

function getApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = initServerlessApp().catch((err) => {
      // Reset cached promise on error so subsequent requests can retry
      appPromise = null;
      throw err;
    });
  }
  return appPromise;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    const app = await getApp();
    app(req, res);
  } catch (err) {
    console.error('[Vercel Handler Init Error]', err);
    res.status(500).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Backend failed to initialize MySQL connection. Check DATABASE_URL and SSL settings.',
      },
    });
  }
}

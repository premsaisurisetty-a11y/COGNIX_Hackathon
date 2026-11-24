import { createApp } from './app';
import { env } from './config/env';
import { createMysqlClient, ensureMysqlDatabase } from './db/connection';
import { initializeSchema, seedDefaultsIfEmpty } from './db/schema';

async function bootstrap() {
  const mysqlConfig = {
    databaseUrl: env.databaseUrl || undefined,
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    database: env.dbName,
    ssl: env.dbSsl,
    sslRejectUnauthorized: env.dbSslRejectUnauthorized,
    connectionLimit: env.dbConnectionLimit,
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

  const app = createApp({ db });

  const server = app.listen(env.port, () => {
    const target = env.databaseUrl ? 'DATABASE_URL (MySQL)' : `${env.dbHost}:${env.dbPort}/${env.dbName} (MySQL)`;
    console.log(`COGNIX '26 Backend API running on http://localhost:${env.port}`);
    console.log(`Connected to MySQL: ${target}`);
  });

  async function shutdown(signal: string) {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  }

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Failed to start COGNIX \'26 Backend:', err);
  process.exit(1);
});

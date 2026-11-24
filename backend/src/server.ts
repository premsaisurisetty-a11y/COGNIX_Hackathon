import { createApp } from './app';
import { env } from './config/env';
import { MongoStore } from './db/mongoStore';

async function bootstrap() {
  if (!env.mongodbUri) {
    throw new Error('MONGODB_URI is required to start the server');
  }

  const store = new MongoStore(env.mongodbUri, env.mongodbDbName || undefined);
  await store.init();
  await store.seedDefaultsIfEmpty({
    adminEmail: env.adminEmail,
    adminPassword: env.adminPassword,
    adminName: env.adminName,
  });

  const app = createApp({ store });

  const server = app.listen(env.port, () => {
    console.log(`COGNIX '26 Backend API running on http://localhost:${env.port}`);
    console.log('Connected to MongoDB');
  });

  async function shutdown(signal: string) {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      await store.close();
      process.exit(0);
    });
  }

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

if (!process.env.VERCEL) {
  bootstrap().catch((err) => {
    console.error("Failed to start COGNIX '26 Backend:", err);
    process.exit(1);
  });
}

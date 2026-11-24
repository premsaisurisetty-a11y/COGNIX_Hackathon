import { env } from '../config/env';
import { MongoStore } from './mongoStore';

async function main() {
  if (!env.mongodbUri) {
    throw new Error('MONGODB_URI is required in .env to seed MongoDB');
  }

  const store = new MongoStore(env.mongodbUri, env.mongodbDbName || undefined);
  try {
    await store.init();
    const creds = {
      adminEmail: env.adminEmail,
      adminPassword: env.adminPassword,
      adminName: env.adminName,
    };
    await store.seedDefaultsIfEmpty(creds);
    await store.syncAdminCredentials(creds);
    console.log('MongoDB initialized and seeded successfully.');
    console.log(`Admin credentials synced: ${env.adminName} (${env.adminEmail})`);
  } finally {
    await store.close();
  }
}

main().catch((err) => {
  console.error('Failed to seed MongoDB:', err);
  process.exit(1);
});

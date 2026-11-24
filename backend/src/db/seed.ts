import { env } from '../config/env';
import { hashPassword } from '../utils/password';
import { createMysqlClient, ensureMysqlDatabase } from './connection';
import { initializeSchema, seedDefaultsIfEmpty } from './schema';

async function main() {
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

  try {
    await db.ping();
    await initializeSchema(db);
    await seedDefaultsIfEmpty(db, {
      adminEmail: env.adminEmail,
      adminPassword: env.adminPassword,
      adminName: env.adminName,
    });

    // Sync configured admin credentials on seed
    await db.execute(
      `UPDATE admins
       SET name = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP
       WHERE LOWER(email) = ?`,
      [env.adminName, hashPassword(env.adminPassword), env.adminEmail.toLowerCase()]
    );

    console.log('MySQL schema initialized and seeded successfully.');
    console.log(`Admin credentials synced: ${env.adminName} (${env.adminEmail})`);
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error('Failed to seed MySQL database:', err);
  process.exit(1);
});

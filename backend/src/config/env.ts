import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const rawDatabaseUrl = process.env.DATABASE_URL || '';
const mongoFromDatabaseUrl = rawDatabaseUrl.startsWith('mongodb') ? rawDatabaseUrl : '';

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // MongoDB Atlas / Local MongoDB configuration
  mongodbUri:
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    mongoFromDatabaseUrl ||
    (process.env.VERCEL ? '' : 'mongodb://127.0.0.1:27017/cognix_db'),
  mongodbDbName: process.env.MONGODB_DB_NAME || '',

  jwtSecret: process.env.JWT_SECRET ?? 'cognix-26-dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  adminEmail: process.env.ADMIN_EMAIL ?? '',
  adminPassword: process.env.ADMIN_PASSWORD ?? '',
  adminName: process.env.ADMIN_NAME ?? '',
};

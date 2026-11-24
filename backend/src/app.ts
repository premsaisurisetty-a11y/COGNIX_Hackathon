import path from 'node:path';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import type { DbClient } from './db/types';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { createAdminAuthRoutes } from './routes/adminAuthRoutes';
import { createAdminRoutes } from './routes/adminRoutes';
import { createPublicRoutes } from './routes/publicRoutes';
import { AdminService } from './services/adminService';
import { PortalService } from './services/portalService';
import { asyncHandler } from './utils/asyncHandler';
import { notFound } from './utils/httpError';

export interface AppOptions {
  db: DbClient;
  publicDir?: string;
  enableLogging?: boolean;
  enableRateLimit?: boolean;
}

export function createApp(options: AppOptions) {
  const app = express();
  app.set('trust proxy', 1);
  const publicDir = options.publicDir ?? path.resolve(process.cwd(), 'public');

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'"],
        },
      },
    })
  );
  app.use(
    cors({
      origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((s) => s.trim()),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  if (options.enableLogging ?? env.nodeEnv !== 'test') {
    app.use(morgan('dev'));
  }

  if (options.enableRateLimit ?? env.nodeEnv !== 'test') {
    app.use(
      '/api/admin/auth/login',
      rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 20,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many login attempts, please try again later',
          },
        },
      })
    );
  }

  const portalService = new PortalService(options.db);
  const adminService = new AdminService(options.db, portalService);

  // Serve screenshots stored persistently in MySQL uploaded_files table
  app.get(
    '/uploads/:filename',
    asyncHandler(async (req, res) => {
      const file = await portalService.getUploadedFile(req.params.filename);
      if (!file) {
        throw notFound('Uploaded file not found');
      }
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Length', String(file.data.length));
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.send(file.data);
    })
  );

  app.use(express.static(publicDir));

  app.get('/admin', (_req, res) => {
    res.sendFile(path.join(publicDir, 'admin.html'));
  });

  app.get('/', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.use('/api', createPublicRoutes(portalService));
  app.use('/api/admin/auth', createAdminAuthRoutes(adminService));
  app.use('/api/admin', createAdminRoutes(adminService, portalService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

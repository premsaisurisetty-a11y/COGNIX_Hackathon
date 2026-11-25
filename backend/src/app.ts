import path from 'node:path';
import cors from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { MongoStore } from './db/mongoStore';
import type { DataStore } from './db/types';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { createAdminAuthRoutes } from './routes/adminAuthRoutes';
import { createAdminRoutes } from './routes/adminRoutes';
import { createPublicRoutes } from './routes/publicRoutes';
import { AdminService } from './services/adminService';
import { PortalService } from './services/portalService';
import { asyncHandler } from './utils/asyncHandler';
import { notFound } from './utils/httpError';

export interface AppOptions {
  store: DataStore;
  publicDir?: string;
  enableLogging?: boolean;
  enableRateLimit?: boolean;
}

export function createApp(options: AppOptions): Express {
  const app = express();
  app.set('trust proxy', 1);
  const publicDir = options.publicDir ?? path.resolve(__dirname, '..', 'public');

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://use.typekit.net'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://use.typekit.net', 'https://p.typekit.net', 'data:'],
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
        limit: 10,
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

  // Prevent search-engine indexing & browser caching of admin pages and APIs
  app.use(['/admin', '/admin.html', '/api/admin'], (_req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
  });

  app.get('/favicon.ico', (_req, res) => {
    res.status(204).end();
  });

  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send('User-agent: *\nDisallow: /admin\nDisallow: /api/admin\n');
  });

  const portalService = new PortalService(options.store);
  const adminService = new AdminService(options.store);

  // Serve screenshots stored persistently in MongoDB uploaded_files collection
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

/**
 * Default Express app export for Vercel's Zero-Config Express runtime.
 * Serves static portal/admin files immediately and lazily connects MongoDB for API/upload routes.
 */
function createServerlessApp(): Express {
  const publicDir = path.resolve(__dirname, '..', 'public');
  const serverlessApp = express();
  serverlessApp.set('trust proxy', 1);

  serverlessApp.use(['/admin', '/admin.html', '/api/admin'], (_req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
  });

  serverlessApp.get('/favicon.ico', (_req, res) => {
    res.status(204).end();
  });

  serverlessApp.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send('User-agent: *\nDisallow: /admin\nDisallow: /api/admin\n');
  });

  serverlessApp.use(express.static(publicDir));
  serverlessApp.get('/', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
  serverlessApp.get('/admin', (_req, res) => {
    res.sendFile(path.join(publicDir, 'admin.html'));
  });

  // Never wake MongoDB for random non-API 404 probes (e.g. bots, missing assets)
  serverlessApp.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      next();
      return;
    }
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
    });
  });

  let apiAppPromise: Promise<Express> | null = null;

  async function initApiApp(): Promise<Express> {
    if (!env.mongodbUri) {
      throw new Error(
        'MONGODB_URI is not configured in Vercel Environment Variables. Add your MongoDB Atlas URI (mongodb+srv://...) and redeploy.'
      );
    }

    const store = new MongoStore(env.mongodbUri, env.mongodbDbName || undefined);
    await store.init();
    await store.seedDefaultsIfEmpty({
      adminEmail: env.adminEmail,
      adminPassword: env.adminPassword,
      adminName: env.adminName,
    });

    return createApp({
      store,
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

  serverlessApp.use((req, res, next) => {
    getApiApp()
      .then((apiApp) => apiApp(req, res, next))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'MongoDB connection failed';
        console.error('[Vercel MongoDB Init Error]', err);
        res.status(503).json({
          error: {
            code: 'DATABASE_UNAVAILABLE',
            message,
          },
        });
      });
  });

  return serverlessApp;
}

const defaultApp = createServerlessApp();
export default defaultApp;

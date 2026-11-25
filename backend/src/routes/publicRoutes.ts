import { Router } from 'express';
import type { PortalService } from '../services/portalService';
import { asyncHandler } from '../utils/asyncHandler';

export function createPublicRoutes(portalService: PortalService): Router {
  const router = Router();

  const setEdgeCache = (res: import('express').Response) => {
    res.setHeader('Cache-Control', 'public, max-age=10, s-maxage=10, stale-while-revalidate=30');
  };

  router.get(
    '/health',
    asyncHandler(async (_req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      const config = await portalService.getConfig();
      res.json({
        status: 'ok',
        event: config.eventName,
        timestamp: new Date().toISOString(),
      });
    })
  );

  router.get(
    '/portal',
    asyncHandler(async (_req, res) => {
      setEdgeCache(res);
      res.json(await portalService.getFullPortal());
    })
  );

  router.get(
    '/config',
    asyncHandler(async (_req, res) => {
      setEdgeCache(res);
      res.json(await portalService.getConfig());
    })
  );

  router.get(
    '/problems',
    asyncHandler(async (req, res) => {
      setEdgeCache(res);
      const track = typeof req.query.track === 'string' ? req.query.track : undefined;
      res.json(await portalService.getProblems({ trackFilter: track, includeUnpublished: false }));
    })
  );

  router.get(
    '/schedule',
    asyncHandler(async (_req, res) => {
      setEdgeCache(res);
      res.json(await portalService.getSchedule());
    })
  );

  router.get(
    '/results',
    asyncHandler(async (_req, res) => {
      setEdgeCache(res);
      res.json(await portalService.getResults({ includeUnpublished: false }));
    })
  );

  router.get(
    '/brief',
    asyncHandler(async (_req, res) => {
      setEdgeCache(res);
      res.json(await portalService.getBrief());
    })
  );

  router.get(
    '/faqs',
    asyncHandler(async (req, res) => {
      setEdgeCache(res);
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      res.json(await portalService.getFaqs(category));
    })
  );

  return router;
}

import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { createScreenshotUpload, generateUploadFilename } from '../middleware/upload';
import { validateBody } from '../middleware/validate';
import type { AdminService } from '../services/adminService';
import type { PortalService } from '../services/portalService';
import { asyncHandler } from '../utils/asyncHandler';
import { badRequest } from '../utils/httpError';
import {
  createBriefSectionSchema,
  createFaqSchema,
  createScheduleDaySchema,
  createScheduleItemSchema,
  createShowcaseSchema,
  createStatementSchema,
  createTrackSchema,
  togglePublishResultsSchema,
  toggleReleaseProblemsSchema,
  updateBriefSectionSchema,
  updateConfigSchema,
  updateFaqSchema,
  updateScheduleDaySchema,
  updateScheduleItemSchema,
  updateShowcaseSchema,
  updateStatementSchema,
  updateTrackSchema,
  upsertPodiumSchema,
} from '../validators/schemas';

function parsePositiveInt(raw: string, label: string): number {
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) {
    throw badRequest(`Invalid ${label}`);
  }
  return num;
}

export function createAdminRoutes(
  adminService: AdminService,
  portalService: PortalService
): Router {
  const router = Router();
  const upload = createScreenshotUpload();

  router.use(requireAdmin);

  // ---- Config & Release Toggles ----
  router.get(
    '/config',
    asyncHandler(async (_req, res) => {
      res.json(await portalService.getConfig());
    })
  );

  router.patch(
    '/config',
    validateBody(updateConfigSchema),
    asyncHandler(async (req, res) => {
      res.json(await adminService.updateConfig(req.body));
    })
  );

  router.post(
    '/toggles/release-problems',
    validateBody(toggleReleaseProblemsSchema),
    asyncHandler(async (req, res) => {
      res.json(await adminService.toggleReleaseProblems(req.body.released));
    })
  );

  router.post(
    '/toggles/publish-results',
    validateBody(togglePublishResultsSchema),
    asyncHandler(async (req, res) => {
      res.json(await adminService.togglePublishResults(req.body));
    })
  );

  // ---- Tracks & Problem Statements (always unmasked for admins) ----
  router.get(
    '/tracks',
    asyncHandler(async (_req, res) => {
      res.json(await portalService.getProblems({ includeUnpublished: true }));
    })
  );

  router.post(
    '/tracks',
    validateBody(createTrackSchema),
    asyncHandler(async (req, res) => {
      res.status(201).json(await adminService.createTrack(req.body));
    })
  );

  router.patch(
    '/tracks/:id',
    validateBody(updateTrackSchema),
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, 'track id');
      res.json(await adminService.updateTrack(id, req.body));
    })
  );

  router.delete(
    '/tracks/:id',
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, 'track id');
      await adminService.deleteTrack(id);
      res.status(204).send();
    })
  );

  router.get(
    '/statements',
    asyncHandler(async (_req, res) => {
      res.json({ items: await adminService.listStatements() });
    })
  );

  router.post(
    '/statements',
    validateBody(createStatementSchema),
    asyncHandler(async (req, res) => {
      res.status(201).json(await adminService.createStatement(req.body));
    })
  );

  router.patch(
    '/statements/:id',
    validateBody(updateStatementSchema),
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, 'statement id');
      res.json(await adminService.updateStatement(id, req.body));
    })
  );

  router.delete(
    '/statements/:id',
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, 'statement id');
      await adminService.deleteStatement(id);
      res.status(204).send();
    })
  );

  // ---- Schedule ----
  router.get(
    '/schedule',
    asyncHandler(async (_req, res) => {
      res.json(await portalService.getSchedule());
    })
  );

  router.post(
    '/schedule/days',
    validateBody(createScheduleDaySchema),
    asyncHandler(async (req, res) => {
      res.status(201).json(await adminService.createScheduleDay(req.body));
    })
  );

  router.patch(
    '/schedule/days/:id',
    validateBody(updateScheduleDaySchema),
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, 'schedule day id');
      res.json(await adminService.updateScheduleDay(id, req.body));
    })
  );

  router.delete(
    '/schedule/days/:id',
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, 'schedule day id');
      await adminService.deleteScheduleDay(id);
      res.status(204).send();
    })
  );

  router.post(
    '/schedule/days/:dayId/items',
    validateBody(createScheduleItemSchema),
    asyncHandler(async (req, res) => {
      const dayId = parsePositiveInt(req.params.dayId, 'schedule day id');
      res.status(201).json(await adminService.createScheduleItem(dayId, req.body));
    })
  );

  router.patch(
    '/schedule/items/:id',
    validateBody(updateScheduleItemSchema),
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, 'schedule item id');
      res.json(await adminService.updateScheduleItem(id, req.body));
    })
  );

  router.delete(
    '/schedule/items/:id',
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, 'schedule item id');
      await adminService.deleteScheduleItem(id);
      res.status(204).send();
    })
  );

  // ---- Results (Podium & Showcase) ----
  router.get(
    '/results',
    asyncHandler(async (_req, res) => {
      res.json(await portalService.getResults({ includeUnpublished: true }));
    })
  );

  router.put(
    '/results/podium/:rank',
    validateBody(upsertPodiumSchema),
    asyncHandler(async (req, res) => {
      const rank = parsePositiveInt(req.params.rank, 'podium rank');
      res.json(await adminService.upsertPodium(rank, req.body));
    })
  );

  router.delete(
    '/results/podium/:rank',
    asyncHandler(async (req, res) => {
      const rank = parsePositiveInt(req.params.rank, 'podium rank');
      await adminService.deletePodium(rank);
      res.status(204).send();
    })
  );

  router.post(
    '/results/showcase',
    validateBody(createShowcaseSchema),
    asyncHandler(async (req, res) => {
      res.status(201).json(await adminService.createShowcase(req.body));
    })
  );

  router.patch(
    '/results/showcase/:id',
    validateBody(updateShowcaseSchema),
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, 'showcase project id');
      res.json(await adminService.updateShowcase(id, req.body));
    })
  );

  router.delete(
    '/results/showcase/:id',
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, 'showcase project id');
      await adminService.deleteShowcase(id);
      res.status(204).send();
    })
  );

  router.post(
    '/uploads/screenshot',
    upload.single('file'),
    asyncHandler(async (req, res) => {
      if (!req.file) {
        throw badRequest('Image file is required in field "file"');
      }
      const filename = generateUploadFilename(req.file);
      const saved = await adminService.saveUploadedFile({
        filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer,
      });
      res.status(201).json(saved);
    })
  );

  // ---- Brief Sections ----
  router.get(
    '/brief',
    asyncHandler(async (_req, res) => {
      res.json(await portalService.getBrief());
    })
  );

  router.post(
    '/brief/sections',
    validateBody(createBriefSectionSchema),
    asyncHandler(async (req, res) => {
      res.status(201).json(await adminService.createBriefSection(req.body));
    })
  );

  router.patch(
    '/brief/sections/:id',
    validateBody(updateBriefSectionSchema),
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, 'brief section id');
      res.json(await adminService.updateBriefSection(id, req.body));
    })
  );

  router.delete(
    '/brief/sections/:id',
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, 'brief section id');
      await adminService.deleteBriefSection(id);
      res.status(204).send();
    })
  );

  // ---- FAQs ----
  router.get(
    '/faqs',
    asyncHandler(async (_req, res) => {
      res.json(await portalService.getFaqs());
    })
  );

  router.post(
    '/faqs',
    validateBody(createFaqSchema),
    asyncHandler(async (req, res) => {
      res.status(201).json(await adminService.createFaq(req.body));
    })
  );

  router.patch(
    '/faqs/:id',
    validateBody(updateFaqSchema),
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, 'faq id');
      res.json(await adminService.updateFaq(id, req.body));
    })
  );

  router.delete(
    '/faqs/:id',
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, 'faq id');
      await adminService.deleteFaq(id);
      res.status(204).send();
    })
  );

  return router;
}

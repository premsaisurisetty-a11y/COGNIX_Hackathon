import { Router } from 'express';
import { requireAdmin, signAdminToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import type { AdminService } from '../services/adminService';
import { asyncHandler } from '../utils/asyncHandler';
import { changePasswordSchema, loginSchema } from '../validators/schemas';

export function createAdminAuthRoutes(adminService: AdminService): Router {
  const router = Router();

  router.post(
    '/login',
    validateBody(loginSchema),
    asyncHandler(async (req, res) => {
      const identifier = req.body.username ?? req.body.email;
      const admin = await adminService.authenticate(identifier, req.body.password);
      const token = signAdminToken(admin);
      res.json({ token, admin });
    })
  );

  router.get(
    '/me',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const admin = await adminService.getAdminById(req.admin!.id);
      res.json({ admin });
    })
  );

  router.post(
    '/change-password',
    requireAdmin,
    validateBody(changePasswordSchema),
    asyncHandler(async (req, res) => {
      await adminService.changePassword(
        req.admin!.id,
        req.body.currentPassword,
        req.body.newPassword
      );
      res.json({ message: 'Password updated successfully' });
    })
  );

  return router;
}

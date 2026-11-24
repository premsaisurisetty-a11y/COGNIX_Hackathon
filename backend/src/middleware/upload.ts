import crypto from 'node:crypto';
import path from 'node:path';
import multer from 'multer';
import { badRequest } from '../utils/httpError';

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export function generateUploadFilename(file: Express.Multer.File): string {
  const ext = ALLOWED_MIME_TYPES[file.mimetype] ?? path.extname(file.originalname) ?? '.png';
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
}

export function createScreenshotUpload() {
  // Stay safely under Vercel's 4.5 MB serverless body limit when deployed on Vercel
  const maxBytes = process.env.VERCEL ? 4 * 1024 * 1024 : 5 * 1024 * 1024;
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_MIME_TYPES[file.mimetype]) {
        cb(badRequest('Only PNG, JPEG, WEBP, and GIF images are allowed'));
        return;
      }
      cb(null, true);
    },
  });
}

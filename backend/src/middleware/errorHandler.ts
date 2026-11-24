import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    res.status(400).json({
      error: {
        code: 'UPLOAD_ERROR',
        message: err.message,
      },
    });
    return;
  }

  // Handle MySQL (mysql2) error codes
  if (err && typeof err === 'object' && 'code' in err) {
    const mysqlCode = String((err as { code?: unknown }).code ?? '');
    if (mysqlCode === 'ER_DUP_ENTRY') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'A record with that unique value already exists',
        },
      });
      return;
    }
    if (mysqlCode === 'ER_NO_REFERENCED_ROW_2' || mysqlCode === 'ER_ROW_IS_REFERENCED_2') {
      res.status(400).json({
        error: {
          code: 'INVALID_REFERENCE',
          message: 'Referenced parent record does not exist',
        },
      });
      return;
    }
  }

  // Handle in-memory SQLite test adapter constraint errors
  if (err && typeof err === 'object' && 'errcode' in err) {
    const message = err instanceof Error ? err.message : 'Database error';
    if (message.includes('UNIQUE constraint failed')) {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'A record with that unique value already exists',
        },
      });
      return;
    }
    if (message.includes('FOREIGN KEY constraint failed')) {
      res.status(400).json({
        error: {
          code: 'INVALID_REFERENCE',
          message: 'Referenced parent record does not exist',
        },
      });
      return;
    }
  }

  console.error('[Unhandled Error]', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}

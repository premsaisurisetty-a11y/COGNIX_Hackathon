import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { badRequest } from '../utils/httpError';

export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(
        badRequest(
          'Request validation failed',
          result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          }))
        )
      );
      return;
    }
    req.body = result.data;
    next();
  };
}

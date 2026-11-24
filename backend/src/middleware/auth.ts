import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { unauthorized } from '../utils/httpError';

export interface AdminTokenPayload {
  sub: number;
  email: string;
  name: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: number;
        email: string;
        name: string;
        role: string;
      };
    }
  }
}

export function signAdminToken(admin: {
  id: number;
  email: string;
  name: string;
  role: string;
}): string {
  const payload: AdminTokenPayload = {
    sub: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  };
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(unauthorized('Missing or invalid Authorization header'));
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as unknown as AdminTokenPayload;
    if (typeof decoded.sub !== 'number' || typeof decoded.email !== 'string') {
      next(unauthorized('Invalid token payload'));
      return;
    }
    req.admin = {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    };
    next();
  } catch {
    next(unauthorized('Invalid or expired token'));
  }
}

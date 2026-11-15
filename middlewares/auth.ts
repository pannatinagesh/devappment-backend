import type { NextFunction, Request, Response } from 'express';
import { BackendError, getStatusFromErrorCode } from '@/controllers/user.js';
import { verifyAccessToken, type JWTObject } from '@/utils/jwt.js';

// Augment Express's Request so downstream handlers can read the authenticated user.
declare global {
  // eslint-disable-next-line ts/no-namespace
  namespace Express {
    interface Request {
      user?: JWTObject;
    }
  }
}

/** Pulls the access token from the Authorization: Bearer header or the accessToken cookie. */
export function extractAccessToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }
  const cookieToken = req.cookies?.accessToken;
  return typeof cookieToken === 'string' && cookieToken.length > 0 ? cookieToken : undefined;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractAccessToken(req);
    if (!token) {
      return res.status(401).json({
        status: false,
        message: 'Access token is required',
        code: 'UNAUTHORIZED',
      });
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;
    return next();
  }
  catch (err) {
    if (err instanceof BackendError) {
      return res.status(getStatusFromErrorCode(err.code)).json({
        status: false,
        message: err.message,
        code: err.code,
      });
    }
    return res.status(401).json({
      status: false,
      message: 'Invalid access token',
      code: 'UNAUTHORIZED',
    });
  }
}

export const getUserId = (req: Request): number | null => {
    const id = Number(req.user?.userId);
    return Number.isInteger(id) && id > 0 ? id : null;
}
import process from 'node:process';
import JWT from 'jsonwebtoken';
import { z } from 'zod';
import { BackendError } from '@/controllers/user.js';

export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!;
export const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY!;
export const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY!;
export const WEB_PAGE_ACCESS_TOKEN_SECRET = process.env.WEB_PAGE_ACCESS_TOKEN_SECRET!;
export const SHORT_TOKEN_SECRET = process.env.SHORT_TOKEN_SECRET!;
export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;

type ExpiresIn = JWT.SignOptions['expiresIn'];

const ACCESS_TOKEN_CONFIG: JWT.SignOptions = {
  expiresIn: ACCESS_TOKEN_EXPIRY as ExpiresIn,
};

const REFRESH_TOKEN_CONFIG: JWT.SignOptions = {
  expiresIn: REFRESH_TOKEN_EXPIRY as ExpiresIn,
};

const WEB_PAGE_REFRESH_TOKEN_CONFIG: JWT.SignOptions = {
  expiresIn: REFRESH_TOKEN_EXPIRY as ExpiresIn,
};

export const jwtObjectSchema = z.object({
  userId: z.string().optional(),
  actorType: z.enum(['USER']).optional(),
});

export type JWTObject = z.infer<typeof jwtObjectSchema>;

/**
 * The session claims of a decoded token (every jwtObjectSchema field it carries), so a
 * token can be re-issued with exactly what login put in it. The registered iat/exp
 * claims are left out because jwt.sign rejects a payload with exp when expiresIn is set.
 */
export function pickSessionClaims(decoded: JWTObject): JWTObject {
  const claims: Record<string, unknown> = {};
  for (const key of Object.keys(jwtObjectSchema.shape)) {
    const value = (decoded as Record<string, unknown>)[key];
    if (value !== undefined) claims[key] = value;
  }
  return claims as JWTObject;
}

export function generateAccessToken(jwtObject: JWTObject): string {
  return JWT.sign(jwtObject, ACCESS_TOKEN_SECRET, ACCESS_TOKEN_CONFIG);
}

export function generateShortLivedToken(payload: any): string {
  return JWT.sign(payload, process.env.SHORT_TOKEN_SECRET!, {
    expiresIn: "5m",
  });
}

export function generateRefreshToken(jwtObject: JWTObject): string {
  return JWT.sign(jwtObject, REFRESH_TOKEN_SECRET, REFRESH_TOKEN_CONFIG);
}
export function generateToken(jwtObject: JWTObject): string {
  return JWT.sign(jwtObject, WEB_PAGE_ACCESS_TOKEN_SECRET, WEB_PAGE_REFRESH_TOKEN_CONFIG);
}

export function verifyAccessToken(token: string): JWTObject {
  try {
    return JWT.verify(token, ACCESS_TOKEN_SECRET) as JWTObject;
  }
  catch (err) {
    if (err instanceof JWT.TokenExpiredError) {
      throw new BackendError('UNAUTHORIZED', {
        message: 'Access token expired',
      });
    }

    throw new BackendError('UNAUTHORIZED', {
      message: 'Invalid access token',
    });
  }
}


export function verifyShortLivedToken(token: string): { userId: string; email?: string } {
  try {
    const decoded = JWT.verify(token, SHORT_TOKEN_SECRET) as any;

    if (!decoded || !decoded.userId) {
      throw new BackendError("UNAUTHORIZED", {
        message: "Invalid short-lived token",
      });
    }

    return decoded;

  } catch (err: any) {

    if (err instanceof JWT.TokenExpiredError) {
      throw new BackendError("UNAUTHORIZED", {
        message: "Short-lived token expired",
      });
    }

    throw new BackendError("UNAUTHORIZED", {
      message: "Invalid short-lived token",
    });
  }
}

export function verifyWebPageAccessToken(token: string): JWTObject {
  try {
    return JWT.verify(token, WEB_PAGE_ACCESS_TOKEN_SECRET) as JWTObject;
  }
  catch (err) {
    if (err instanceof JWT.TokenExpiredError) {
      throw new BackendError('UNAUTHORIZED', {
        message: 'Access token expired',
      });
    }

    throw new BackendError('UNAUTHORIZED', {
      message: 'Invalid access token',
    });
  }
}

export function readSessionClaimsForLogout(accessToken?: string, refreshToken?: string): JWTObject | null {
  const candidates: [string | undefined, string][] = [
    [accessToken, ACCESS_TOKEN_SECRET],
    [refreshToken, REFRESH_TOKEN_SECRET],
  ];
  for (const [token, secret] of candidates) {
    if (!token) continue;
    try {
      return JWT.verify(token, secret, { ignoreExpiration: true }) as JWTObject;
    }
    catch {
      // Not signed by us: try the other cookie.
    }
  }
  return null;
}

export function verifyRefreshToken(token: string): JWTObject {
  try {
    return JWT.verify(token, REFRESH_TOKEN_SECRET) as JWTObject;
  }
  catch (err) {
    if (err instanceof JWT.TokenExpiredError) {
      throw new BackendError('UNAUTHORIZED', {
        message: 'Refresh token expired',
      });
    }

    throw new BackendError('UNAUTHORIZED', {
      message: 'Invalid refresh token',
    });
  }
}
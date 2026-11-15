import process from 'node:process';
import type { CookieOptions, Response } from 'express';

type SameSite = 'lax' | 'strict' | 'none';

export function checkIsNotLocal(): boolean {
  return process.env.ENV !== 'local' && process.env.ENV !== 'dev' && process.env.ENV !== 'demo';
}

export function authCookieSameSite(): SameSite {
  const configured = (process.env.COOKIE_SAME_SITE ?? '').trim().toLowerCase();
  if (configured === 'strict') return 'strict';
  if (configured === 'none' && checkIsNotLocal()) return 'none';
  return 'lax';
}

export function authCookieOptions(maxAge: number): CookieOptions {
  return {
    path: '/',
    httpOnly: true,
    secure: checkIsNotLocal(),
    sameSite: authCookieSameSite(),
    maxAge,
  };
}

/** Sets both session cookies with the same attributes on every sign-in and refresh path. */
export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('accessToken', accessToken, authCookieOptions(Number(process.env.COOKIE_ACCESS_TOKEN_EXPIRY)));
  res.cookie('refreshToken', refreshToken, authCookieOptions(Number(process.env.COOKIE_REFRESH_TOKEN_EXPIRY)));
}

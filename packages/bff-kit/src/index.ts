import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';

/** Shared session cookies — same name across BFFs so login is org-wide SSO on one host. */
export const AT_COOKIE = 'nebula_at';
export const RT_COOKIE = 'nebula_rt';

export function cookieOptions(secure: boolean) {
  return { httpOnly: true, sameSite: 'lax' as const, secure, path: '/' };
}

/** Bearer access token from the httpOnly cookie, or 401. */
export function bearerFrom(req: Request): string {
  const token = (req.cookies as Record<string, string> | undefined)?.[AT_COOKIE];
  if (!token) throw new UnauthorizedException('not authenticated');
  return token;
}

/** Decode a JWT payload (no verification — display only; the upstream verifies). */
export function decodeJwt(token: string): Record<string, unknown> | null {
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

/** Forward a request to an upstream service with the user's bearer; pipe the response. */
export async function forward(
  res: Response,
  opts: { base: string; path: string; method: string; bearer: string; body?: unknown },
): Promise<void> {
  const r = await fetch(`${opts.base}${opts.path}`, {
    method: opts.method,
    headers: {
      authorization: `Bearer ${opts.bearer}`,
      ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await r.text();
  res.status(r.status);
  res.setHeader('content-type', r.headers.get('content-type') ?? 'application/json');
  res.send(text);
}

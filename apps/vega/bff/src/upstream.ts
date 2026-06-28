import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AT_COOKIE } from './config.js';

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

/** Forward a JSON request to vega-storage with the user's bearer; pipe the response. */
export async function forward(
  res: Response,
  opts: {
    base: string;
    path: string;
    method: string;
    bearer: string;
    body?: unknown;
  },
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

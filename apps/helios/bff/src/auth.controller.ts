import { AT_COOKIE, RT_COOKIE, bearerFrom, cookieOptions, decodeJwt } from '@nebula/bff-kit';
import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ENV, type HeliosBffEnv } from './config.js';

const LoginDto = z.object({ username: z.string().min(1), password: z.string().min(1) });

@Controller('api/auth')
export class AuthController {
  constructor(@Inject(ENV) private readonly env: HeliosBffEnv) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() raw: unknown, @Res({ passthrough: true }) res: Response) {
    const dto = LoginDto.parse(raw);
    const r = await fetch(`${this.env.ATLAS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!r.ok) {
      res.status(401);
      return { error: 'invalid credentials' };
    }
    const tokens = (await r.json()) as { accessToken: string; refreshToken: string };
    res.cookie(AT_COOKIE, tokens.accessToken, cookieOptions(this.env.COOKIE_SECURE));
    res.cookie(RT_COOKIE, tokens.refreshToken, cookieOptions(this.env.COOKIE_SECURE));
    const claims = decodeJwt(tokens.accessToken) ?? {};
    return {
      ok: true,
      user: { sub: claims.sub, org_id: claims.org_id, roles: claims.roles ?? [] },
    };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AT_COOKIE, { path: '/' });
    res.clearCookie(RT_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  me(@Req() req: Request) {
    const claims = decodeJwt(bearerFrom(req)) ?? {};
    return { sub: claims.sub, org_id: claims.org_id, roles: claims.roles ?? [] };
  }
}

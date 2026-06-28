import { bearerFrom, forward } from '@nebula/bff-kit';
import { Controller, Get, Inject, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ENV, type HeliosBffEnv } from './config.js';

/** The Nébula app launcher. Vega is live in F1; others are sequenced by the roadmap. */
const APPS = [
  { id: 'vega', name: 'Vega', desc: 'Drive', url: 'http://localhost:3000', status: 'live' },
  { id: 'lyra', name: 'Lyra', desc: 'Docs', url: '', status: 'soon' },
  { id: 'cosmos', name: 'Cosmos', desc: 'Wiki', url: '', status: 'soon' },
  { id: 'pulsar', name: 'Pulsar', desc: 'Chat', url: '', status: 'soon' },
  { id: 'iris', name: 'Iris', desc: 'Mail', url: '', status: 'soon' },
  { id: 'cronos', name: 'Cronos', desc: 'Calendar', url: '', status: 'soon' },
];

@Controller('api')
export class DashboardController {
  constructor(@Inject(ENV) private readonly env: HeliosBffEnv) {}

  @Get('apps')
  apps() {
    return APPS;
  }

  /** Global search — files only for F1 (via vega-storage). Wiki/docs join in F2. */
  @Get('search')
  search(@Req() req: Request, @Res() res: Response, @Query('q') q?: string) {
    return forward(res, {
      base: this.env.VEGA_STORAGE_URL,
      path: `/files/search?q=${encodeURIComponent(q ?? '')}`,
      method: 'GET',
      bearer: bearerFrom(req),
    });
  }

  /** Notifications — stub until nucleo-notifications (F4). Returns an empty feed. */
  @Get('notifications')
  notifications(@Req() req: Request) {
    bearerFrom(req); // require auth
    return [];
  }
}

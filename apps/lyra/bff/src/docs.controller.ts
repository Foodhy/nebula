import { bearerFrom, forward } from '@nebula/bff-kit';
import { Body, Controller, Get, Inject, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ENV, type LyraBffEnv } from './config.js';

/** Proxies document REST to lyra-collab with the user's bearer (from the cookie). */
@Controller('api/docs')
export class DocsController {
  constructor(@Inject(ENV) private readonly env: LyraBffEnv) {}

  private get base() {
    return this.env.LYRA_COLLAB_URL;
  }

  @Post()
  create(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    return forward(res, {
      base: this.base,
      path: '/docs',
      method: 'POST',
      bearer: bearerFrom(req),
      body,
    });
  }

  @Get(':id')
  get(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return forward(res, {
      base: this.base,
      path: `/docs/${id}`,
      method: 'GET',
      bearer: bearerFrom(req),
    });
  }

  @Post(':id/snapshot')
  snapshot(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return forward(res, {
      base: this.base,
      path: `/docs/${id}/snapshot`,
      method: 'POST',
      bearer: bearerFrom(req),
      body: body ?? {},
    });
  }
}

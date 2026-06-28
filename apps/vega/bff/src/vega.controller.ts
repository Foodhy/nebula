import { bearerFrom, forward } from '@nebula/bff-kit';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import type { VegaBffEnv } from './config.js';
import { ENV } from './tokens.js';

interface UploadedFileT {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

@Controller('api')
export class VegaController {
  constructor(@Inject(ENV) private readonly env: VegaBffEnv) {}

  private get base() {
    return this.env.VEGA_STORAGE_URL;
  }

  @Get('folders/:id/children')
  folderChildren(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return forward(res, {
      base: this.base,
      path: `/folders/${id}/children`,
      method: 'GET',
      bearer: bearerFrom(req),
    });
  }

  @Post('folders')
  createFolder(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    return forward(res, {
      base: this.base,
      path: '/folders',
      method: 'POST',
      bearer: bearerFrom(req),
      body,
    });
  }

  /** Upload: bytes flow web → bff → MinIO (presigned), keeping MinIO off the browser. */
  @Post('files')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: UploadedFileT | undefined,
    @Body() body: { parentFolderId?: string },
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('file is required');
    const bearer = bearerFrom(req);

    const initRes = await fetch(`${this.base}/files/upload-init`, {
      method: 'POST',
      headers: { authorization: `Bearer ${bearer}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        name: file.originalname,
        mimeType: file.mimetype || 'application/octet-stream',
        parentFolderId: body.parentFolderId ?? null,
      }),
    });
    if (!initRes.ok) throw new BadRequestException(`upload-init failed: ${initRes.status}`);
    const init = (await initRes.json()) as { fileId: string; uploadUrl: string };

    const put = await fetch(init.uploadUrl, { method: 'PUT', body: file.buffer });
    if (!put.ok) throw new BadRequestException(`storage PUT failed: ${put.status}`);

    const done = await fetch(`${this.base}/files/${init.fileId}/upload-complete`, {
      method: 'POST',
      headers: { authorization: `Bearer ${bearer}` },
    });
    if (!done.ok) throw new BadRequestException(`upload-complete failed: ${done.status}`);
    return done.json();
  }

  @Get('files/:id')
  getFile(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return forward(res, {
      base: this.base,
      path: `/files/${id}`,
      method: 'GET',
      bearer: bearerFrom(req),
    });
  }

  @Get('files/:id/content')
  content(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return forward(res, {
      base: this.base,
      path: `/files/${id}/content`,
      method: 'GET',
      bearer: bearerFrom(req),
    });
  }

  @Get('files/:id/versions')
  versions(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return forward(res, {
      base: this.base,
      path: `/files/${id}/versions`,
      method: 'GET',
      bearer: bearerFrom(req),
    });
  }

  @Post('files/:id/restore/:no')
  restore(
    @Param('id') id: string,
    @Param('no') no: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return forward(res, {
      base: this.base,
      path: `/files/${id}/restore/${no}`,
      method: 'POST',
      bearer: bearerFrom(req),
    });
  }

  @Patch('files/:id')
  patch(@Param('id') id: string, @Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    return forward(res, {
      base: this.base,
      path: `/files/${id}`,
      method: 'PATCH',
      bearer: bearerFrom(req),
      body,
    });
  }

  @Delete('files/:id')
  trash(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return forward(res, {
      base: this.base,
      path: `/files/${id}`,
      method: 'DELETE',
      bearer: bearerFrom(req),
    });
  }

  @Post('shares')
  share(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    return forward(res, {
      base: this.base,
      path: '/shares',
      method: 'POST',
      bearer: bearerFrom(req),
      body,
    });
  }
}

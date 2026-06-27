import { CurrentUser, JwtAuthGuard } from '@nebula/nucleo-auth';
import type { AuthContext } from '@nebula/nucleo-auth';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { z } from 'zod';
import { FilesService } from '../application/files.service.js';
import { PatchFileDto, UploadInitDto } from './dto.js';
import { ZodBody } from './zod.pipe.js';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly files: FilesService) {}

  private ctx(user?: AuthContext): { orgId: string; userId: string } {
    if (!user) throw new BadRequestException('missing auth context');
    return { orgId: user.orgId, userId: user.userId };
  }

  @Post('upload-init')
  uploadInit(
    @Body(new ZodBody(UploadInitDto)) dto: z.infer<typeof UploadInitDto>,
    @CurrentUser() user?: AuthContext,
  ) {
    const { orgId, userId } = this.ctx(user);
    return this.files.uploadInit(orgId, userId, dto);
  }

  @Post(':id/upload-complete')
  uploadComplete(@Param('id') id: string, @CurrentUser() user?: AuthContext) {
    const { orgId, userId } = this.ctx(user);
    return this.files.uploadComplete(orgId, userId, id);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user?: AuthContext) {
    const { orgId, userId } = this.ctx(user);
    return this.files.get(orgId, userId, id);
  }

  @Get(':id/content')
  async content(@Param('id') id: string, @CurrentUser() user?: AuthContext) {
    const { orgId, userId } = this.ctx(user);
    return { url: await this.files.contentUrl(orgId, userId, id) };
  }

  @Get(':id/versions')
  versions(@Param('id') id: string, @CurrentUser() user?: AuthContext) {
    const { orgId, userId } = this.ctx(user);
    return this.files.listVersions(orgId, userId, id);
  }

  @Post(':id/restore/:versionNo')
  restore(
    @Param('id') id: string,
    @Param('versionNo', ParseIntPipe) versionNo: number,
    @CurrentUser() user?: AuthContext,
  ) {
    const { orgId, userId } = this.ctx(user);
    return this.files.restore(orgId, userId, id, versionNo);
  }

  @Patch(':id')
  patch(
    @Param('id') id: string,
    @Body(new ZodBody(PatchFileDto)) dto: z.infer<typeof PatchFileDto>,
    @CurrentUser() user?: AuthContext,
  ) {
    const { orgId, userId } = this.ctx(user);
    return this.files.patch(orgId, userId, id, dto);
  }

  @Delete(':id')
  trash(@Param('id') id: string, @CurrentUser() user?: AuthContext) {
    const { orgId, userId } = this.ctx(user);
    return this.files.trash(orgId, userId, id);
  }
}

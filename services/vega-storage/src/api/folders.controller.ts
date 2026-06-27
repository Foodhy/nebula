import { CurrentUser, JwtAuthGuard } from '@nebula/nucleo-auth';
import type { AuthContext } from '@nebula/nucleo-auth';
import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { z } from 'zod';
import { FoldersService } from '../application/folders.service.js';
import { CreateFolderDto } from './dto.js';
import { ZodBody } from './zod.pipe.js';

@Controller('folders')
@UseGuards(JwtAuthGuard)
export class FoldersController {
  constructor(private readonly folders: FoldersService) {}

  private ctx(user?: AuthContext): { orgId: string; userId: string } {
    if (!user) throw new BadRequestException('missing auth context');
    return { orgId: user.orgId, userId: user.userId };
  }

  @Post()
  create(
    @Body(new ZodBody(CreateFolderDto)) dto: z.infer<typeof CreateFolderDto>,
    @CurrentUser() user?: AuthContext,
  ) {
    const { orgId, userId } = this.ctx(user);
    return this.folders.create(orgId, userId, dto);
  }

  @Get(':id/children')
  children(@Param('id') id: string, @CurrentUser() user?: AuthContext) {
    const { orgId } = this.ctx(user);
    // 'root' lists the org's top-level (parent_folder_id IS NULL).
    return this.folders.listChildren(orgId, id === 'root' ? null : id);
  }
}

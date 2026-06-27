import { CurrentUser, JwtAuthGuard } from '@nebula/nucleo-auth';
import type { AuthContext } from '@nebula/nucleo-auth';
import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import type { z } from 'zod';
import { SharesService } from '../application/shares.service.js';
import { CreateShareDto } from './dto.js';
import { ZodBody } from './zod.pipe.js';

@Controller('shares')
@UseGuards(JwtAuthGuard)
export class SharesController {
  constructor(private readonly shares: SharesService) {}

  @Post()
  create(
    @Body(new ZodBody(CreateShareDto)) dto: z.infer<typeof CreateShareDto>,
    @CurrentUser() user?: AuthContext,
  ) {
    if (!user) throw new BadRequestException('missing auth context');
    return this.shares.create(user.orgId, user.userId, dto);
  }
}

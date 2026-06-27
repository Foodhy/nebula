import { OrgId } from '@nebula/nucleo-auth';
import { JwtAuthGuard } from '@nebula/nucleo-auth';
import { assertOrgAccess } from '@nebula/security';
import { CrossTenantAccessError } from '@nebula/security';
import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { z } from 'zod';
import { AuthService } from '../application/auth.service.js';
import { InviteDto } from './dto.js';
import { ZodBody } from './zod.pipe.js';

/**
 * Org membership endpoints. Guarded by JWT; the caller may only act on their OWN
 * org — the path :id is checked against the org_id from the validated token.
 */
@Controller('orgs')
@UseGuards(JwtAuthGuard)
export class OrgsController {
  constructor(private readonly auth: AuthService) {}

  private guardOrg(tokenOrgId: string | undefined, pathOrgId: string): void {
    try {
      assertOrgAccess(tokenOrgId ?? '', pathOrgId);
    } catch (e) {
      if (e instanceof CrossTenantAccessError) throw new ForbiddenException(e.message);
      throw e;
    }
  }

  @Get(':id/members')
  members(@Param('id') id: string, @OrgId() tokenOrgId?: string) {
    this.guardOrg(tokenOrgId, id);
    return this.auth.listMembers(id);
  }

  @Post(':id/invite')
  invite(
    @Param('id') id: string,
    @Body(new ZodBody(InviteDto)) dto: z.infer<typeof InviteDto>,
    @OrgId() tokenOrgId?: string,
  ) {
    this.guardOrg(tokenOrgId, id);
    return this.auth.invite({ orgId: id, ...dto });
  }
}

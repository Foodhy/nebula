import { CurrentUser, JwtAuthGuard } from '@nebula/nucleo-auth';
import type { AuthContext } from '@nebula/nucleo-auth';
import { Controller, HttpCode, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from '../application/auth.service.js';

/**
 * MFA enrollment. Guarded by JWT; enrolls the CALLER's own user (sub from the
 * token) — never a client-supplied id (CLAUDE.md rule #2).
 */
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class MfaController {
  constructor(private readonly auth: AuthService) {}

  @Post('mfa/enroll')
  @HttpCode(202)
  async enroll(@CurrentUser() user?: AuthContext): Promise<{ status: string }> {
    if (!user) throw new UnauthorizedException();
    await this.auth.enrollMfa(user.userId);
    return { status: 'totp_enrollment_required' };
  }
}

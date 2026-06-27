import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { extractBearerToken } from '../application/token.js';
import { AUTH_VERIFIER, type TokenVerifier } from '../application/verifier.js';
import { toAuthContext } from '../domain/auth-context.js';

/**
 * Validates the bearer JWT and attaches an AuthContext to the request.
 * The org_id/userId come ONLY from the verified token — request body/headers
 * are never consulted for identity (CLAUDE.md hard rule #2).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(AUTH_VERIFIER) private readonly verify: TokenVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers?: { authorization?: string };
      authContext?: unknown;
    }>();

    const token = extractBearerToken(req.headers?.authorization);
    if (!token) throw new UnauthorizedException('Missing bearer token');

    try {
      const claims = await this.verify(token);
      // Authoritative identity — overwrites anything a client may have set.
      req.authContext = toAuthContext(claims);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
    return true;
  }
}

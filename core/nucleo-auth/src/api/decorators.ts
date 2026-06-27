import { type ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { AuthContext } from '../domain/auth-context.js';

/** Inject the full AuthContext (from the validated JWT). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext | undefined =>
    ctx.switchToHttp().getRequest<{ authContext?: AuthContext }>().authContext,
);

/** Inject the org_id from the validated JWT — the only trusted source of org_id. */
export const OrgId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined =>
    ctx.switchToHttp().getRequest<{ authContext?: AuthContext }>().authContext?.orgId,
);

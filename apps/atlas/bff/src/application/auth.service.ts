import { Inject, Injectable } from '@nestjs/common';
import type {
  InviteInput,
  Member,
  OrgWithOwner,
  RegisterInput,
  Tokens,
} from '../domain/identity.js';
import { EVENT_PUBLISHER, type EventPublisher } from './events.port.js';
import { IDENTITY_PROVIDER, type IdentityProvider } from './identity-provider.port.js';

/**
 * Atlas use-cases. Delegates identity to the IdentityProvider (Keycloak) and
 * publishes domain events for side effects (audit, search, notifications).
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(IDENTITY_PROVIDER) private readonly idp: IdentityProvider,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async register(input: RegisterInput): Promise<OrgWithOwner> {
    const result = await this.idp.registerOrgWithOwner(input);
    const occurredAt = new Date().toISOString();
    await this.events.publish('org.created', {
      type: 'org.created',
      orgId: result.orgId,
      occurredAt,
      payload: { orgId: result.orgId, name: input.orgName },
    });
    await this.events.publish('user.created', {
      type: 'user.created',
      orgId: result.orgId,
      occurredAt,
      payload: { userId: result.userId, role: 'owner' },
    });
    return result;
  }

  login(username: string, password: string): Promise<Tokens> {
    return this.idp.login(username, password);
  }

  refresh(refreshToken: string): Promise<Tokens> {
    return this.idp.refresh(refreshToken);
  }

  async invite(input: InviteInput): Promise<string> {
    const userId = await this.idp.invite(input);
    await this.events.publish('user.created', {
      type: 'user.created',
      orgId: input.orgId,
      occurredAt: new Date().toISOString(),
      payload: { userId, role: input.role },
    });
    return userId;
  }

  listMembers(orgId: string): Promise<Member[]> {
    return this.idp.listMembers(orgId);
  }

  enrollMfa(userId: string): Promise<void> {
    return this.idp.enrollMfa(userId);
  }
}

import type { Role } from '@nebula/types';
import type { IdentityProvider } from '../application/identity-provider.port.js';
import type {
  InviteInput,
  Member,
  OrgWithOwner,
  RegisterInput,
  Tokens,
} from '../domain/identity.js';

export interface KeycloakConfig {
  baseUrl: string;
  realm: string;
  clientId: string;
  clientSecret: string;
}

interface KcTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface KcUser {
  id: string;
  username: string;
  email?: string;
}

/**
 * Keycloak REST adapter. Authenticates to the Admin API with the nebula-apps
 * service account (client credentials). Maps Nébula concepts to Keycloak:
 *   org  -> group (group id IS the org_id)
 *   user -> realm user with an `org_id` attribute + a realm role
 * Keycloak handles Argon2id password hashing — Atlas never sees a stored password.
 */
export class KeycloakHttpAdapter implements IdentityProvider {
  constructor(private readonly cfg: KeycloakConfig) {}

  private get tokenUrl(): string {
    return `${this.cfg.baseUrl}/realms/${this.cfg.realm}/protocol/openid-connect/token`;
  }
  private get adminUrl(): string {
    return `${this.cfg.baseUrl}/admin/realms/${this.cfg.realm}`;
  }

  private async adminToken(): Promise<string> {
    const res = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.cfg.clientId,
        client_secret: this.cfg.clientSecret,
      }),
    });
    if (!res.ok) throw new Error(`Keycloak admin token failed: ${res.status}`);
    return ((await res.json()) as KcTokenResponse).access_token;
  }

  private async admin<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<{ res: Response; body?: T }> {
    const token = await this.adminToken();
    const res = await fetch(`${this.adminUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
    const text = await res.text();
    const body = text ? (JSON.parse(text) as T) : undefined;
    return { res, body };
  }

  /** POST that returns the created resource id from the Location header. */
  private async createReturningId(path: string, payload: unknown): Promise<string> {
    const token = await this.adminToken();
    const res = await fetch(`${this.adminUrl}${path}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok)
      throw new Error(`Keycloak create ${path} failed: ${res.status} ${await res.text()}`);
    const location = res.headers.get('location');
    const id = location?.split('/').pop();
    if (!id) throw new Error(`Keycloak create ${path}: no id in Location`);
    return id;
  }

  private async assignRealmRole(userId: string, role: Role): Promise<void> {
    const { res, body } = await this.admin<{ id: string; name: string }>(`/roles/${role}`);
    if (!res.ok || !body) throw new Error(`Keycloak role ${role} not found: ${res.status}`);
    const assign = await this.admin(`/users/${userId}/role-mappings/realm`, {
      method: 'POST',
      body: JSON.stringify([{ id: body.id, name: body.name }]),
    });
    if (!assign.res.ok) throw new Error(`Assign role ${role} failed: ${assign.res.status}`);
  }

  private async addToGroup(userId: string, groupId: string): Promise<void> {
    const { res } = await this.admin(`/users/${userId}/groups/${groupId}`, { method: 'PUT' });
    if (!res.ok) throw new Error(`Add user to group failed: ${res.status}`);
  }

  private async createUser(params: {
    username: string;
    email: string;
    orgId: string;
    password: string;
    temporary: boolean;
  }): Promise<string> {
    return this.createReturningId('/users', {
      username: params.username,
      email: params.email,
      enabled: true,
      emailVerified: true,
      attributes: { org_id: [params.orgId] },
      credentials: [{ type: 'password', value: params.password, temporary: params.temporary }],
    });
  }

  async registerOrgWithOwner(input: RegisterInput): Promise<OrgWithOwner> {
    // Org = Keycloak group; its id becomes the org_id.
    const orgId = await this.createReturningId('/groups', {
      name: `org-${input.orgName}`,
      attributes: { display_name: [input.orgName] },
    });
    const userId = await this.createUser({
      username: input.username,
      email: input.email,
      orgId,
      password: input.password,
      temporary: false,
    });
    await this.assignRealmRole(userId, 'owner');
    await this.addToGroup(userId, orgId);
    return { orgId, userId };
  }

  private async token(body: Record<string, string>): Promise<Tokens> {
    const res = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.cfg.clientId,
        client_secret: this.cfg.clientSecret,
        scope: 'openid',
        ...body,
      }),
    });
    if (!res.ok) throw new Error(`Keycloak token grant failed: ${res.status}`);
    const t = (await res.json()) as KcTokenResponse;
    return {
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      expiresIn: t.expires_in,
      tokenType: t.token_type,
    };
  }

  login(username: string, password: string): Promise<Tokens> {
    return this.token({ grant_type: 'password', username, password });
  }

  refresh(refreshToken: string): Promise<Tokens> {
    return this.token({ grant_type: 'refresh_token', refresh_token: refreshToken });
  }

  async invite(input: InviteInput): Promise<string> {
    const userId = await this.createUser({
      username: input.username,
      email: input.email,
      orgId: input.orgId,
      password: input.temporaryPassword,
      temporary: true,
    });
    await this.assignRealmRole(userId, input.role);
    await this.addToGroup(userId, input.orgId);
    return userId;
  }

  async listMembers(orgId: string): Promise<Member[]> {
    // Keycloak attribute search: q=org_id:<value>
    const { res, body } = await this.admin<KcUser[]>(
      `/users?q=${encodeURIComponent(`org_id:${orgId}`)}&max=1000`,
    );
    if (!res.ok || !body) throw new Error(`List members failed: ${res.status}`);
    return Promise.all(
      body.map(async (u) => ({
        userId: u.id,
        username: u.username,
        email: u.email ?? null,
        roles: await this.userRealmRoles(u.id),
      })),
    );
  }

  private async userRealmRoles(userId: string): Promise<Role[]> {
    const { res, body } = await this.admin<{ name: string }[]>(
      `/users/${userId}/role-mappings/realm`,
    );
    if (!res.ok || !body) return [];
    const known: Role[] = ['owner', 'admin', 'member', 'guest'];
    return body.map((r) => r.name).filter((n): n is Role => (known as string[]).includes(n));
  }
}

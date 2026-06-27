/**
 * Reusable cross-tenant isolation scaffold.
 *
 * Mints two isolated organizations (each with an owner + token) against the dev
 * Keycloak, so any service's integration test can prove org A cannot touch org
 * B's resources. This is the canonical helper referenced by the MANDATORY
 * cross-tenant isolation test (docs/08-testing.md) — import it from service tests.
 *
 * Standalone on purpose (only `fetch`) so it does not couple service tests to the
 * Atlas app package. Requires the infra/compose deps stack running.
 *
 * Example (in a service test):
 *   const { a, b } = await provisionTwoTenants();
 *   // call your API as tenant A, asking for one of B's resources -> expect 403/empty
 *   await assertCannotReadOtherTenant(() => api.getFile(bFileId, a.accessToken));
 */

export interface TenantConfig {
  baseUrl?: string;
  realm?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface Tenant {
  orgId: string;
  userId: string;
  username: string;
  password: string;
  accessToken: string;
  refreshToken: string;
}

interface KcToken {
  access_token: string;
  refresh_token: string;
}

function cfg(c: TenantConfig = {}) {
  return {
    baseUrl: c.baseUrl ?? process.env.KEYCLOAK_BASE_URL ?? 'http://localhost:8080',
    realm: c.realm ?? process.env.KEYCLOAK_REALM ?? 'nebula',
    clientId: c.clientId ?? 'nebula-apps',
    clientSecret: c.clientSecret ?? 'changeme',
  };
}

/** True if the dev Keycloak is reachable — lets suites skip gracefully. */
export async function keycloakReachable(c: TenantConfig = {}): Promise<boolean> {
  const { baseUrl, realm } = cfg(c);
  try {
    const res = await fetch(`${baseUrl}/realms/${realm}/.well-known/openid-configuration`);
    return res.ok;
  } catch {
    return false;
  }
}

async function form(url: string, body: Record<string, string>): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
}

async function provisionOne(label: string, c: TenantConfig): Promise<Tenant> {
  const { baseUrl, realm, clientId, clientSecret } = cfg(c);
  const tokenUrl = `${baseUrl}/realms/${realm}/protocol/openid-connect/token`;
  const adminUrl = `${baseUrl}/admin/realms/${realm}`;

  const adminRes = await form(tokenUrl, {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });
  const adminToken = ((await adminRes.json()) as KcToken).access_token;
  const authHeaders = {
    authorization: `Bearer ${adminToken}`,
    'content-type': 'application/json',
  };

  const idFromLocation = async (path: string, payload: unknown): Promise<string> => {
    const res = await fetch(`${adminUrl}${path}`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`provision ${path} failed: ${res.status}`);
    const id = res.headers.get('location')?.split('/').pop();
    if (!id) throw new Error(`provision ${path}: no id`);
    return id;
  };

  // Date.now is fine in test code; only workflow scripts forbid it.
  const suffix = `${label}-${Date.now()}`;
  const username = `user-${suffix}`;
  const password = 'sup3r-secret-pw';

  const orgId = await idFromLocation('/groups', { name: `org-${suffix}` });
  const userId = await idFromLocation('/users', {
    username,
    email: `${username}@example.com`,
    enabled: true,
    emailVerified: true,
    attributes: { org_id: [orgId] },
    credentials: [{ type: 'password', value: password, temporary: false }],
  });

  // owner role
  const roleRes = await fetch(`${adminUrl}/roles/owner`, { headers: authHeaders });
  const role = (await roleRes.json()) as { id: string; name: string };
  await fetch(`${adminUrl}/users/${userId}/role-mappings/realm`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify([{ id: role.id, name: role.name }]),
  });
  await fetch(`${adminUrl}/users/${userId}/groups/${orgId}`, {
    method: 'PUT',
    headers: authHeaders,
  });

  const loginRes = await form(tokenUrl, {
    grant_type: 'password',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'openid',
    username,
    password,
  });
  if (!loginRes.ok) throw new Error(`provision login failed: ${loginRes.status}`);
  const tokens = (await loginRes.json()) as KcToken;

  return {
    orgId,
    userId,
    username,
    password,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
  };
}

/** Provision two isolated tenants (A and B), each with an owner and a live token. */
export async function provisionTwoTenants(c: TenantConfig = {}): Promise<{ a: Tenant; b: Tenant }> {
  const a = await provisionOne('a', c);
  const b = await provisionOne('b', c);
  return { a, b };
}

/**
 * Assert that an operation performed as one tenant against another tenant's
 * resource is denied. Accepts a thunk that should either throw, or resolve to a
 * value the caller deems "no access" (e.g. empty list / 403). By default it
 * passes when the thunk throws.
 */
export async function assertDenied(
  op: () => Promise<unknown>,
  isDenied: (result: unknown) => boolean = () => false,
): Promise<void> {
  try {
    const result = await op();
    if (!isDenied(result)) {
      throw new Error('Expected cross-tenant access to be denied, but it succeeded');
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Expected cross-tenant')) throw err;
    // thrown = denied = pass
  }
}

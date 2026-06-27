/**
 * Minimal query interface satisfied by a pg PoolClient. Repos receive an
 * org-scoped client (from @nebula/db withTenant) so RLS is active for every call.
 */
export interface Querier {
  query<R = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: R[]; rowCount: number | null }>;
}

/** Extract a bearer token from an Authorization header. Returns null if absent/malformed. */
export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  const [scheme, token, ...rest] = authHeader.split(' ');
  if (rest.length > 0) return null;
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

import { type DynamicModule, Module } from '@nestjs/common';
import { JwtAuthGuard } from './api/jwt-auth.guard.js';
import { AUTH_VERIFIER, type TokenVerifier } from './application/verifier.js';
import { type RemoteVerifierConfig, createRemoteVerifier } from './infra/jwks.js';

/**
 * Reusable auth module. Provide either a remote OIDC config (Keycloak, default)
 * or a custom verifier (useful in tests). Exports JwtAuthGuard + AUTH_VERIFIER.
 */
@Module({})
export class NucleoAuthModule {
  static forRoot(
    options: { config: RemoteVerifierConfig } | { verifier: TokenVerifier },
  ): DynamicModule {
    const verifier: TokenVerifier =
      'verifier' in options ? options.verifier : createRemoteVerifier(options.config);

    return {
      module: NucleoAuthModule,
      providers: [{ provide: AUTH_VERIFIER, useValue: verifier }, JwtAuthGuard],
      exports: [AUTH_VERIFIER, JwtAuthGuard],
    };
  }
}

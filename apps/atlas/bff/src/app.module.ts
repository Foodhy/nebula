import { NucleoAuthModule } from '@nebula/nucleo-auth';
import { ObservabilityModule } from '@nebula/observability';
import { type DynamicModule, Module } from '@nestjs/common';
import { AuthController } from './api/auth.controller.js';
import { MfaController } from './api/mfa.controller.js';
import { OrgsController } from './api/orgs.controller.js';
import { AuthService } from './application/auth.service.js';
import { EVENT_PUBLISHER, type EventPublisher } from './application/events.port.js';
import { IDENTITY_PROVIDER, type IdentityProvider } from './application/identity-provider.port.js';
import type { AtlasEnv } from './config.js';
import { KeycloakHttpAdapter } from './infra/keycloak.adapter.js';

export interface AtlasModuleDeps {
  env: AtlasEnv;
  /** Override the identity provider (tests). Defaults to KeycloakHttpAdapter. */
  identityProvider?: IdentityProvider;
  /** Event publisher (defaults provided at bootstrap). */
  eventPublisher: EventPublisher;
}

@Module({})
export class AppModule {
  static forRoot(deps: AtlasModuleDeps): DynamicModule {
    const idp: IdentityProvider =
      deps.identityProvider ??
      new KeycloakHttpAdapter({
        baseUrl: deps.env.KEYCLOAK_BASE_URL,
        realm: deps.env.KEYCLOAK_REALM,
        clientId: deps.env.OIDC_CLIENT_ID,
        clientSecret: deps.env.OIDC_CLIENT_SECRET,
      });

    const issuer = `${deps.env.KEYCLOAK_BASE_URL}/realms/${deps.env.KEYCLOAK_REALM}`;

    return {
      module: AppModule,
      imports: [
        ObservabilityModule.forRoot({ serviceName: 'atlas-bff' }),
        NucleoAuthModule.forRoot({
          config: { issuer, audience: deps.env.OIDC_CLIENT_ID },
        }),
      ],
      controllers: [AuthController, MfaController, OrgsController],
      providers: [
        AuthService,
        { provide: IDENTITY_PROVIDER, useValue: idp },
        { provide: EVENT_PUBLISHER, useValue: deps.eventPublisher },
      ],
    };
  }
}

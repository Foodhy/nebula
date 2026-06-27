import { NucleoAuthModule } from '@nebula/nucleo-auth';
import { ObservabilityModule } from '@nebula/observability';
import { type DynamicModule, Module } from '@nestjs/common';
import type { Pool } from 'pg';
import { FilesController } from './api/files.controller.js';
import { FoldersController } from './api/folders.controller.js';
import { SharesController } from './api/shares.controller.js';
import { FilesService } from './application/files.service.js';
import { FoldersService } from './application/folders.service.js';
import type { EventPublisher } from './application/ports/events.port.js';
import { KEY_PROVIDER, type KeyProvider } from './application/ports/key-provider.port.js';
import {
  EVENT_PUBLISHER,
  FILE_REPO,
  FOLDER_REPO,
  SHARE_REPO,
  TENANT_RUNNER,
  VERSION_REPO,
} from './application/ports/repos.port.js';
import { OBJECT_STORE, type ObjectStore } from './application/ports/storage.port.js';
import { SharesService } from './application/shares.service.js';
import type { VegaEnv } from './config.js';
import { PgFileRepo, PgFolderRepo, PgShareRepo, PgVersionRepo } from './infra/repositories.js';
import { PgTenantRunner } from './infra/tenant-runner.js';

export interface VegaModuleDeps {
  env: VegaEnv;
  pool: Pool;
  objectStore: ObjectStore;
  keyProvider: KeyProvider;
  eventPublisher: EventPublisher;
}

@Module({})
export class AppModule {
  static forRoot(deps: VegaModuleDeps): DynamicModule {
    const issuer = `${deps.env.KEYCLOAK_BASE_URL}/realms/${deps.env.KEYCLOAK_REALM}`;
    return {
      module: AppModule,
      imports: [
        ObservabilityModule.forRoot({ serviceName: 'vega-storage' }),
        NucleoAuthModule.forRoot({ config: { issuer, audience: deps.env.OIDC_CLIENT_ID } }),
      ],
      controllers: [FilesController, FoldersController, SharesController],
      providers: [
        FilesService,
        FoldersService,
        SharesService,
        { provide: TENANT_RUNNER, useValue: new PgTenantRunner(deps.pool) },
        { provide: FILE_REPO, useValue: new PgFileRepo() },
        { provide: VERSION_REPO, useValue: new PgVersionRepo() },
        { provide: FOLDER_REPO, useValue: new PgFolderRepo() },
        { provide: SHARE_REPO, useValue: new PgShareRepo() },
        { provide: OBJECT_STORE, useValue: deps.objectStore },
        { provide: KEY_PROVIDER, useValue: deps.keyProvider },
        { provide: EVENT_PUBLISHER, useValue: deps.eventPublisher },
      ],
    };
  }
}

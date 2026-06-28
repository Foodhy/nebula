import { ObservabilityModule } from '@nebula/observability';
import { type DynamicModule, Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { ENV, type LyraBffEnv } from './config.js';
import { DocsController } from './docs.controller.js';

@Module({})
export class AppModule {
  static forRoot(env: LyraBffEnv): DynamicModule {
    return {
      module: AppModule,
      imports: [ObservabilityModule.forRoot({ serviceName: 'lyra-bff' })],
      controllers: [AuthController, DocsController],
      providers: [{ provide: ENV, useValue: env }],
    };
  }
}

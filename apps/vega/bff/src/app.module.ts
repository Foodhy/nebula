import { ObservabilityModule } from '@nebula/observability';
import { type DynamicModule, Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import type { VegaBffEnv } from './config.js';
import { ENV } from './tokens.js';
import { VegaController } from './vega.controller.js';

@Module({})
export class AppModule {
  static forRoot(env: VegaBffEnv): DynamicModule {
    return {
      module: AppModule,
      imports: [ObservabilityModule.forRoot({ serviceName: 'vega-bff' })],
      controllers: [AuthController, VegaController],
      providers: [{ provide: ENV, useValue: env }],
    };
  }
}

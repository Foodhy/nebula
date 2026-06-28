import { ObservabilityModule } from '@nebula/observability';
import { type DynamicModule, Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { ENV, type HeliosBffEnv } from './config.js';
import { DashboardController } from './dashboard.controller.js';

@Module({})
export class AppModule {
  static forRoot(env: HeliosBffEnv): DynamicModule {
    return {
      module: AppModule,
      imports: [ObservabilityModule.forRoot({ serviceName: 'helios-bff' })],
      controllers: [AuthController, DashboardController],
      providers: [{ provide: ENV, useValue: env }],
    };
  }
}

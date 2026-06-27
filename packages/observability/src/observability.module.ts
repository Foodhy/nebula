import { Controller, type DynamicModule, Get, Header, Module } from '@nestjs/common';
import { registry, startDefaultMetrics } from './metrics.js';

@Controller()
class ObservabilityController {
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('metrics')
  @Header('content-type', 'text/plain; version=0.0.4; charset=utf-8')
  metrics(): Promise<string> {
    return registry.metrics();
  }
}

/**
 * Exposes GET /health and GET /metrics (Prometheus) for any Nébula service.
 * Pair with initTracing() at bootstrap for traces. Every service mounts this.
 */
@Module({})
export class ObservabilityModule {
  static forRoot(opts: { serviceName: string }): DynamicModule {
    startDefaultMetrics(opts.serviceName);
    return {
      module: ObservabilityModule,
      controllers: [ObservabilityController],
    };
  }
}

"""Observability helpers for Nébula Python (FastAPI) services.

Mirror of @nebula/observability (TS): exposes /health and /metrics and wires
OpenTelemetry tracing to Tempo. Every Python service mounts these.

Dependencies (add to the service, not this skeleton lib):
    prometheus-client, opentelemetry-sdk, opentelemetry-exporter-otlp-proto-http,
    opentelemetry-instrumentation-fastapi
"""

from __future__ import annotations

import os
from typing import TYPE_CHECKING

if TYPE_CHECKING:  # avoid importing heavy deps at module import time
    from fastapi import FastAPI


def init_tracing(service_name: str, otlp_url: str | None = None) -> None:
    """Initialize OTLP tracing. Call once at startup, before serving requests."""
    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    url = otlp_url or os.getenv(
        "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT", "http://localhost:4318/v1/traces"
    )
    provider = TracerProvider(resource=Resource.create({"service.name": service_name}))
    provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=url)))
    trace.set_tracer_provider(provider)


def mount_observability(app: "FastAPI", service_name: str) -> None:
    """Add /health and /metrics to a FastAPI app and instrument it for tracing."""
    from fastapi import Response
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/metrics")
    def metrics() -> Response:
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    FastAPIInstrumentor.instrument_app(app)
    _ = service_name  # used as the OTEL service name via init_tracing

#!/usr/bin/env bash
#
# scaffold.sh — Generates the Nébula monorepo folder structure.
# Creates the empty tree with READMEs and .gitkeep, ready to fill phase by phase.
# Idempotent: safe to run multiple times.
#
set -euo pipefail

ROOT="${1:-.}"
echo "🌌 Generating Nébula structure at: ${ROOT}"

# --- User apps (web frontend + bff) ---
APPS=(helios vega lyra orion aurora cosmos pulsar iris cronos quasar)
for app in "${APPS[@]}"; do
  mkdir -p "${ROOT}/apps/${app}/web/src" "${ROOT}/apps/${app}/bff/src" "${ROOT}/apps/${app}/bff/tests"
  [ -f "${ROOT}/apps/${app}/README.md" ] || echo "# ${app} (app)" > "${ROOT}/apps/${app}/README.md"
done

# --- Domain services ---
SERVICES=(vega-storage lyra-collab orion-engine iris-mail cronos-cal pulsar-rt quasar-media)
for svc in "${SERVICES[@]}"; do
  mkdir -p "${ROOT}/services/${svc}/src/domain" \
           "${ROOT}/services/${svc}/src/application" \
           "${ROOT}/services/${svc}/src/infra" \
           "${ROOT}/services/${svc}/src/api" \
           "${ROOT}/services/${svc}/tests/unit" \
           "${ROOT}/services/${svc}/tests/integration" \
           "${ROOT}/services/${svc}/migrations"
  [ -f "${ROOT}/services/${svc}/README.md" ] || echo "# ${svc} (service)" > "${ROOT}/services/${svc}/README.md"
done

# --- Núcleo (shared services) ---
CORE=(nucleo-auth nucleo-search nucleo-notifications nucleo-audit nucleo-flags nucleo-events nucleo-policy)
for c in "${CORE[@]}"; do
  mkdir -p "${ROOT}/core/${c}/src" "${ROOT}/core/${c}/tests"
  [ -f "${ROOT}/core/${c}/README.md" ] || echo "# ${c} (core)" > "${ROOT}/core/${c}/README.md"
done

# --- Shared TS packages ---
PKGS=(types sdk ui security config tsconfig eslint-config)
for p in "${PKGS[@]}"; do
  mkdir -p "${ROOT}/packages/${p}/src"
  [ -f "${ROOT}/packages/${p}/README.md" ] || echo "# @nebula/${p}" > "${ROOT}/packages/${p}/README.md"
done

# --- Shared Python libs ---
PYLIBS=(nebula_security nebula_common nebula_events)
for l in "${PYLIBS[@]}"; do
  mkdir -p "${ROOT}/libs/${l}"
  touch "${ROOT}/libs/${l}/__init__.py"
done

# --- Infra ---
mkdir -p "${ROOT}/infra/compose" \
         "${ROOT}/infra/docker" \
         "${ROOT}/infra/k8s/charts" \
         "${ROOT}/infra/k8s/environments" \
         "${ROOT}/infra/terraform" \
         "${ROOT}/infra/observability"

# --- Cross-service tests ---
mkdir -p "${ROOT}/tests/e2e" "${ROOT}/tests/integration" "${ROOT}/tests/load"

# --- Tools ---
mkdir -p "${ROOT}/tools/scaffold" "${ROOT}/tools/migrations" "${ROOT}/tools/scripts"

# --- CI ---
mkdir -p "${ROOT}/.github/workflows"

# --- .gitkeep in folders that might stay empty ---
find "${ROOT}" -type d -empty -exec touch {}/.gitkeep \;

echo "✅ Structure created."
echo "👉 Next: cp .env.example .env  and start with F0 (Núcleo + Atlas)."
echo "👉 Then open Claude Code in this folder and follow docs/09-getting-started.md"

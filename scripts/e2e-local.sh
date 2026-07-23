#!/bin/sh
# Managed local E2E lifecycle: starts dependencies (Keycloak, BaSyx, proxy,
# generator) in Docker, runs the Next.js dev server on the host against them,
# waits for both to be ready, then runs Cypress. Only the host `next dev`
# process started by this script is torn down on exit - the Docker
# dependencies are left running so repeat runs are fast. Stop them explicitly
# with `yarn test:e2e:deps:down` when done.
#
# Usage: scripts/e2e-local.sh <open|run> [additional cypress args...]

set -e

MODE=$1
if [ "$MODE" != "open" ] && [ "$MODE" != "run" ]; then
    echo "Usage: $0 <open|run> [additional cypress args...]" >&2
    exit 1
fi
shift

SCRIPT_DIR=$(dirname "$0")
cd "$SCRIPT_DIR/.."

echo "Starting E2E dependencies (Keycloak, BaSyx, proxy, generator)..."
docker compose -f compose.yml -f docker-compose/compose.keycloak.yml \
    up -d --wait keycloak aas-environment mnestix-proxy mnestix-aas-generator

set -a
# shellcheck disable=SC1091
. ./.env.e2e
set +a

yarn prisma:migrate
yarn prisma:generate

echo "Starting the Next.js dev server on the host..."
yarn next dev >/tmp/mnestix-e2e-next-dev.log 2>&1 &
NEXT_PID=$!
trap 'echo "Stopping the host Next.js dev server..."; kill "$NEXT_PID" 2>/dev/null || true' EXIT

echo "Waiting for http://localhost:3000 to respond..."
attempt=1
max_attempts=60
until curl --silent --fail --output /dev/null http://localhost:3000/; do
    if [ "$attempt" -ge "$max_attempts" ]; then
        echo "Next.js dev server did not become ready after ${max_attempts}s. See /tmp/mnestix-e2e-next-dev.log" >&2
        exit 1
    fi
    attempt=$((attempt + 1))
    sleep 1
done

echo "Running Cypress ($MODE)..."
yarn cypress "$MODE" "$@"

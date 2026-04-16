#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONFIG_PATH="$ROOT_DIR/tests/e2e/playwright.config.mjs"
PLAYWRIGHT_VERSION="${PLAYWRIGHT_VERSION:-1.55.0}"

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required to run the smoke suite." >&2
  exit 1
fi

mkdir -p "$ROOT_DIR/tests/e2e/artifacts"

export PLAYWRIGHT_HTML_OPEN="never"

exec npx --yes "@playwright/test@${PLAYWRIGHT_VERSION}" test -c "$CONFIG_PATH" "$@"

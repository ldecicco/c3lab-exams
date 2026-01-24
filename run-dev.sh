#!/usr/bin/env bash
set -euo pipefail

export NODE_ENV=development
export PORT="${PORT:-3000}"

node server.js

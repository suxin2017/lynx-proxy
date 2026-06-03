#!/usr/bin/env bash
# Seed demo traffic + rules for README UI screenshots.
#
# Prereqs: Lynx proxy listening on 7788 (`task dev-lynx-server` or `task dev`).
# Optional: starts lynx-mock on 3001 if not already reachable.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROXY="${LYNX_PROXY:-http://127.0.0.1:7788}"
MOCK_HOST="${MOCK_HOST:-127.0.0.1:3001}"
MOCK_PORT="${MOCK_PORT:-3001}"
MOCK_PID=""

probe_port() {
  local host="$1"
  local port="$2"
  if command -v nc >/dev/null 2>&1; then
    nc -z -G 3 "$host" "$port" 2>/dev/null && return 0
  fi
  bash -c "exec 3<>/dev/tcp/${host}/${port}" 2>/dev/null
}

cleanup() {
  if [[ -n "$MOCK_PID" ]] && kill -0 "$MOCK_PID" 2>/dev/null; then
    kill "$MOCK_PID" 2>/dev/null || true
    wait "$MOCK_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "== Lynx README demo seed =="
echo "proxy: $PROXY"
echo ""

if ! probe_port 127.0.0.1 7788; then
  echo "error: proxy not reachable on 7788 — run \`task dev-lynx-server\` or \`task dev\` first" >&2
  exit 1
fi

if ! probe_port 127.0.0.1 "$MOCK_PORT"; then
  echo "starting lynx-mock on port $MOCK_PORT..."
  (cd "$ROOT" && cargo run -q -p lynx-mock --example start_test_server) &
  MOCK_PID=$!
  for _ in $(seq 1 30); do
    if probe_port 127.0.0.1 "$MOCK_PORT"; then
      break
    fi
    sleep 0.5
  done
  if ! probe_port 127.0.0.1 "$MOCK_PORT"; then
    echo "error: mock server did not start on $MOCK_PORT" >&2
    exit 1
  fi
  echo "mock server ready"
else
  echo "mock server already running on $MOCK_PORT"
fi

echo ""
echo "== HTTP(S) via httpbin (realistic) =="
bash "$ROOT/scripts/traffic-sample.sh" --realistic --count 25 --delay 0.12

echo ""
echo "== HTTP(S) via lynx-mock =="
bash "$ROOT/scripts/traffic-mock.sh"

echo ""
echo "== WebSocket via proxy =="
(cd "$ROOT" && LYNX_PROXY="$PROXY" LYNX_MOCK_PORT="$MOCK_PORT" cargo run -q -p lynx-mock --example ws_via_proxy)

echo ""
echo "== Rules + compose seed =="
node "$ROOT/scripts/seed-demo-data.mjs"

echo ""
echo "done — open http://localhost:5173/network (with \`task dev-ui\` or \`task dev\`)"

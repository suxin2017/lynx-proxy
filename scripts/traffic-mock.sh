#!/usr/bin/env bash
# Send HTTP(S) traffic through Lynx proxy to a local lynx-mock server (default :3001).
#
# Usage:
#   ./scripts/traffic-mock.sh
#   LYNX_PROXY=http://127.0.0.1:7788 MOCK_HOST=127.0.0.1:3001 ./scripts/traffic-mock.sh

set -uo pipefail

PROXY="${LYNX_PROXY:-http://127.0.0.1:7788}"
MOCK_HOST="${MOCK_HOST:-127.0.0.1:3001}"
CONNECT_TIMEOUT="${LYNX_TRAFFIC_CONNECT_TIMEOUT:-8}"

if ! command -v curl >/dev/null 2>&1; then
  echo "error: curl is required" >&2
  exit 1
fi

CURL_BASE=(
  -sS
  -o /dev/null
  -w '%{http_code}'
  --connect-timeout "$CONNECT_TIMEOUT"
  -x "$PROXY"
)

send() {
  local label="$1"
  local method="$2"
  local url="$3"
  shift 3
  local status
  status="$(curl "${CURL_BASE[@]}" -X "$method" "$@" "$url" 2>/dev/null || echo "err")"
  printf '[mock] %s %s %s -> %s\n' "$label" "$method" "$url" "$status"
}

echo "Lynx mock traffic"
echo "  proxy : $PROXY"
echo "  mock  : $MOCK_HOST"
echo ""

send "hello" GET "http://${MOCK_HOST}/hello"
send "json" GET "http://${MOCK_HOST}/json"
send "gzip" GET "http://${MOCK_HOST}/gzip" -H "Accept-Encoding: gzip"
send "headers" GET "http://${MOCK_HOST}/headers" -H "X-Demo: lynx-readme"
send "status-404" GET "http://${MOCK_HOST}/status/404"
send "post-echo" POST "http://${MOCK_HOST}/post_echo" \
  -H "Content-Type: application/json" \
  -d '{"demo":true,"source":"readme"}'
send "echo-query" GET "http://${MOCK_HOST}/echo?from=lynx-proxy&page=1"
send "push-msg" GET "http://${MOCK_HOST}/push_msg"

# HTTPS paths (mock server TLS; -k for self-signed cert)
send "json-https" GET "https://${MOCK_HOST}/json" -k
send "hello-https" GET "https://${MOCK_HOST}/hello" -k
send "brotli-https" GET "https://${MOCK_HOST}/brotli" -k -H "Accept-Encoding: br"

echo ""
echo "done"

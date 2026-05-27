#!/usr/bin/env bash
# Send sample HTTP(S) traffic through the Lynx proxy so the Network UI has data to show.
#
# Usage:
#   ./scripts/traffic-sample.sh
#   ./scripts/traffic-sample.sh --count 30 --realistic
#   ./scripts/traffic-sample.sh --simple --count 20
#   LYNX_PROXY=http://127.0.0.1:7788 ./scripts/traffic-sample.sh --count 10
#
# Requires: curl, proxy listening (e.g. `task dev-lynx-server` or `task dev`)

set -uo pipefail

PROXY="${LYNX_PROXY:-http://127.0.0.1:7788}"
COUNT="${LYNX_TRAFFIC_COUNT:-20}"
DELAY="${LYNX_TRAFFIC_DELAY:-0.2}"
MODE="${LYNX_TRAFFIC_MODE:-both}"
HOST="${LYNX_TRAFFIC_HOST:-httpbin.org}"
CONNECT_TIMEOUT="${LYNX_TRAFFIC_CONNECT_TIMEOUT:-8}"
PROFILE="${LYNX_TRAFFIC_PROFILE:-realistic}"

COOKIE_JAR=""

usage() {
  cat <<'EOF'
Generate sample traffic through the Lynx proxy (for Network UI development).

Options:
  --proxy <url>       Proxy URL (default: http://127.0.0.1:7788, or LYNX_PROXY)
  --count <n>         Number of requests (default: 20)
  --delay <sec>       Delay between requests (default: 0.2)
  --http              Plain HTTP only
  --https             HTTPS only (-k)
  --both              Mix HTTP and HTTPS (default)
  --simple            Only simple GET /get?n=… (legacy mode)
  --realistic         Varied methods, headers, bodies, status codes (default)
  --host <host>       Target host (default: httpbin.org)
  -h, --help          Show this help

Environment:
  LYNX_PROXY, LYNX_TRAFFIC_COUNT, LYNX_TRAFFIC_DELAY, LYNX_TRAFFIC_MODE,
  LYNX_TRAFFIC_HOST, LYNX_TRAFFIC_PROFILE

Examples:
  task traffic-sample
  task traffic-sample:realistic
  task traffic-sample -- --count 40 --https
  task traffic-sample -- --simple --count 10
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --proxy)
      PROXY="$2"
      shift 2
      ;;
    --count)
      COUNT="$2"
      shift 2
      ;;
    --delay)
      DELAY="$2"
      shift 2
      ;;
    --http)
      MODE="http"
      shift
      ;;
    --https)
      MODE="https"
      shift
      ;;
    --both)
      MODE="both"
      shift
      ;;
    --simple)
      PROFILE="simple"
      shift
      ;;
    --realistic)
      PROFILE="realistic"
      shift
      ;;
    --host)
      HOST="$2"
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if ! command -v curl >/dev/null 2>&1; then
  echo "error: curl is required" >&2
  exit 1
fi

if ! [[ "$COUNT" =~ ^[0-9]+$ ]] || [[ "$COUNT" -lt 1 ]]; then
  echo "error: --count must be a positive integer" >&2
  exit 1
fi

parse_proxy_host_port() {
  local without_scheme
  without_scheme="${PROXY#*://}"
  without_scheme="${without_scheme%%/*}"

  if [[ "$without_scheme" == *:* ]]; then
    PROXY_HOST="${without_scheme%%:*}"
    PROXY_PORT="${without_scheme##*:}"
  else
    PROXY_HOST="$without_scheme"
    PROXY_PORT="7788"
  fi
}

probe_proxy() {
  parse_proxy_host_port

  if command -v nc >/dev/null 2>&1; then
    if nc -z -G "$CONNECT_TIMEOUT" "$PROXY_HOST" "$PROXY_PORT" 2>/dev/null; then
      return 0
    fi
    if nc -z -w "$CONNECT_TIMEOUT" "$PROXY_HOST" "$PROXY_PORT" 2>/dev/null; then
      return 0
    fi
  fi

  if command -v bash >/dev/null 2>&1; then
    bash -c "exec 3<>/dev/tcp/${PROXY_HOST}/${PROXY_PORT}" 2>/dev/null
    return $?
  fi

  return 1
}

use_https_for_index() {
  local index="$1"
  case "$MODE" in
    https) echo 1 ;;
    both)
      if ((index % 2 == 0)); then
        echo 1
      else
        echo 0
      fi
      ;;
    *) echo 0 ;;
  esac
}

base_url() {
  if [[ "$1" == "1" ]]; then
    printf 'https://%s' "$HOST"
  else
    printf 'http://%s' "$HOST"
  fi
}

build_curl_base() {
  local use_https="$1"
  CURL_BASE=(
    -sS
    -o /dev/null
    -w '%{http_code}'
    --connect-timeout "$CONNECT_TIMEOUT"
    -x "$PROXY"
  )
  if [[ "$use_https" == "1" ]]; then
    CURL_BASE+=(-k)
  fi
}

send_simple() {
  local index="$1"
  local use_https="$2"
  local base url status

  base="$(base_url "$use_https")"
  url="${base}/get?n=${index}"
  build_curl_base "$use_https"

  status="$(curl "${CURL_BASE[@]}" "$url" 2>/dev/null || echo "err")"
  printf '[%s/%s] GET %s -> %s\n' "$index" "$COUNT" "$url" "$status"
}

send_realistic() {
  local index="$1"
  local use_https="$2"
  local base scenario
  local -a extra_args=()
  local label method url status body

  base="$(base_url "$use_https")"
  build_curl_base "$use_https"
  scenario=$(( (index - 1) % 16 ))

  case "$scenario" in
    0)
      label="GET api-list"
      method="GET"
      url="${base}/get?traceId=trace-${index}&page=$((index % 8))&pageSize=25&sort=-createdAt&fields=id,name,status"
      extra_args+=(
        -H "Accept: application/json"
        -H "Accept-Language: zh-CN,en;q=0.9"
        -H "User-Agent: Mozilla/5.0 (Macintosh; LynxTraffic/1.0)"
        -H "X-Request-Id: req-${index}"
        -H "Referer: ${base}/"
      )
      ;;
    1)
      label="POST json-login"
      method="POST"
      url="${base}/post"
      body="$(printf '{"email":"user%d@example.com","password":"secret-%d","remember":true}' "$index" "$index")"
      extra_args+=(
        -X POST
        -H "Content-Type: application/json"
        -H "Accept: application/json"
        -H "Authorization: Bearer eyJhbG.test.${index}"
        -d "$body"
      )
      ;;
    2)
      label="POST form-submit"
      method="POST"
      url="${base}/post"
      extra_args+=(
        -X POST
        -H "Content-Type: application/x-www-form-urlencoded"
        -d "name=user${index}&action=save&tags=alpha&tags=beta&draft=false"
      )
      ;;
    3)
      label="PUT resource"
      method="PUT"
      url="${base}/put"
      body="$(printf '{"id":%d,"title":"Updated item %d","meta":{"rev":%d}}' "$index" "$index" "$index")"
      extra_args+=(
        -X PUT
        -H "Content-Type: application/json"
        -H "If-Match: \"rev-${index}\""
        -d "$body"
      )
      ;;
    4)
      label="PATCH partial"
      method="PATCH"
      url="${base}/patch"
      extra_args+=(
        -X PATCH
        -H "Content-Type: application/json"
        -d "{\"status\":\"active\",\"priority\":$((index % 3))}"
      )
      ;;
    5)
      label="DELETE resource"
      method="DELETE"
      url="${base}/delete?id=${index}"
      extra_args+=(
        -X DELETE
        -H "Accept: application/json"
      )
      ;;
    6)
      label="GET custom-headers"
      method="GET"
      url="${base}/headers"
      extra_args+=(
        -H "X-Api-Key: lynx-dev-key"
        -H "X-Forwarded-For: 10.0.${index}.42"
        -H "Cache-Control: no-cache"
        -H "Pragma: no-cache"
      )
      ;;
    7)
      label="GET 404"
      method="GET"
      url="${base}/status/404"
      ;;
    8)
      label="GET 500"
      method="GET"
      url="${base}/status/500"
      ;;
    9)
      label="GET redirect-chain"
      method="GET"
      url="${base}/redirect/2"
      extra_args+=(-L --max-redirs 5)
      ;;
    10)
      label="GET gzip"
      method="GET"
      url="${base}/gzip"
      extra_args+=(-H "Accept-Encoding: gzip, deflate, br")
      ;;
    11)
      label="GET slow-1s"
      method="GET"
      url="${base}/delay/1"
      ;;
    12)
      label="SET cookies"
      method="GET"
      url="${base}/cookies/set?session_id=sess-${index}&theme=dark&region=cn"
      extra_args+=(-c "$COOKIE_JAR")
      ;;
    13)
      label="GET with-cookies"
      method="GET"
      url="${base}/cookies"
      extra_args+=(-b "$COOKIE_JAR")
      ;;
    14)
      label="POST large-json"
      method="POST"
      url="${base}/post"
      body="$(printf '{"batch":%d,"items":[' "$index")"
      local j
      for ((j = 0; j < 12; j++)); do
        if ((j > 0)); then
          body+=","
        fi
        body+="$(printf '{"sku":"SKU-%d-%d","qty":%d}' "$index" "$j" "$((j + 1))")"
      done
      body+=']}'
      extra_args+=(
        -X POST
        -H "Content-Type: application/json"
        -H "Content-Encoding: identity"
        -d "$body"
      )
      ;;
    15)
      label="GET uuid"
      method="GET"
      url="${base}/uuid"
      extra_args+=(
        -H "Accept: */*"
        -H "User-Agent: curl/8.0 lynx-traffic"
      )
      ;;
  esac

  status="$(curl "${CURL_BASE[@]}" "${extra_args[@]}" "$url" 2>/dev/null || echo "err")"
  printf '[%s/%s] %s %s %s -> %s\n' "$index" "$COUNT" "$label" "$method" "$url" "$status"
}

COOKIE_JAR="$(mktemp "${TMPDIR:-/tmp}/lynx-traffic-cookies.XXXXXX")"
trap 'rm -f "$COOKIE_JAR"' EXIT

echo "Lynx traffic sample"
echo "  proxy   : $PROXY"
echo "  host    : $HOST"
echo "  profile : $PROFILE"
echo "  mode    : $MODE"
echo "  count   : $COUNT"
echo "  delay   : ${DELAY}s"
echo ""

if ! probe_proxy; then
  echo "warning: could not reach proxy at $PROXY (is \`task dev\` or \`task dev-lynx-server\` running?)" >&2
  echo "         continuing anyway…" >&2
  echo ""
fi

ok=0
fail=0

for ((i = 1; i <= COUNT; i++)); do
  use_https="$(use_https_for_index "$i")"

  if [[ "$PROFILE" == "simple" ]]; then
    status_line="$(send_simple "$i" "$use_https")"
  else
    status_line="$(send_realistic "$i" "$use_https")"
  fi
  echo "$status_line"

  if [[ "$status_line" == *'-> err' ]] || [[ "$status_line" == *'-> 000' ]]; then
    fail=$((fail + 1))
  else
    ok=$((ok + 1))
  fi

  if [[ "$i" -lt "$COUNT" ]] && awk -v d="$DELAY" 'BEGIN { exit (d > 0) ? 0 : 1 }'; then
    sleep "$DELAY"
  fi
done

echo ""
echo "done: $ok ok, $fail failed"
echo "open Network UI with recording enabled: http://localhost:5173/network"

if [[ "$fail" -gt 0 ]]; then
  exit 1
fi

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="${ROOT_DIR}/.lan-run"

cd "${ROOT_DIR}"

if [[ -f "${ROOT_DIR}/docker.env" ]]; then
  set -a
  source "${ROOT_DIR}/docker.env"
  set +a
fi

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || true)"
if [[ -z "${LAN_IP}" ]]; then
  LAN_IP="$(ipconfig getifaddr en1 2>/dev/null || true)"
fi
if [[ -z "${LAN_IP}" ]]; then
  LAN_IP="127.0.0.1"
fi

unset ALL_PROXY all_proxy HTTP_PROXY http_proxy HTTPS_PROXY https_proxy
export NO_PROXY="localhost,127.0.0.1,${LAN_IP}"
export no_proxy="${NO_PROXY}"

export API_URL="http://${LAN_IP}:5055"
export API_HOST="${API_HOST:-0.0.0.0}"
export API_PORT="${API_PORT:-5055}"
export SURREAL_URL="ws://localhost:8001/rpc"

mkdir -p "${RUN_DIR}" "${ROOT_DIR}/surreal_data"

stop_pidfile() {
  local pidfile="$1"
  if [[ -f "${pidfile}" ]]; then
    local pid
    pid="$(cat "${pidfile}" 2>/dev/null || true)"
    if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then
      kill "${pid}" 2>/dev/null || true
      for _ in {1..30}; do
        if kill -0 "${pid}" 2>/dev/null; then
          sleep 0.2
        else
          break
        fi
      done
      if kill -0 "${pid}" 2>/dev/null; then
        kill -9 "${pid}" 2>/dev/null || true
      fi
    fi
    rm -f "${pidfile}"
  fi
}

stop_port() {
  local port="$1"
  local pids
  pids="$(lsof -ti "tcp:${port}" 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    kill ${pids} 2>/dev/null || true
    sleep 0.5
    pids="$(lsof -ti "tcp:${port}" 2>/dev/null || true)"
    if [[ -n "${pids}" ]]; then
      kill -9 ${pids} 2>/dev/null || true
    fi
  fi
}

stop_pidfile "${RUN_DIR}/frontend.pid"
stop_pidfile "${RUN_DIR}/worker.pid"
stop_pidfile "${RUN_DIR}/api.pid"
stop_pidfile "${RUN_DIR}/surreal.pid"

stop_port 3000
stop_port 5055
stop_port 8001

nohup surreal start --log info --user root --pass root --bind 0.0.0.0:8001 \
  "rocksdb:${ROOT_DIR}/surreal_data/mydatabase.db" \
  >"${RUN_DIR}/surreal.log" 2>&1 &
echo $! > "${RUN_DIR}/surreal.pid"

nohup env API_HOST="${API_HOST}" API_PORT="${API_PORT}" API_URL="${API_URL}" SURREAL_URL="${SURREAL_URL}" \
  uv run run_api.py \
  >"${RUN_DIR}/api.log" 2>&1 &
echo $! > "${RUN_DIR}/api.pid"

nohup env API_URL="${API_URL}" SURREAL_URL="${SURREAL_URL}" NO_PROXY="${NO_PROXY}" no_proxy="${NO_PROXY}" \
  uv run surreal-commands-worker --import-modules commands \
  >"${RUN_DIR}/worker.log" 2>&1 &
echo $! > "${RUN_DIR}/worker.pid"

nohup env API_URL="${API_URL}" NO_PROXY="${NO_PROXY}" no_proxy="${NO_PROXY}" \
  bash -lc "cd '${ROOT_DIR}/frontend' && npm run dev -- -H 0.0.0.0 -p 3000" \
  >"${RUN_DIR}/frontend.log" 2>&1 &
echo $! > "${RUN_DIR}/frontend.pid"

for _ in {1..60}; do
  if curl -fsS "http://localhost:${API_PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

if ! curl -fsS "http://localhost:${API_PORT}/health" >/dev/null 2>&1; then
  echo "API failed to start. Logs: ${RUN_DIR}/api.log" >&2
  exit 1
fi

for _ in {1..60}; do
  if curl -fsS "http://localhost:3000/config" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

if ! curl -fsS "http://localhost:3000/config" >/dev/null 2>&1; then
  echo "Frontend failed to start. Logs: ${RUN_DIR}/frontend.log" >&2
  exit 1
fi

echo "UI:  http://${LAN_IP}:3000"
echo "API: http://${LAN_IP}:5055"

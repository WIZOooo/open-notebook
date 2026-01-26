#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------------------
# Open Notebook - Docker Compose 一键部署脚本（公司服务器推荐）
#
# 适用场景：
# - 在公司服务器上长期运行（版本可控、便于审计与运维）
# - 使用 “多容器 Compose”：SurrealDB 独立 + 应用容器（API + UI）
#
# 脚本做了什么：
# 1) 检查 Docker / docker compose 是否可用
# 2) 检查配置文件 docker.env 是否存在（不存在则从 docker.env.example 生成）
# 3) 创建数据目录 notebook_data/ 与 surreal_data/（用于持久化）
# 4) 启动/停止/查看日志/检查健康
#
# 使用方法：
# - 首次部署（推荐）：
#     bash scripts/deploy-compose.sh
#
# - 常用命令：
#     bash scripts/deploy-compose.sh up
#     bash scripts/deploy-compose.sh status
#     bash scripts/deploy-compose.sh logs
#     bash scripts/deploy-compose.sh health
#     bash scripts/deploy-compose.sh restart
#     bash scripts/deploy-compose.sh down
#     bash scripts/deploy-compose.sh update
#
# 注意事项（生产必读）：
# - docker.env 里会包含密钥，请只放服务器本地，不要提交到仓库
# - SurrealDB 默认账号密码在 docker-compose.prod.yml 里为 root/root，生产务必修改
#   修改时需要同时改：docker-compose.prod.yml（surrealdb 的 --user/--pass）与 docker.env（SURREAL_*）
# -----------------------------------------------------------------------------

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
ENV_FILE="${ROOT_DIR}/docker.env"
ENV_EXAMPLE_FILE="${ROOT_DIR}/docker.env.example"

cd "${ROOT_DIR}"

usage() {
  cat <<'EOF'
用法：
  bash scripts/deploy-compose.sh [command]

command:
  up        启动服务（默认）
  down      停止并删除容器（保留数据卷/目录）
  restart   重启服务
  status    查看服务状态
  logs      跟踪日志（可选：logs <service>）
  health    检查 API 健康状态（/health）
  update    更新/重建并重启（SurrealDB 拉取新镜像 + 应用重新 build）

示例：
  bash scripts/deploy-compose.sh
  bash scripts/deploy-compose.sh logs
  bash scripts/deploy-compose.sh logs open_notebook
EOF
}

log() {
  printf "%s\n" "$*"
}

die() {
  printf "错误：%s\n" "$*" >&2
  exit 1
}

ensure_docker() {
  command -v docker >/dev/null 2>&1 || die "未找到 docker，请先安装 Docker / Docker Desktop"
  docker info >/dev/null 2>&1 || die "Docker 未运行或当前用户无权限访问 Docker"
  docker compose version >/dev/null 2>&1 || die "未找到 docker compose（需要 Docker Compose v2：docker compose ...）"
}

ensure_files() {
  [[ -f "${COMPOSE_FILE}" ]] || die "缺少 ${COMPOSE_FILE}"
  [[ -f "${ENV_EXAMPLE_FILE}" ]] || die "缺少 ${ENV_EXAMPLE_FILE}"
}

ensure_env() {
  if [[ ! -f "${ENV_FILE}" ]]; then
    log "检测到未配置 ${ENV_FILE}"
    log "将从模板生成：${ENV_EXAMPLE_FILE} -> ${ENV_FILE}"
    cp "${ENV_EXAMPLE_FILE}" "${ENV_FILE}"
    log ""
    log "下一步：请编辑 ${ENV_FILE}，至少配置一个 AI Provider Key（例如 OPENAI_API_KEY）。"
    log "编辑完成后重新执行：bash scripts/deploy-compose.sh up"
    exit 2
  fi
}

ensure_data_dirs() {
  mkdir -p "${ROOT_DIR}/notebook_data" "${ROOT_DIR}/surreal_data"
}

sanitize_local_proxy_env() {
  local proxy_values
  proxy_values="${HTTP_PROXY:-} ${http_proxy:-} ${HTTPS_PROXY:-} ${https_proxy:-} ${ALL_PROXY:-} ${all_proxy:-}"

  if [[ "${proxy_values}" == *"127.0.0.1"* || "${proxy_values}" == *"localhost"* ]]; then
    log "检测到本地代理环境变量指向 127.0.0.1/localhost，可能导致容器构建阶段无法访问外网仓库。"
    log "将临时清理本地代理变量（不影响 docker.env 内的配置）：HTTP(S)_PROXY / ALL_PROXY / NO_PROXY"
    unset ALL_PROXY all_proxy HTTP_PROXY http_proxy HTTPS_PROXY https_proxy NO_PROXY no_proxy
  fi
}

compose() {
  docker compose -f "${COMPOSE_FILE}" "$@"
}

health_check() {
  local max_attempts=60
  local attempt=0

  log "等待 API 就绪：http://localhost:5055/health"
  while (( attempt < max_attempts )); do
    if curl -fsS "http://localhost:5055/health" >/dev/null 2>&1; then
      log "✓ API 健康检查通过"
      log "UI:  http://localhost:8502"
      log "API: http://localhost:5055/docs"
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done

  log "✗ API 健康检查失败（超时）"
  log "建议排查："
  log "  1) 查看状态：docker compose -f docker-compose.prod.yml ps"
  log "  2) 查看日志：docker compose -f docker-compose.prod.yml logs --tail=200 open_notebook surrealdb"
  return 1
}

main() {
  local cmd="${1:-up}"

  ensure_docker
  ensure_files
  ensure_data_dirs
  sanitize_local_proxy_env

  case "${cmd}" in
    up)
      ensure_env
      compose up -d
      health_check
      ;;
    down)
      compose down
      ;;
    restart)
      compose up -d
      health_check
      ;;
    status)
      compose ps
      ;;
    logs)
      if [[ $# -ge 2 ]]; then
        compose logs -f --tail=200 "$2"
      else
        compose logs -f --tail=200
      fi
      ;;
    health)
      health_check
      ;;
    update)
      ensure_env
      compose pull || true
      compose up -d
      health_check
      ;;
    -h|--help|help)
      usage
      ;;
    *)
      usage
      die "未知命令：${cmd}"
      ;;
  esac
}

main "$@"

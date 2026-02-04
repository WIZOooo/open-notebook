#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------------------
# Open Notebook - 多用户自动部署脚本
#
# 功能：
# 1. 为每个用户分配独立的端口（自动递增，从 10000 开始）
# 2. 为每个用户创建独立的数据目录（users/<username>/）
# 3. 自动生成并启动独立的 Docker 容器
#
# 用法：
#   bash scripts/deploy-user.sh <username> [command]
#
# 示例：
#   bash scripts/deploy-user.sh zhangsan        # 启动（默认）
#   bash scripts/deploy-user.sh zhangsan down   # 停止
#   bash scripts/deploy-user.sh zhangsan logs   # 查看日志
#   bash scripts/deploy-user.sh list            # 查看所有用户端口
# -----------------------------------------------------------------------------

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USERS_DIR="${ROOT_DIR}/users"
PORTS_MAP="${USERS_DIR}/ports.map"
TEMPLATE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
ENV_FILE="${ROOT_DIR}/docker.env"

# 服务器 IP 地址（请根据实际情况修改）
# 如果是本地测试，可以使用 "localhost"
# 如果是公司服务器，请填写真实 IP，例如 "172.16.11.41"
SERVER_IP="172.16.11.41"

# 颜色输出
info() { printf "\033[36m[INFO]\033[0m %s\n" "$*"; }
success() { printf "\033[32m[SUCCESS]\033[0m %s\n" "$*"; }
warn() { printf "\033[33m[WARN]\033[0m %s\n" "$*"; }
error() { printf "\033[31m[ERROR]\033[0m %s\n" "$*" >&2; exit 1; }

# 初始化目录和文件
init_system() {
    if [[ ! -f "${ENV_FILE}" ]]; then
        error "未找到 ${ENV_FILE}，请先运行 'cp docker.env.example docker.env' 并配置密钥。"
    fi
    mkdir -p "${USERS_DIR}"
    if [[ ! -f "${PORTS_MAP}" ]]; then
        touch "${PORTS_MAP}"
    fi

    # 检查本地镜像是否存在，不存在则构建
    if ! docker image inspect open_notebook:local >/dev/null 2>&1; then
        warn "本地镜像 open_notebook:local 不存在，开始构建..."
        # 尝试使用 Makefile 构建
        if [[ -f "${ROOT_DIR}/Makefile" ]]; then
            info "发现 Makefile，使用 make docker-build-local 构建..."
            (cd "${ROOT_DIR}" && make docker-build-local) || error "构建失败，请检查 Docker 环境或网络"
        else
            info "未找到 Makefile，使用 docker build 构建..."
            docker build -t open_notebook:local "${ROOT_DIR}" || error "构建失败，请检查 Docker 环境或网络"
        fi
        success "镜像构建成功！"
    fi
}

# 获取或分配端口
# 返回值：设置全局变量 PORT_UI 和 PORT_API
allocate_port() {
    local user="$1"
    local saved_port
    
    # 1. 尝试从文件中查找已存在的端口
    if grep -q "^${user}=" "${PORTS_MAP}"; then
        saved_port=$(grep "^${user}=" "${PORTS_MAP}" | cut -d'=' -f2)
        PORT_UI=$saved_port
        PORT_API=$((saved_port + 1))
        info "用户 ${user} 已存在，使用分配端口: UI=${PORT_UI}, API=${PORT_API}"
        return
    fi

    # 2. 分配新端口
    local last_port
    last_port=$(tail -n 1 "${PORTS_MAP}" | cut -d'=' -f2 || echo "")
    
    if [[ -z "${last_port}" ]]; then
        # 第一个用户，从 10000 开始
        PORT_UI=10000
    else
        # 即使文件中有空行，cut 可能会失败，确保是数字
        if ! [[ "$last_port" =~ ^[0-9]+$ ]]; then
            last_port=10000
        fi
        PORT_UI=$((last_port + 2))
    fi
    
    PORT_API=$((PORT_UI + 1))
    
    # 写入记录
    echo "${user}=${PORT_UI}" >> "${PORTS_MAP}"
    success "为新用户 ${user} 分配端口: UI=${PORT_UI}, API=${PORT_API}"
}

# 生成用户专属的 docker-compose 文件
generate_compose() {
    local user="$1"
    local user_dir="${USERS_DIR}/${user}"
    local compose_file="${user_dir}/docker-compose.yml"
    
    mkdir -p "${user_dir}/notebook_data"
    mkdir -p "${user_dir}/surreal_data"
    
    info "生成配置文件: ${compose_file}"
    
    # 读取模板，替换端口和 env 路径
    # 注意：这里假设模板文件格式相对固定
    # 1. 替换 env_file: ./docker.env 为 ../../docker.env (因为在 users/name/ 下)
    # 2. 替换端口 8502:8502 为 ${PORT_UI}:8502
    # 3. 替换端口 5055:5055 为 ${PORT_API}:5055
    # 4. 设置 API_URL 为完整 URL（解决浏览器端 fetch 失败的问题）
    #    注意：这里使用配置的 SERVER_IP，确保远程访问正常
    
    local api_url="http://${SERVER_IP}:${PORT_UI}"
    
    sed -e "s|\./docker.env|../../docker.env|g" \
        -e "s|\"8502:8502\"|\"${PORT_UI}:8502\"|g" \
        -e "s|\"5055:5055\"|\"${PORT_API}:5055\"|g" \
        "${TEMPLATE_FILE}" > "${compose_file}"
    
    # 在 environment 下面插入 API_URL
    # 使用临时文件方案，兼容 Linux 和 macOS
    sed "s|      - HTTP_PROXY=|      - API_URL=${api_url}\n      - HTTP_PROXY=|" "${compose_file}" > "${compose_file}.tmp" && mv "${compose_file}.tmp" "${compose_file}"
        
    # 确保 volume 路径是相对的（模板里本来就是 ./surreal_data，在子目录里正好对应 users/name/surreal_data）
}

# 列出所有用户
list_users() {
    echo "----------------------------------------"
    printf "%-15s %-10s %-10s %s\n" "用户(User)" "UI端口" "API端口" "访问地址"
    echo "----------------------------------------"
    if [[ ! -s "${PORTS_MAP}" ]]; then
        echo "(暂无已部署用户)"
        return
    fi
    
    while IFS='=' read -r user port; do
        if [[ -n "$user" && -n "$port" ]]; then
            printf "%-15s %-10s %-10s http://%s:%s\n" "$user" "$port" "$((port+1))" "${SERVER_IP}" "$port"
        fi
    done < "${PORTS_MAP}"
    echo "----------------------------------------"
}

main() {
    if [[ $# -eq 0 ]]; then
        echo "用法: bash scripts/deploy-user.sh <username> [up|down|restart|logs]"
        echo "查看列表: bash scripts/deploy-user.sh list"
        exit 1
    fi

    local cmd="${1}"
    
    if [[ "$cmd" == "list" ]]; then
        init_system
        list_users
        exit 0
    fi
    
    local user="$cmd"
    local action="${2:-up}"
    
    init_system
    
    # 验证用户名（只允许字母数字下划线）
    if ! [[ "$user" =~ ^[a-zA-Z0-9_]+$ ]]; then
        error "用户名只能包含字母、数字和下划线"
    fi
    
    allocate_port "$user"
    
    local user_dir="${USERS_DIR}/${user}"
    local compose_file="${user_dir}/docker-compose.yml"
    local project_name="nb_${user}"
    
    if [[ "$action" == "up" || "$action" == "restart" ]]; then
        generate_compose "$user"
    fi
    
    # 执行 docker compose 命令
    info "执行操作: ${action} (Project: ${project_name})"
    
    case "$action" in
        up)
            docker compose -p "${project_name}" -f "${compose_file}" up -d
            success "服务已启动！"
            echo "   UI 地址: http://${SERVER_IP}:${PORT_UI}"
            echo "   API 地址: http://${SERVER_IP}:${PORT_API}"
            ;;
        down)
            if [[ -f "${compose_file}" ]]; then
                docker compose -p "${project_name}" -f "${compose_file}" down
                success "服务已停止"
            else
                warn "找不到配置文件，可能未部署或已被删除"
            fi
            ;;
        restart)
            docker compose -p "${project_name}" -f "${compose_file}" restart
            success "服务已重启"
            ;;
        logs)
            if [[ -f "${compose_file}" ]]; then
                docker compose -p "${project_name}" -f "${compose_file}" logs -f --tail=100
            else
                error "找不到配置文件"
            fi
            ;;
        *)
            error "未知命令: ${action}"
            ;;
    esac
}

main "$@"
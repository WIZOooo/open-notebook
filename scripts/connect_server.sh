#!/bin/bash
set -euo pipefail

# 连接到 Go 服务器的脚本
# 使用方法: bash connect_server.sh

SERVER="${SERVER:-172.16.11.41}"
SSH_USER="${SSH_USER:-dev}"

echo "目标服务器: $SERVER"
echo "用户名: $SSH_USER"
echo ""

echo "连接前自检："
if route -n get "$SERVER" >/dev/null 2>&1; then
  echo "  路由信息："
  route -n get "$SERVER" 2>/dev/null | egrep '^[[:space:]]*(route to:|gateway:|interface:)' || true
else
  echo "  路由信息：未找到到 $SERVER 的路由（常见原因：不在公司内网 / VPN 未连接 / WiFi 被隔离）"
fi

if command -v nc >/dev/null 2>&1; then
  if nc -vz -w 3 "$SERVER" 22 >/dev/null 2>&1; then
    echo "  端口探测：$SERVER:22 可达"
  else
    echo "  端口探测：$SERVER:22 连接失败或超时（常见原因：网络/VLAN/防火墙策略）"
  fi
else
  echo "  端口探测：未找到 nc，已跳过"
fi

if command -v scutil >/dev/null 2>&1; then
  if scutil --nc list 2>/dev/null | egrep -i 'tailscale' >/dev/null 2>&1; then
    if scutil --nc list 2>/dev/null | egrep -i '\\(Disconnected\\).*tailscale' >/dev/null 2>&1; then
      echo "  VPN 提示：检测到 Tailscale 存在但未连接（这通常会导致内网 IP 访问超时）"
    fi
  fi
fi

echo ""
echo "================================================"
echo "开始 SSH 连接（退出请按 Ctrl+D 或输入 exit）"
echo ""
echo "连接后可以执行的常用命令："
echo "  1. 查找 Go 服务: find ~ -name 'reship_srv' 2>/dev/null"
echo "  2. 查看日志: find ~ -name 'call_record.log' 2>/dev/null"
echo "  3. 查看进程: ps aux | grep reship"
echo "  4. 查看当前目录: pwd && ls -la"
echo ""

exec ssh "${SSH_USER}@${SERVER}"

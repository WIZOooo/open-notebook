#!/bin/bash

# 连接到 Go 服务器的脚本
# 使用方法: bash connect_server.sh

SERVER="172.16.11.41"
USER="dev"

echo "正在连接到服务器 $SERVER ..."
echo "用户名: $USER"
echo "密码: moer_+123"
echo ""
echo "连接后可以执行的常用命令："
echo "  1. 查找 Go 服务: find ~ -name 'reship_srv' 2>/dev/null"
echo "  2. 查看日志: find ~ -name 'call_record.log' 2>/dev/null"
echo "  3. 查看进程: ps aux | grep reship"
echo "  4. 查看当前目录: pwd && ls -la"
echo ""
echo "按 Ctrl+D 或输入 exit 退出服务器"
echo "================================================"
echo ""

ssh $USER@$SERVER


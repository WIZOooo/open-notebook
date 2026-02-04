# Open Notebook 多用户独立部署指南

本指南介绍如何使用 `scripts/deploy-user.sh` 脚本，在同一台公司服务器上为多位同事快速部署独立的 Open Notebook 实例。

## ✨ 核心功能

*   **自动端口分配**：无需手动管理端口，脚本自动从 `10000` 开始分配（每人占用 2 个端口：UI 和 API）。
*   **数据完全隔离**：每位用户的数据独立存储在 `users/<用户名>/` 目录下，互不干扰。
*   **适配远程访问**：支持配置服务器 IP，确保局域网内访问正常。

---

## 🚀 快速开始

### 1. 配置服务器 IP

在首次运行前，请打开 `scripts/deploy-user.sh`，修改顶部的 `SERVER_IP` 变量为您的服务器实际 IP 地址：

```bash
# 打开脚本文件
vim scripts/deploy-user.sh

# 修改这一行（例如改为 172.16.11.41）
SERVER_IP="172.16.11.41"
```

### 2. 部署新用户

只需指定一个用户名（拼音或英文），脚本会自动完成所有配置：

```bash
bash scripts/deploy-user.sh zhangsan
```

**脚本会自动执行以下操作：**
1.  检查端口占用，自动分配可用端口（例如 UI:10000, API:10001）。
2.  创建数据目录：`users/zhangsan/notebook_data` 和 `users/zhangsan/surreal_data`。
3.  生成专属配置：`users/zhangsan/docker-compose.yml`（自动填入正确的 `API_URL`）。
4.  启动 Docker 容器。

### 3. 查看所有用户

查看当前已部署的用户列表及访问地址：

```bash
bash scripts/deploy-user.sh list
```

输出示例：
```text
----------------------------------------
用户(User)    UI端口   API端口  访问地址
----------------------------------------
zhangsan        10000      10001      http://172.16.11.41:10000
lisi            10002      10003      http://172.16.11.41:10002
----------------------------------------
```

---

## ⚙️ 管理命令

| 操作 | 命令 | 说明 |
| :--- | :--- | :--- |
| **启动/更新** | `bash scripts/deploy-user.sh <用户名> up` | 首次部署或更新配置时使用 |
| **停止服务** | `bash scripts/deploy-user.sh <用户名> down` | 停止并删除容器（保留数据） |
| **重启服务** | `bash scripts/deploy-user.sh <用户名> restart` | 仅重启容器 |
| **查看日志** | `bash scripts/deploy-user.sh <用户名> logs` | 实时查看运行日志（按 Ctrl+C 退出） |

---

## 📂 数据管理与扩容

### 数据位置
所有用户数据都存储在项目根目录下的 `users/` 文件夹中：
```text
open-notebook/
└── users/
    ├── zhangsan/
    │   ├── notebook_data/  <-- 笔记、上传的文件
    │   ├── surreal_data/   <-- 数据库文件
    │   └── docker-compose.yml
    └── lisi/
        └── ...
```

### 如何备份/迁移
由于数据是基于文件存储的，备份非常简单：
*   **备份**：直接复制 `users/<用户名>` 文件夹即可。
*   **迁移**：将文件夹复制到新服务器的同样位置，然后运行 `bash scripts/deploy-user.sh <用户名> up` 即可恢复服务。

### 磁盘扩容
如果服务器磁盘空间不足，您可以挂载新的硬盘，然后将 `users/` 目录移动到新硬盘，并创建一个软链接指向原位置。

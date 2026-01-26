## 目标

* 在公司服务器（AlmaLinux 9.7）上用 Docker Compose 部署 Open Notebook。

* 访问方式：

  * UI：`http://服务器IP:8502`

  * API：`http://服务器IP:5055`

* 数据持久化：`notebook_data/`、`surreal_data/` 两个目录。

***

## 0. 你现在的前置结论

* 服务器是 **AlmaLinux 9.7**（EL9）。

* 当前 `docker` 命令不存在：说明 **Docker 尚未安装**。

* 你在 `/srv` 没权限创建目录：建议先用 `/home/dev` 部署（最省事），后续再迁移到 `/srv`/`/opt` 也可以。

***

## 1. 检查你是否有 sudo（决定你自己装还是找运维）

```bash
sudo -n true && echo HAS_SUDO || echo NO_SUDO
```

* 作用：测试当前用户是否有 sudo 权限且不需要交互输入密码。

* 结果解释：

  * 输出 `HAS_SUDO`：你可以继续按下面命令自行安装 Docker。

  * 输出 `NO_SUDO`：你把“第 2 节安装 Docker 的命令”发给运维执行，你从“第 3 节部署目录”继续。

***

## 2. 在 AlmaLinux 9 安装 Docker Engine + Compose v2

> 这一节所有命令都需要 sudo。如果你没有 sudo，把这一整段交给运维执行。

### 2.1 安装 dnf 插件

```bash
sudo dnf -y install dnf-plugins-core
```

* 作用：安装 `dnf config-manager` 等仓库管理工具，后面要用它添加 Docker 官方仓库。

### 2.2 添加 Docker 官方仓库（CentOS/EL 通用）

```bash
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
```

* 作用：把 Docker 官方 yum/dnf 源加入系统，这样才能安装 `docker-ce` 和 `docker-compose-plugin`。

### 2.3 安装 Docker 与 Compose 插件

```bash
sudo dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

* 作用：

  * `docker-ce/docker-ce-cli`：Docker 引擎与命令行

  * `containerd.io`：容器运行时

  * `docker-compose-plugin`：`docker compose`（Compose v2）

  * `docker-buildx-plugin`：构建镜像需要（即使你用拉镜像，也建议装）

### 2.4 启动 Docker 并设置开机自启

```bash
sudo systemctl enable --now docker
```

* 作用：立即启动 Docker 服务，并设置重启服务器后自动启动。

### 2.5 验证 Docker/Compose 是否安装成功

```bash
sudo docker version
```

* 作用：确认 Docker 引擎可用、客户端能连上服务端。

```bash
sudo docker compose version
```

* 作用：确认 Compose v2 插件可用。

### 2.6 让 dev 用户免 sudo 使用 docker（可选但强烈推荐）

```bash
sudo usermod -aG docker dev
```

* 作用：把 dev 加入 docker 用户组，这样后续 `docker ...` 不用每次 sudo。

```bash
exit
```

* 作用：退出当前 SSH 会话（必须重新登录才能让“组权限变更”生效）。

重新登录后再验证：

```bash
docker version
```

* 作用：确认无需 sudo 也能使用 docker。

```bash
docker compose version
```

* 作用：确认无需 sudo 也能使用 compose。

***

## 3. 选择部署目录（建议先用 /home/dev）

```bash
mkdir -p /home/dev/open-notebook
```

* 作用：创建部署目录（你有权限，不会像 `/srv` 那样报权限不足）。

```bash
cd /home/dev/open-notebook
```

* 作用：进入部署目录，后续所有文件都放这里。

```bash
pwd
```

* 作用：确认你当前所在目录正确（避免在错误目录执行 compose）。

***

## 4. 把项目代码/文件放到服务器（两种方式选一种）

### 方式 A：服务器能直接 git 拉取（推荐）

```bash
git clone <你的仓库地址> .
```

* 作用：把仓库内容克隆到当前目录（`.` 表示克隆到当前目录而不是子目录）。

### 方式 B：从本机上传（不依赖 git）

* 你从本机上传这些文件到 `/home/dev/open-notebook`：

  * `docker-compose.prod.yml`

  * `docker.env.example`

  * `scripts/deploy-compose.sh`

* 作用：只上传最小可运行文件集。

> 注意：你在服务器上执行部署脚本前，需要确保 `scripts/deploy-compose.sh` 有执行权限。如果没权限：

```bash
chmod +x scripts/deploy-compose.sh
```

* 作用：给脚本加可执行权限。

***

## 5. 配置 docker.env（最关键，决定浏览器能否连上 API）

```bash
cp docker.env.example docker.env
```

* 作用：用模板生成真实配置文件。`docker.env` 里会放密钥，**不要提交到仓库**。

```bash
vi docker.env
```

* 作用：编辑配置文件，必须修改以下两类内容：

  1. **API\_URL**（重要）

     * 你从电脑访问 UI 用 `http://172.16.11.41:8502`，那 `docker.env` 里必须写：

       * `API_URL=http://172.16.11.41:5055`

     * 解释：前端会通过这个地址去请求 API；如果写成 `localhost`，那是“浏览器自己的 localhost”，一定会连错。
  2. **至少一个模型 Key**（重要）

     * `OPENAI_API_KEY=...` 或 `OPENAI_COMPATIBLE_*` 至少配一套。

强烈建议（生产）：

* `OPEN_NOTEBOOK_PASSWORD=...`：加访问密码。

* 修改默认 DB 密码：不要用 root/root。

***

## 6. 防火墙放行端口（如果公司用反代 80/443，这一步可后置）

### 6.1 检查 firewalld 是否启用

```bash
sudo systemctl is-active firewalld || true
```

* 作用：查看 firewalld 是否在运行（输出 `active` 表示启用）。

### 6.2 如果 firewalld 在运行，先放行 8502/5055

```bash
sudo firewall-cmd --permanent --add-port=8502/tcp
```

* 作用：允许外部访问 UI 端口 8502。

```bash
sudo firewall-cmd --permanent --add-port=5055/tcp
```

* 作用：允许外部访问 API 端口 5055（浏览器需要访问它，除非你做同域名反代 `/api`）。

```bash
sudo firewall-cmd --reload
```

* 作用：让防火墙规则立即生效。

***

## 7. 处理 SELinux（AlmaLinux 常见坑，避免容器无法写数据目录）

```bash
getenforce
```

* 作用：查看 SELinux 模式。

  * `Enforcing`：强制模式，容器对宿主机目录写入可能被拒绝。

  * `Permissive/Disabled`：影响较小。

如果是 `Enforcing`，先用“目录打标”方式快速解决：

```bash
mkdir -p notebook_data surreal_data
```

* 作用：创建持久化目录（容器会把数据写入这里）。

```bash
sudo chcon -Rt svirt_sandbox_file_t notebook_data surreal_data
```

* 作用：给目录设置容器可写的 SELinux 上下文，避免 DB/应用因为权限问题启动失败。

***

## 8. 一键启动（使用仓库内脚本）

```bash
bash scripts/deploy-compose.sh up
```

* 作用：

  * 启动（或拉取）镜像

  * 创建/使用持久化目录

  * 启动 compose 服务

  * 等待并检查 `http://localhost:5055/health` 直到健康

***

## 9. 验证部署

### 9.1 服务器本机验证 API 健康

```bash
curl -fsS http://localhost:5055/health
```

* 作用：从服务器本机确认 API 已启动。

* 预期输出：`{"status":"healthy"}`

### 9.2 你的电脑浏览器验证

* 打开：`http://172.16.11.41:8502`

* 如果出现“无法连接到 API”：

  * 优先检查 `docker.env` 的 `API_URL` 是否写成了服务器 IP（不要写 localhost）。

***

## 10. 常用运维命令

```bash
bash scripts/deploy-compose.sh status
```

* 作用：查看服务状态（相当于 `docker compose ps`）。

```bash
bash scripts/deploy-compose.sh logs
```

* 作用：查看所有服务日志。

```bash
bash scripts/deploy-compose.sh logs open_notebook
```

* 作用：只看应用容器日志（排查前端/API）。

```bash
bash scripts/deploy-compose.sh logs surrealdb
```

* 作用：只看数据库日志（排查 DB 启动、数据损坏、权限问题）。

```bash
bash scripts/deploy-compose.sh down
```

* 作用：停止并删除容器（**不会删除** `notebook_data/`、`surreal_data/` 数据目录）。

***

## 11. 安全提醒（必须）

* 你仓库里存在明文密码脚本（connect\_server.sh）。生产环境强烈建议：改为 SSH Key/堡垒机，并从仓库移除密码信息。

***

如果你认可这份逐步计划，我下一步会按“你执行一条命令 → 你贴输出 → 我告诉你下一条命令 + 判断是否成功”的方式，陪你把服务器部署完整跑通。

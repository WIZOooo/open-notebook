## 将要执行的推荐部署方式
- **多容器 Docker Compose + 本仓库 `Dockerfile` 构建应用镜像**（用于公司服务器，版本可控、便于审计与运维）。

## 我会做的改动（文件级别）
### A. 新增生产 Compose
- 新增 `docker-compose.prod.yml`
  - 服务：`surrealdb`（官方镜像）+ `open_notebook`（`build: Dockerfile`）
  - 端口：UI `8502`、API `5055`、DB `8000`（DB 端口可按公司要求关闭对外，仅内部网络访问）
  - 持久化：`./notebook_data:/app/data`、`./surreal_data:/mydata`
  - `env_file: ./docker.env`
  - 增加健康检查（healthcheck）与 `restart: always`

### B. 修正 3 处 SurrealDB URL 示例/回退错误（避免照抄即出错）
- 修改 [repository.py](file:///Users/imac/Documents/open-notebook/open_notebook/database/repository.py)
  - 将旧变量回退拼接从 `ws://{host}/rpc:{port}` 改为 `ws://{host}:{port}/rpc`
- 修改 [.env.example](file:///Users/imac/Documents/open-notebook/.env.example)
  - 将示例 `SURREAL_URL` 改为 `ws://surrealdb:8000/rpc`
- 修改 [setup_guide/docker.env](file:///Users/imac/Documents/open-notebook/setup_guide/docker.env)
  - 将示例 `SURREAL_URL` 改为 `ws://localhost:8000/rpc`（并移除不必要引号）

### C. 新增安全的环境变量模板
- 新增 `docker.env.example`
  - 仅提供最小可运行项（不包含任何真实密钥）
  - 提示你在公司环境务必修改默认 DB 账号/密码、建议设置 `OPEN_NOTEBOOK_PASSWORD`

### D. 新增一键部署脚本（中文详细注释）
- 新增 `scripts/deploy-compose.sh`
  - 默认使用 `docker-compose.prod.yml`
  - 行为：
    - 检查 Docker 与 `docker compose` 是否可用
    - 如果缺少 `docker.env`：从 `docker.env.example` 复制生成，并提示你补齐 key
    - 自动创建 `notebook_data/`、`surreal_data/`
    - `up`：`docker compose -f docker-compose.prod.yml up -d --build`
    - `status`：`docker compose ps`
    - `logs`：`docker compose logs -f`
    - `down`：`docker compose down`
    - `update`：重新 build 并滚动重启
    - `health`：轮询 `http://localhost:5055/health`，失败时给出定位指引

## 验证（我会在实现后实际执行）
- `docker compose -f docker-compose.prod.yml ps` 显示运行/健康
- `curl http://localhost:5055/health` 返回 healthy
- 浏览器打开 `http://localhost:8502` 正常加载并能调用 API

## 注意（安全/生产必做）
- 你当前仓库根目录的 [docker.env](file:///Users/imac/Documents/open-notebook/docker.env) 含真实 key：我会在脚本与模板中引导用 `docker.env.example`，并避免任何输出/日志泄露密钥；实际密钥请只放服务器本地文件，不提交到仓库。

## 你问的：为什么要 `cp .env.example .env`？
- **目的**：生成一份“只属于你本机”的运行配置文件，里面放**密钥**和**环境差异配置**（不会提交到仓库）。
- `.env.example` 是一个**模板**：列出项目可能用到的环境变量及默认值/示例（例如 `OPENAI_API_KEY`、数据库连接、端口、`OPEN_NOTEBOOK_PASSWORD` 等）。
- 复制成 `.env` 后，项目会在本地启动时读取它：
  - worker 启动命令明确用 `--env-file .env`（见 [Makefile](file:///Users/imac/Documents/open-notebook/Makefile)）。
  - API 启动脚本 `run_api.py` 会从环境变量读取 `API_HOST/API_PORT`（见 [run_api.py](file:///Users/imac/Documents/open-notebook/run_api.py)）。
- 如果你不想用 `.env` 文件，也可以用“终端里 export 环境变量”的方式；但 `.env` 更方便、可复用。

## docker.env 到底什么时候用？
- **用 Docker/Compose 部署**更推荐 `docker.env`：compose 通过 `env_file: ./docker.env` 把变量注入容器。
- 本仓库自带的 [docker-compose.dev.yml](file:///Users/imac/Documents/open-notebook/docker-compose.dev.yml) / [docker-compose.full.yml](file:///Users/imac/Documents/open-notebook/docker-compose.full.yml) / [docker-compose.single.yml](file:///Users/imac/Documents/open-notebook/docker-compose.single.yml) 都已经配置了 `env_file: ./docker.env`，所以你在 `docker.env` 里配提供商 Key **可以直接生效**。
- **源码开发（方案 C）**通常用 `.env`（尤其是 worker），所以才会做 `cp .env.example .env`。

## 方案 C：源码本地开发（跑起来）
- 参考： [from-source.md](file:///Users/imac/Documents/open-notebook/docs/1-INSTALLATION/from-source.md) 、[README.dev.md](file:///Users/imac/Documents/open-notebook/README.dev.md)
- 最短路径：
  1. `cp .env.example .env`，然后编辑 `.env`：至少填一个 provider key（如 `OPENAI_API_KEY=...`），或配置本地 Ollama/OpenAI-Compatible。
  2. `uv sync`
  3. `make start-all`
  4. 本机访问：前端 `http://localhost:3000`，API 文档 `http://localhost:5055/docs`

## 方案 C：暴露到局域网给同事用
1) API 监听改成局域网可访问：在 `.env` 里设置 `API_HOST=0.0.0.0`（默认是 127.0.0.1）。
2) 前端 dev 监听改成局域网可访问：`cd frontend && npm run dev -- -H 0.0.0.0 -p 3000`。
3) 同事访问：`http://<你的局域网IP>:3000`；前端会自动推断 API 为 `http://<你的IP>:5055`（见 [config.ts](file:///Users/imac/Documents/open-notebook/frontend/src/lib/config.ts)）。
4) 建议加密码：在 `.env` 里加 `OPEN_NOTEBOOK_PASSWORD=...`（见 [security.md](file:///Users/imac/Documents/open-notebook/docs/5-CONFIGURATION/security.md)）。

## 端口速查
- 开发模式：前端 `3000`，API `5055`，DB `8000`。

## 我接下来会做什么（你确认后我再执行）
- 结合你现在到底是“make start-all 一把梭”还是“分别起服务”，把命令整理成一套最短可复制步骤，并附验证/排错清单。
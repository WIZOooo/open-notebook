## 你当前的错误是什么意思
你执行 `bash scripts/deploy-compose.sh up` 拉取 `surrealdb/surrealdb:v2` 时失败：

```
failed to resolve reference "docker.io/surrealdb/surrealdb:v2" ... i/o timeout
```

这说明：**服务器访问 Docker Hub（registry-1.docker.io:443）网络不通或被公司策略拦截**，所以镜像拉不下来，部署无法继续。

---

## 总体思路
先把“镜像拉取链路”打通（这是当前唯一阻塞点），然后再继续 Compose 部署。

你有三条路可选（按企业常用优先级）：
1) **公司镜像仓库 / 镜像加速（推荐）**：给 Docker 配置 registry mirror（内部 Harbor/代理/加速器）。
2) **走代理（次优）**：给 Docker daemon 配置 HTTP/HTTPS 代理。
3) **离线导入（兜底）**：在能上网的机器拉镜像 `docker save` 打包，拷到服务器 `docker load`。

---

## 0. 先做网络诊断（确认到底是 DNS/出网/策略哪个问题）
以下命令都在服务器上执行。

```bash
curl -I https://registry-1.docker.io/v2/ | head -n 5
```
- 在做什么：直接测试 Docker Hub registry 的 HTTPS 连通性。
- 预期：返回 `HTTP/1.1 401 Unauthorized`（这反而说明“通了”）。
- 如果超时/失败：说明出网或策略问题确实存在。

```bash
curl -I https://ghcr.io/v2/ | head -n 5
```
- 在做什么：测试 GitHub Container Registry（GHCR）连通性。
- 作用：判断你们公司是不是只封 Docker Hub，但 GHCR 可用。

```bash
getent hosts registry-1.docker.io || true
```
- 在做什么：检查 DNS 是否能解析 registry 域名。
- 如果解析失败：优先让运维处理 DNS。

---

## 1. 方案 A（推荐）：配置公司镜像仓库/加速器（registry mirror）
前提：公司通常会提供一个镜像加速地址（例如内部 Harbor、Nexus、镜像代理）。你需要找运维拿到：
- 镜像加速地址（示例：`https://mirror.company.com`）
- 如需认证：用户名/密码或 token

### 1.1 写入 Docker daemon 配置（需要 sudo）
```bash
sudo mkdir -p /etc/docker
```
- 在做什么：确保 Docker 配置目录存在。

```bash
sudo vi /etc/docker/daemon.json
```
- 在做什么：编辑 Docker daemon 配置文件。
- 需要运维给你的 mirror，写成类似：
  ```json
  {
    "registry-mirrors": ["https://mirror.company.com"]
  }
  ```

```bash
sudo systemctl restart docker
```
- 在做什么：重启 Docker daemon 让配置生效。

```bash
docker info | grep -i 'Registry Mirrors' -A 3
```
- 在做什么：确认 Docker 已识别镜像加速配置。

### 1.2 再次尝试拉镜像
```bash
docker pull surrealdb/surrealdb:v2
```
- 在做什么：验证 SurrealDB 镜像能否通过镜像加速成功拉取。

---

## 2. 方案 B：配置 Docker daemon 走公司代理（HTTP/HTTPS proxy）
前提：公司提供代理地址（示例：`http://proxy.company.com:8080`）。

### 2.1 给 systemd 的 Docker 服务配置代理（需要 sudo）
```bash
sudo mkdir -p /etc/systemd/system/docker.service.d
```
- 在做什么：创建 systemd override 目录。

```bash
sudo vi /etc/systemd/system/docker.service.d/http-proxy.conf
```
- 在做什么：写入 Docker daemon 代理配置。
- 内容示例（由运维提供代理地址与 NO_PROXY 范围）：
  ```ini
  [Service]
  Environment="HTTP_PROXY=http://proxy.company.com:8080"
  Environment="HTTPS_PROXY=http://proxy.company.com:8080"
  Environment="NO_PROXY=localhost,127.0.0.1,172.16.0.0/16"
  ```

```bash
sudo systemctl daemon-reload
```
- 在做什么：让 systemd 重新加载配置。

```bash
sudo systemctl restart docker
```
- 在做什么：重启 Docker daemon 让代理生效。

```bash
sudo systemctl show --property=Environment docker
```
- 在做什么：检查 Docker 服务进程环境变量是否带上了代理。

### 2.2 再次尝试拉镜像
```bash
docker pull surrealdb/surrealdb:v2
```
- 在做什么：验证代理链路是否打通。

---

## 3. 方案 C（兜底）：离线导入镜像
适合“服务器完全不允许出网”的情况。

### 3.1 在一台能访问 Docker Hub 的机器上拉取并打包
```bash
docker pull surrealdb/surrealdb:v2
```
- 在做什么：把 SurrealDB 镜像拉到一台能上网的机器。

```bash
docker pull lfnovo/open_notebook:v1-latest
```
- 在做什么：把 Open Notebook 镜像也拉下来。

```bash
docker save -o images.tar surrealdb/surrealdb:v2 lfnovo/open_notebook:v1-latest
```
- 在做什么：把两个镜像打包成一个 tar 文件。

### 3.2 把 images.tar 传到服务器后导入
```bash
docker load -i images.tar
```
- 在做什么：把镜像导入到服务器本地 Docker 镜像库。

```bash
docker images | egrep 'surrealdb|open_notebook'
```
- 在做什么：确认镜像已存在。

---

## 4. 镜像问题解决后：继续按 Compose 启动
当你能成功 `docker pull surrealdb/surrealdb:v2` 后，再执行：

```bash
bash scripts/deploy-compose.sh up
```
- 在做什么：启动 compose 服务（DB + 应用），并等待 API `/health` 通过。

---

## 5. 你接下来最该做什么（请按顺序）
1)
```bash
curl -I https://registry-1.docker.io/v2/ | head -n 5
```
- 在做什么：确认 Docker Hub 是否真的被阻断。

2)
```bash
curl -I https://ghcr.io/v2/ | head -n 5
```
- 在做什么：确认 GHCR 是否可用（如果 GHCR 可用，我们还可以进一步改用 GHCR 镜像源）。

3) 把两条命令的输出贴出来，我就能明确告诉你应该选“镜像加速 / 代理 / 离线导入”哪条路，以及要填的具体配置。

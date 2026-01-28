## 原因说明
- 你看到的错误：`network ... does not exist`，意思是 Docker 正在创建/启动 `open-notebook-surrealdb-1` 容器时，想把它接入 `open-notebook_default` 这个 Compose 默认网络，但 Docker 记录的网络 ID 已经不存在了。
- 最常见触发场景：
  - 在容器还存在时执行过 `docker network prune` / `docker system prune` / 手动 `docker network rm ...`，把 Compose 创建的网络删掉了；
  - 或者 Docker daemon 重启/异常后网络元数据处于不一致状态。
- 由于我们的 [deploy-compose.sh](file:///Users/imac/Documents/open-notebook/scripts/deploy-compose.sh#L155-L158) 的 `restart` 本质是 `docker compose up -d`，如果本地有“残留的旧容器/旧网络引用”，就会在接网阶段报这个错。

## 服务器侧修复步骤（不改代码，先恢复可用）
1. 在项目目录确认当前残留：
   - `docker compose -f docker-compose.prod.yml ps -a`
2. 彻底清掉该 Compose 项目残留的容器与网络（让 Compose 重新创建网络）：
   - `docker compose -f docker-compose.prod.yml down --remove-orphans`
3. 保险起见，删除同名残留网络（如果存在）：
   - `docker network rm open-notebook_default || true`
4. 重新启动：
   - `docker compose -f docker-compose.prod.yml up -d --remove-orphans`
5. 验证：
   - `docker network ls | grep open-notebook_default`
   - `docker compose -f docker-compose.prod.yml ps`

## 如果仍然复现（更底层不一致）
- 重启 Docker 服务让网络状态重建，然后再执行“down → up”：
  - `sudo systemctl restart docker`

## 我将对脚本做的改进（避免下次 restart 再踩坑）
- 调整 `restart` 行为：先尝试 `compose up -d`；若捕获到“network … does not exist/failed to set up container networking”类错误，则自动执行一次 `compose down --remove-orphans` + `compose up -d --remove-orphans`。
- 新增一个显式命令（例如 `recreate`）：一键做“down → 删除默认网络（若存在）→ up”，用于运维场景快速自愈。

确认后我会按上述方案修改脚本，并给出可直接复制到服务器执行的命令清单。
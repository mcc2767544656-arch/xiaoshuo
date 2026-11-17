# 公网部署指南（Render）

## 费用与准备

`render.yaml` 会建立付费 Starter Web Service 和 1 GB 持久磁盘。Render 的磁盘绑定付费服务，实例文件系统本身不应被当作持久存储。开始前先登录你自己的 Render 账户查看当前费用，并把本项目放入你自己控制的 GitHub 仓库。没有提交支付/部署授权前不要应用 Blueprint。

## 部署步骤

1. 把项目提交至你自己的 GitHub 仓库；仓库不得包含 `.data/`、`.env`、真实访问口令或个人书籍。
2. 在 Render Dashboard 选择创建 Blueprint，并连接你的仓库，选择仓库中的 `render.yaml`。
3. 检查资源列表确认服务计划为 `starter`、持久磁盘大小为 `1 GB`，再确认创建。
4. 在 Render 服务环境变量里填写 `QIDU_ACCESS_PASSWORD`：建议密码管理器生成独有随机口令，长度 12–256 字符；不要在聊天、代码、截图或 git 中分享。
5. 等待部署和 `/api/health` 健康检查通过。使用 Render 分配的 `https://<service>.onrender.com` 地址。
6. 若改用自定义域名，在 Render 配置域名和 HTTPS 后，将 `APP_ORIGIN` 设置为完整的 `https://your-domain` 根地址，然后重新部署。
7. 首次登录后上传一本无敏感信息的测试书，在另一台设备登录并检查书籍、阅读位置和书签；之后才上传私人藏书。

Blueprint 中 `autoDeployTrigger: off`，推送提交不会自动触发新部署；需要在 Render Dashboard 手动部署。

## 存储与备份

`QIDU_DATA_DIR=/var/data/qidu/library` 位于已挂载持久磁盘，SQLite 与书籍二进制均保存在这里。Render 磁盘不可在运行时扩容，书库目前服务端上限 500 MB；1 GB 磁盘还需容纳 SQLite、日志/运行维护余量。

定期在服务停机或通过可靠的一致性快照方式备份整个 `QIDU_DATA_DIR`，包括 SQLite WAL 相关文件及 `books/` 目录；恢复时必须保持数据库与书籍文件来自同一时点。**不要只复制正在运行中的 `qidu.sqlite` 单文件**。本版没有内置远端备份或书籍导出功能。

## 安全边界

- `QIDU_ACCESS_PASSWORD` 是栖读登录口令，与夸克账号无关。
- 单一共享登录，不支持每台设备独立撤销；退出会撤销当前会话。更改口令会令已有会话失效。
- HTTPS、HttpOnly/SameSite Cookie、CSRF 检查、登录限速、上传大小限制、私有文件鉴权均在服务端实施。
- 不要将服务端环境变量、账户 token 或整块数据磁盘公开。书籍内容作为私密个人数据保存。
- 夸克网盘尚未连接；本应用目前仅处理用户主动上传到栖读服务端的文件。

## 故障排查

- 服务无法启动并提示缺少 `APP_ORIGIN`：确认使用 Render 自动提供的 `RENDER_EXTERNAL_URL`，或设置自定义域名 `APP_ORIGIN`。
- 登录返回 421：访问的 Host 与 `APP_ORIGIN` 不一致，检查自定义域名和根地址。
- 书籍上传返回容量错误：检查单本 100 MB、书库 500 MB 上限及磁盘剩余容量。
- 重新部署后书籍消失：检查服务是否仍挂载到 `/var/data/qidu` 的持久磁盘，避免重建磁盘或在未备份时移除它。

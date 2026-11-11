# API 请求执行、认证与错误处理

准备任何实际请求前读取。接口是否允许，先看[分类入口](../gateway-api.md)和当前类别；白名单内无需额外确认，白名单外不能放行。

## 请求执行流程

1. 核对分类文档和对应版本的接口，确定当前业务请求需要的功能、目标和参数。命名 MCP 命令优先；只对未覆盖功能或已核实的兼容问题使用 HTTP 兜底。
2. 准备 UTF-8 JSON 文件（BOM 可用），仅含 `base_url,method,path,body?,reason,effect`。放在允许的工作目录，不能放 `.hedgehog/`，不要包含 Token 或自定义 Header。
3. 可选：运行 `api-preview --request-file <file>` 离线检查请求；不连接服务、不读取 Token，也不需要将预览提交用户审批。
4. 直接运行 `api-call --request-file <file>`。不要求先预览，不接受 `--confirmed-sha256`，不额外询问用户。每次调用都会重新校验实际文件，白名单外方法/路径在读取 Token 和发送网络请求前拒绝。
5. 按 HTTP 状态与业务回执报告成功、失败或结果未知。未知写入先查询核实，不能自动重放；用完清理参数文件。

```json
{
  "base_url": "http://127.0.0.1:59100",
  "method": "GET",
  "path": "/api/watchlist?list_type=watchlist",
  "reason": "已核对当前版本接口，需核实此前添加的真实结果",
  "effect": "读取当前账号的正式自选列表，不修改数据"
}
```

```bash
node <skill_path>/cli.mjs api-call --request-file '<workspace>/tmp-hog-gateway-tools-<id>.json'
```

PowerShell 使用双引号包路径，命令各占一行。通过文件工具写 JSON，不要用 shell 拼接复杂 JSON。

## 连接、身份与限制

- `base_url` 必须显式写入请求文件并核实为当前目标；仅支持当前机器上的 `localhost`、`127.0.0.1`、`[::1]`，默认部署端口通常为 59100。支持 HTTP/HTTPS，不允许 URL 内嵌凭据、路径、query 或 fragment。远端终端沿用产品连接机制，不把本机 API 暴露公网。
- API 使用**本地登录 JWT**，通过 `HEDGEHOG_GATEWAY_API_TOKEN` 或 `HEDGEHOG_GATEWAY_API_TOKEN_FILE` 二选一提供。文件仅包含 JWT；工具只读取显式提供的文件，不搜索或打印私有凭据。不接受 MCP 的 `hgmcp_...` Token，也不使用 ciwei-ai Key/Token 替代本地 JWT。
- 这些 API 凭据不会由本 Skill 自动获取或由 Gateway 的 MCP 环境自动提供。缺少合法凭据则停止，请用户通过既有登录/配置流程提供；不能调用 dev-token、签发/兑换 Token 或修改认证来绕过。账号改变后必须重新核对当前业务目标，不沿用旧账号资源 ID。
- 仅支持下列白名单中的方法与路径组合，不按 `/api/` 前缀整体放行；未列出的方法、路由和未知新接口默认拒绝。JSON body 为可选项，GET 不带 body。query 放在 `path` 中并 URL 编码。内部端点、路径穿越、非本机地址和跳转均拒绝；不支持 WebSocket、任意 Header、文件上传/下载或 SSE。
- 请求文件上限 10 MiB，Token 文件 16 KiB，JSON 响应上限 20 MiB，请求总超时 15 秒，无自动重试。非 JSON/超限/传输失败退出非零；写入可能已完成，不能称为已回滚。非 2xx 或业务 `success:false`/非空 `error` 同样失败；`ok:true` 只表示该回执无错误，异步任务是否完成仍按业务状态判断。

## 错误处理

| 结果 | 行为 |
|---|---|
| 400/422 | 参数不合法；按已核对合同修正，请求改变后由 CLI 重新校验 |
| 401/403 | 停止，说明认证/权限问题；不换 Token/账号、不转 WS 绕过 |
| 404 | 核对资源是否存在及服务端版本，不枚举替代路径 |
| 409 | 按业务冲突处理，如容量已满、已在另一列表、账号运行时不匹配；不静默覆盖 |
| 503 | 运行时未就绪，提示用户检查服务；不自动重放写入 |
| 超时/断线/响应不完整 | 状态未知，先核实结果；不自动重放写入 |

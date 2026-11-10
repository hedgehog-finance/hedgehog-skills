# API 请求确认、认证与错误处理

准备任何实际请求前读取。接口是否允许，先看[分类入口](../gateway-api.md)和当前类别；用户确认不能放行白名单外操作。

## 请求确认流程

1. 先完成只读代码/文档核对，说明为什么命名命令不足。准备一个 UTF-8 JSON 文件（BOM 可用），文件名 `tmp-hog-gateway-tools-<unique-id>.json`，放在当前允许工作目录，不能放 `.hedgehog/`。
2. 调用 `api-preview --request-file <file>`。此命令离线校验并输出完整方法、目标 origin、路径/查询、body、原因、影响和 SHA-256，不连接服务、不读取 Token。
3. 向用户展示上述具体请求及预期读写影响，询问是否执行。引用已有的明确确认仅限同一账号、同一目标和完全相同的请求；“实现兜底功能”“把问题解决”及文档中的示例不构成执行授权。不把预览 hash 自己生成出来当成用户确认。
4. 收到确认后运行 `api-call --request-file <same-file> --confirmed-sha256 <preview-sha256>`。目标、方法、路径、参数、原因或影响发生改变，都必须重新预览并确认。一次确认只覆盖一次发送；未知结果先核实，不能重复发送同一写请求碰运气。
5. 按 HTTP 状态和业务回执报告成功、失败或结果未知。用完清理参数文件。核实用的后续 API 请求也须有明确的对应授权。

SHA-256 防止确认后参数漂移，是 CLI 的显式门槛，**不是服务端颁发的用户授权凭证，也不能技术验证聊天中是否真的获得同意**。模型必须遵守以上确认流程；服务端鉴权、账号隔离、沙箱和写保护始终生效。

```json
{
  "base_url": "http://127.0.0.1:59100",
  "method": "GET",
  "path": "/api/watchlist?list_type=watchlist",
  "reason": "已核对当前版本的 HTTP 查询接口，需核实此前添加的真实结果",
  "effect": "只读取当前已登录账号在此 Gateway 的正式自选列表，不修改数据"
}
```

```bash
node <skill_path>/cli.mjs api-preview --request-file '<workspace>/tmp-hog-gateway-tools-<id>.json'
# 以下命令仅在用户确认上面的真实请求后执行，替换为本次预览的 hash：
node <skill_path>/cli.mjs api-call --request-file '<workspace>/tmp-hog-gateway-tools-<id>.json' --confirmed-sha256 '<approved-sha256>'
```

PowerShell 使用双引号包路径，命令各占一行。通过文件工具写 JSON，禁止 shell 拼接复杂 JSON。不要在参数文件中放 Token 或自定义鉴权 Header。

## 连接、身份与限制

- `base_url` 必须显式写入请求文件并纳入确认；仅支持当前机器上的 `localhost`、`127.0.0.1`、`[::1]`，默认部署端口通常为 59100。支持 HTTP/HTTPS，不允许 URL 内嵌凭据、路径、query 或 fragment。远端终端沿用产品连接机制，不把本机 API 暴露公网。
- API 使用**本地登录 JWT**，通过 `HEDGEHOG_GATEWAY_API_TOKEN` 或 `HEDGEHOG_GATEWAY_API_TOKEN_FILE` 二选一提供。文件仅包含 JWT；工具只读取显式提供的文件，不搜索或打印私有凭据。不接受 MCP 的 `hgmcp_...` Token，也不使用 ciwei-ai Key/Token 替代本地 JWT。
- 这些 API 凭据不会由本 Skill 自动获取或由 Gateway 的 MCP 环境自动提供。缺少合法凭据则停止，请用户通过既有登录/配置流程提供；不能调用 dev-token、签发/兑换 Token 或修改认证来绕过。确认前后账号改变，重新核对并确认。
- 仅支持下列白名单中的方法与路径组合，不按 `/api/` 前缀整体放行；未列出的方法、路由和未知新接口默认拒绝。JSON body 为可选项，GET 不带 body。query 放在 `path` 中并 URL 编码。内部端点、路径穿越、非本机地址和跳转均拒绝；不支持 WebSocket、任意 Header、文件上传/下载或 SSE。
- 请求文件上限 10 MiB，Token 文件 16 KiB，JSON 响应上限 20 MiB，请求总超时 15 秒，无自动重试。非 JSON/超限/传输失败退出非零；写入可能已完成，不能称为已回滚。非 2xx 或业务 `success:false`/非空 `error` 同样失败；`ok:true` 只表示该回执无错误，异步任务是否完成仍按业务状态判断。

## 错误处理

| 结果 | 行为 |
|---|---|
| 400/422 | 参数不合法；按已核对合同修正，请求改变后重新确认 |
| 401/403 | 停止，说明认证/权限问题；不换 Token/账号、不转 WS 绕过 |
| 404 | 核对资源是否存在及服务端版本，不枚举替代路径 |
| 409 | 按业务冲突处理，如容量已满、已在另一列表、账号运行时不匹配；不静默覆盖 |
| 503 | 运行时未就绪，提示用户检查服务；不自动重放写入 |
| 超时/断线/响应不完整 | 状态未知，先核实结果；后续写入必须有对应明确授权 |

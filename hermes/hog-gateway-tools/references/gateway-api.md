# Gateway HTTP API 兜底

核对日期：2026-11-10。此文档只覆盖当前 Gateway 已存在的本机 HTTP API，不是 ciwei-ai 数据 API，也不把 WS action 当成 HTTP 路径。正常操作使用本 Skill 的命名 MCP 命令；API 兜底默认关闭，**包括 GET 在内，每个具体请求都须先取得用户明确确认**。

## 何时使用

用户要解决的操作没有命名命令，或已确认的 Gateway 版本兼容问题确需现有 HTTP 路径时，可以准备请求。先核对本文及对应版本的 Gateway `docs/api-reference.md`、`src/server/routes/` 和路由挂载代码。没有已验证 HTTP 路径就停止，不猜测 `/api/request`，不退回 WS、curl、临时脚本或通用 MCP 代理。

命名命令出现 401/403、权限不足、租户/所有权拒绝、沙箱拒绝时，不能换成 API 规避。用户确认业务操作不等于授权绕过这些限制。不要借此递归驱动 Agent、自改权限或读取其他账号凭据。

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
- 仅支持现有 `/api/` 路径及 GET/POST/PUT/PATCH/DELETE。JSON body 为可选项，GET 不带 body。query 放在 `path` 中并 URL 编码。内部端点、路径穿越、非本机地址和跳转均拒绝；不支持 WebSocket、任意 Header、文件上传/下载或 SSE。
- 请求文件上限 10 MiB，Token 文件 16 KiB，JSON 响应上限 20 MiB，请求总超时 15 秒，无自动重试。非 JSON/超限/传输失败退出非零；写入可能已完成，不能称为已回滚。非 2xx 或业务 `success:false`/非空 `error` 同样失败；`ok:true` 只表示该回执无错误，异步任务是否完成仍按业务状态判断。

## 自选股 API（已核对路由）

正常使用 `find-stock`、`get-watchlist`、`watchlist-add`、`watchlist-move`。以下表格用于经用户确认后的诊断/兼容处理。所有 ID 和代码必须来自实际查询。

| 方法/路径 | 输入与结果 |
|---|---|
| `GET /api/watchlist?list_type=watchlist` | `list_type` 可为 `watchlist`/`candidate`，缺省正式自选；可选 `mark` 精确过滤。返回 `{data:[...],total}` |
| `GET /api/watchlist/count?list_type=watchlist` | 当前列表数量；使用服务端结果，不以本地缓存推断剩余额度 |
| `GET /api/watchlist/:id?list_type=watchlist` | 当前用户、指定列表的记录；返回 `{data:item}`，不存在返回错误 |
| `POST /api/watchlist` | body 必须有 `stock_code,list_type`；传入已核验的 `stock_name,exchange,market`。返回 HTTP 201 `{data:item,classification_started}` |
| `POST /api/watchlist/move` | body `{id,list_type,target_list_type}`；源/目标必须不同，转入正式自选遵守容量限制；返回 `{data:{id,list_type}}` |
| `PATCH /api/watchlist/:id/mark` | body `{list_type,mark}`；空字符串清除，`ready-to-buy` 表示备买，普通添加不自动设置 |
| `DELETE /api/watchlist/:id?list_type=watchlist` | 从明确列表删除指定记录，需对应删除授权，返回 `{success:true}` |
| `GET /api/watchlist/sync?list_type=watchlist&since=<time>` | 沿用现有增量同步响应；账号和 Gateway 边界不变 |

默认正式自选 10 只（包含备买），候选 500 只，以当前服务端限制为准。同一股票不能同时在两个列表；跨列表用 move，标签保留。MCP `watchlist_add` 同列表重复返回 `{id,skipped:true}`；HTTP POST 会再读取记录并返回 `{data:item,...}`，**HTTP 201 本身不证明是本次新增**。

正式自选添加的行业/主题分类目前由消费端另行调度；Skill 只报告入库结果，不承诺已经完成分类。候选添加已有服务端异步分类，`classification_started` 也不等于分类完成。移动保留原有标签，不重新分类。

股票字典通过现有 MCP `get_stock_basic_list` / `get_stock_basic_info` 使用。不要凭 action 名发明 `/api/get_stock_basic_info` HTTP 路径。

## 其他常用 API 的定位

下列入口供核对用途；调用前仍需查看相应版本的参数合同，并准备完整请求给用户确认，不自动探测端点。

| 范围 | 已有入口 | 文档/实现位置（hedgehog 仓库） |
|---|---|---|
| Gateway 状态 | `GET /api/status`，返回运行版本、连接等状态 | `hedgehog-gateway/src/server/routes/status.ts` |
| Agent 只读状态 | `GET /api/agent/status`、`GET /api/agent/health` | `hedgehog-gateway/docs/api-reference.md` 的 Agent 会话接口 |
| 通知 | `GET /api/notifications`；`limit,type,unreadOnly,biz_type,stock_code` 过滤 | `hedgehog-gateway/src/server/routes/notifications.ts` |
| Work/Task | 优先 `get-work-context`、`get-task-status`；HTTP 详情见工作流接口 | `hedgehog-gateway/docs/api-reference.md`、`src/server/routes/workflow.ts` |
| 知识/记忆/推荐 | 优先已有命名命令；HTTP 参数不得照搬 MCP Resource URI | 同一 API 文档的知识库、记忆、推荐章节 |
| 日志及其他维护 | 核对路由挂载前缀和具体查询条件；不能仅从文件中相对路径拼接猜测 | 同一 API 文档及 `src/server/routes/`、运行时路由挂载代码 |

更完整的接口事实来源是配套 Gateway 源码及 `hedgehog-gateway/docs/api-reference.md`，不是模型记忆。本文没有 HTTP 映射的 WS 操作不在兜底范围。

## 错误处理

| 结果 | 行为 |
|---|---|
| 400/422 | 参数不合法；按已核对合同修正，请求改变后重新确认 |
| 401/403 | 停止，说明认证/权限问题；不换 Token/账号、不转 WS 绕过 |
| 404 | 核对资源是否存在及服务端版本，不枚举替代路径 |
| 409 | 按业务冲突处理，如容量已满、已在另一列表、账号运行时不匹配；不静默覆盖 |
| 503 | 运行时未就绪，提示用户检查服务；不自动重放写入 |
| 超时/断线/响应不完整 | 状态未知，先核实结果；后续写入必须有对应明确授权 |

## 维护要求

升级 API 参数时一起更新本文件、Skill 版本及三平台副本；自选写入保持复用共享 Capability。不要复制另一套容量、分类或数据库逻辑。测试只用临时文件及本机模拟服务器，不以真实账号写入验证兜底，也不把模拟测试描述为生产端到端验收。

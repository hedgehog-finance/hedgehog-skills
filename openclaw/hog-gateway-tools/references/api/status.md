# Gateway 与 Agent 状态 API

仅在检查版本、连接或执行状态时读取。本类全部为 GET，不启动、恢复或控制 Agent。准备请求前读取[公共流程](request-flow.md)；[返回分类入口](../gateway-api.md)。

| 方法/路径 | 输入与结果 |
|---|---|
| `GET /api/status` | 无业务参数；返回 `status,version,uptime,port,bind,relayConnected,connectedDevices` 等运行信息 |
| `GET /api/agent/status` | 无业务参数；当前 Agent 状态 |
| `GET /api/agent/health` | 无业务参数；Agent 健康状态 |
| `GET /api/agent/adapters` | 无业务参数；执行器列表 |
| `GET /api/agent/sessions` | 无业务参数；会话列表 |
| `GET /api/agent/adapters/:adapterId/status` | 使用真实执行器 ID，返回对应状态 |
| `GET /api/agent/sessions/:sessionId/status` | 使用真实会话 ID，返回对应状态 |

ID 只接受字母、数字、下划线与连字符。Agent 响应沿用对应 Capability 的原始业务结构，不把“进程在线”当成“任务完成”。会话 history 会调用会话切换能力，未列入本只读名单。

禁止 `prompt`、`follow-up`、`command`、创建会话/执行器、resume、driver 等操作，即使用户确认也不通过 API 兜底执行。

源码：Gateway `src/server/routes/status.ts`、`agent.ts` 及 `src/index.ts` 挂载；响应合同见同版本 `docs/api-reference.md` 的 Agent 会话接口。

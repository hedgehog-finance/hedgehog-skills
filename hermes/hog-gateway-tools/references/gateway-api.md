# Gateway HTTP API 兜底：分类入口

核对日期：2026-11-11。正常操作使用命名 MCP 命令；API 兜底只用于用户明确确认的 Gateway 功能性操作，不提供模型执行入口。它不是 ciwei-ai API，也不把 WS action 当作 HTTP 路径。

## 按需读取

先读本入口，再只读当前业务对应的一份分类文档；不要预加载所有分类。准备具体请求时，再读公共流程。分类中的方法/路径表共同构成完整允许名单；未列出的组合默认拒绝。

| 当前需求 | 读取文档 |
|---|---|
| 预览、用户确认、JWT、连接限制、错误处理 | [公共请求流程](api/request-flow.md)（准备请求必读） |
| 自选/候选查询、添加、转移、排序、标记、删除 | [自选股](api/watchlist.md) |
| Gateway 版本/连接、Agent/会话/执行器状态 | [Gateway 与 Agent 状态](api/status.md) |
| 通知、系统日志、审计日志、任务失败日志 | [通知与诊断日志](api/notifications-logs.md) |
| Work/Task 状态、结果、用量、定时任务历史 | [任务查询](api/workflow-queries.md)（只读） |

## 共同边界

- `api-preview` 离线校验方法与完整路径；`api-call` 发送前再次校验。同一请求的 SHA-256 只防止参数漂移，不证明人类已同意。
- 包括 GET 在内，每个请求都必须先取得用户对具体目标、方法、路径、参数及影响的明确确认。确认不能扩大允许名单。
- 只接受本机 loopback HTTP(S) JSON API；不接受重定向、任意 Header、WS、内部端点或自动重试。命名命令权限/租户/沙箱拒绝不能通过 API 规避。
- Knowledge、Memory、推荐使用已有命名 MCP 命令。当前分类未覆盖的功能不能猜测路径或自行改名单；应核对代码后按 Skill 维护流程评审。

## 禁止通过 API 兜底执行的操作

以下入口不在白名单，**即使用户确认请求或提供正确 SHA-256，也在读取 Token、发送网络请求之前拒绝**：

- 显式 LLM 调用：如 `POST /api/llm-request`。
- Chat/Agent 执行与控制：如 `POST /api/agent/prompt`、`/follow-up`、`/command`，创建会话、resume、driver 等入口。
- Work/Task 创建与编排：如 `POST /api/workflows`、`POST /api/workflows/orchestrate`；其他业务接口间接创建 Work/Task 也不放行。
- Work/Task 重试、继续、恢复及其他写操作，包括 `retry`、`continue`、`resume`、`checkpoint`、`migrate` 等。不能用恢复入口绕过模型执行准入。
- 定时任务创建、修改、启用、立即运行、系统报告配置等写操作，防止延迟触发模型执行。
- 通用 action/RPC/代理、认证与权限修改、内部接口，以及任何未列出的路径/方法。

模型执行应走受控 MCP 能力；对应能力不可用就停止，不能改用 API/WS/curl/临时脚本绕过。此白名单是 Skill API 兜底边界，不修改项目程序运行时或用户界面的既有 API 权限，也不代表已经实现 MCP/Gateway 重入深度协议。

白名单按操作语义区分：添加候选股的既有服务端异步分类属于业务功能，仍然保留；这不授权模型直接调用分类/LLM 接口或提交任意提示词。

## 维护

更新接口时同步对应分类文档、`api-fallback.mjs` 方法/路由名单、测试、Skill 版本与三平台副本；不要把参数表重新堆回入口文档。接口事实来源为同版本 Gateway `src/index.ts`、`src/server/routes/` 和 `docs/api-reference.md`。测试仅使用临时文件和本机模拟服务，不以真实账号写入验证。

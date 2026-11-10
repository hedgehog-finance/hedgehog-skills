# Work、Task 与定时任务查询 API

仅在核对已有任务状态、结果、用量或调度历史时读取。优先命名 MCP 命令 `get-work-context`、`get-task-status`。本类全部为 GET；准备请求前读取[公共流程](request-flow.md)；[返回分类入口](../gateway-api.md)。

| 方法/路径 | 查询参数与结果 |
|---|---|
| `GET /api/workflows` | 可选 `status,agent_type,created_by,project_id,scope`；返回 `{data:works}` |
| `GET /api/workflows/sync` | 可选 `since,created_by,scope`；返回既有增量同步结果 |
| `GET /api/workflows/:id` | 可选 `scope`；返回 `{data:work}`，包含其 Task 信息 |
| `GET /api/workflows/tasks` | `limit` 默认 500、范围 1–2000；可选 `scope`；返回 `{data:items}`；当前 HTTP 路由固定 offset 为 0 |
| `GET /api/workflows/tasks/:taskId` | 可选 `scope`；返回 `{data:task}` |
| `GET /api/workflows/tasks/:taskId/usage` | 可选 `scope`；返回 `{data:用量}` |
| `GET /api/workflows/:id/tasks` | 可选 `scope`；返回 `{data:tasks}` |
| `GET /api/workflows/:id/usage` | 可选 `scope`；返回 `{data:合计用量}` |
| `GET /api/scheduled-jobs` | 可选 `scope`；返回 `{data:jobs}` |
| `GET /api/scheduled-jobs/:id` | 可选 `scope`；返回 `{data:job}` |
| `GET /api/scheduled-jobs/:id/history` | 可选 `scope`；返回 `{data:历史结果}` |

ID 必须来自实际记录，只接受字母、数字、下划线与连字符。`scope=all` 是服务端定义的查询范围，不是身份覆盖；所有权与权限仍由服务端判断。用量字段包括 `input,output,cacheRead,cacheWrite,totalTokens`，有审核用量时包含 `audit`。

**不允许任何 Work/Task 或定时任务写入口**：创建、编排、重试、继续、恢复、checkpoint、迁移，以及定时任务创建、修改、启用、立即运行、系统报告配置等均不在兜底名单。看到失败状态不构成发起这些操作的授权；用户确认也不放行。

源码：Gateway `src/server/routes/workflow.ts`、`scheduled-jobs.ts`，分别挂载 `/api/workflows`、`/api/scheduled-jobs`；参数合同见同版本 `docs/api-reference.md`。

# 通知与诊断日志 API

仅在读取通知、定位运行错误或核对失败记录时读取。本类全部为 GET。准备请求前读取[公共流程](request-flow.md)；[返回分类入口](../gateway-api.md)。

| 方法/路径 | 查询参数与结果 |
|---|---|
| `GET /api/notifications` | 可选 `limit,type,unreadOnly,biz_type,stock_code`；`unreadOnly=true` 只读未读通知；返回既有通知业务结构 |
| `GET /api/logs` | `lines` 默认 500、最大 5000；`date` 为 `YYYY-MM-DD`；可选 `level,keyword`；返回 `{data:{lines,total,date,availableDates}}` |
| `GET /api/logs/stats` | `days` 默认 30、最大 90；返回 `{data:{warn,error,fatal,days}}` |
| `GET /api/audit-logs` | 可选 `from,to,module,action,userId,level,keyword,page,pageSize`；查询当前账号数据库，`userId` 仅为日志过滤，不切换身份；返回 `{data:分页结果}` |
| `GET /api/works-logs` | `days` 默认 7、最大 90；`limit` 默认 50、最大 200；`offset` 默认 0；可选 `biz_type,category,source`；返回 `{data:查询结果}` |
| `GET /api/works-logs/stats` | `days` 默认 30、最大 90；返回 `{data:聚合统计}` |

通知写入仍使用命名 MCP 命令。本类不包含清理日志、配置修改、凭据读取、重启 Agent 或根据日志自动重试任务。输出日志时只引用与当前问题相关的内容，不暴露鉴权信息。

源码：Gateway `src/server/routes/notifications.ts`、`logs.ts`、`works-logs.ts`，挂载位置为 `src/index.ts`。参数/分页细节以同版本 `docs/api-reference.md` 为准。

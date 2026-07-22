---
name: hedgehog-gateway-tools
version: 1.0.0
description: >
    Interact with the Hedgehog Gateway via its General MCP Server: deliver files to the
    user, report workflow task results, fetch work/task context, send notifications,
    read the user's watchlist, recommend resources, push workflow definitions and list
    installed extensions. Use for agent-to-Gateway orchestration and delivery tasks.
---

# Gateway 通用工具 (General MCP)

封装 Gateway **General MCP Server**（`hedgehog-general-mcp`）暴露的全部工具，提供文件交付、任务编排、通知推送、自选股读取、资料推荐等 Agent 与 Gateway 协作能力。所有调用通过 HTTP JSON-RPC 2.0 与 Gateway 交互。

## 运行环境

- **Node.js**: >=18（仅使用内置模块，无外部依赖）

## MCP 端点发现优先级

CLI 按以下优先级定位 Gateway General MCP Server：
1. `--url <url>` 命令行参数（最高优先级）
2. 环境变量 `HEDGEHOG_MCP_GENERAL_URL`
3. `~/.hogagent/hogagent.json` 的 `gateway.mcpGeneralUrl` 字段
4. 默认 `http://127.0.0.1:59102`

## 使用方法

所有操作通过 Node.js 脚本 CLI 执行。在 Bash 中运行（`<skill_path>` 替换为本技能实际安装路径）：

```bash
node <skill_path>/cli.mjs <command> [args] [--url http://127.0.0.1:59102]
```

## 命令一览

| 命令 | 对应 MCP 工具 | 说明 |
|---|---|---|
| `deliver-files` | `deliver_files` | 向用户交付可下载文件（批量） |
| `report-task-result` | `report_task_result` | 上报工作流任务执行结果 |
| `get-work-context` | `get_work_context` | 获取 work/task 上下文 |
| `send-notification` | `send_notification` | 发送通知事件 |
| `get-watchlist` | `get_watchlist` | 读取用户自选股列表 |
| `recommend-resource` | `recommend_resource` | 推送资料推荐待用户审阅 |
| `push-workflow` | `push_workflow` | 向编排器推送工作流定义 |
| `list-extensions` | `list_extensions` | 列出已安装扩展（skill/mcp） |
| `call` | 任意工具 | 通用逃生舱：传原始 JSON 参数 |

## 参数说明

### deliver-files — 交付文件

文件路径相对 Gateway workspace 目录（或绝对路径）。

```bash
node <skill_path>/cli.mjs deliver-files tasks/abc/report.pdf tasks/abc/chart.png --summary "分析报告" --task-id abc
# 或用 JSON 精确控制每个文件的 summary：
node <skill_path>/cli.mjs deliver-files --files-json '[{"path":"tasks/abc/report.pdf","summary":"报告"}]' --task-id abc
```

| 参数 | 必填 | 说明 |
|---|---|---|
| `<path...>` (位置参数) | 是* | 一个或多个文件路径 |
| `--summary S` | 否 | 统一附加到所有位置参数文件的描述 |
| `--files-json '<json>'` | 是* | 文件数组 `[{path, summary?}]`，与位置参数二选一 |
| `--task-id ID` | 否 | 关联的工作流任务 ID |

> `*` 位置参数与 `--files-json` 至少提供其一。

**输出 JSON**：

```json
{
  "delivered": [
    {
      "name": "report.pdf",
      "path": "tasks/abc/report.pdf",
      "size": 1048576,
      "mime_type": "application/pdf",
      "summary": "报告"
    }
  ],
  "errors": []
}
```

路径越界或文件不存在时，该文件计入 `errors` 数组。

### report-task-result — 上报任务结果

```bash
node <skill_path>/cli.mjs report-task-result <task_id> --content "任务输出" --summary "摘要" \
  --delivery-files-json '[{"name":"report.pdf","path":"tasks/abc/report.pdf","summary":"报告"}]'
```

| 参数 | 必填 | 说明 |
|---|---|---|
| `<task_id>` (位置参数) | 是 | 任务 ID |
| `--content C` | 否 | 任务内容输出 |
| `--summary S` | 否 | 任务摘要 |
| `--delivery-files-json '<json>'` | 否 | 交付文件数组 `[{name, path, summary?}]` |

**输出 JSON**：

```json
{ "success": true, "task_id": "abc" }
```

WorkEngine 未启用时报错。

### get-work-context — 获取工作上下文

```bash
node <skill_path>/cli.mjs get-work-context <work_id> --task-id <task_id>
```

| 参数 | 必填 | 说明 |
|---|---|---|
| `<work_id>` (位置参数) | 是 | Work/Workflow ID |
| `--task-id ID` | 否 | 指定具体任务 ID |

**输出 JSON**：

```json
{
  "work": {
    "id": "work-001",
    "name": "每日复盘",
    "status": "running",
    "agent_type": "hogagent",
    "created_at": "2026-07-20T08:00:00Z"
  },
  "tasks": [
    { "id": "task-001", "work_id": "work-001", "status": "completed", "..." : "..." },
    { "id": "task-002", "work_id": "work-001", "status": "pending", "..." : "..." }
  ],
  "target_task": { "..." : "...(仅当 --task-id 指定时)" }
}
```

Work/Task 不存在时报错。

### send-notification — 发送通知

```bash
node <skill_path>/cli.mjs send-notification workflow_complete "分析完成" "贵州茅台深度分析已完成"
```

| 参数 | 必填 | 说明 |
|---|---|---|
| `<type>` (位置参数) | 是 | 通知类型（见下表） |
| `<title>` (位置 或 `--title`) | 是 | 通知标题 |
| `<body>` (位置 或 `--body`) | 是 | 通知正文 |

**输出 JSON**：

```json
{ "success": true, "id": "notif-uuid", "priority": "normal" }
```

**通知类型**：`workflow_complete` / `workflow_failed` / `checkpoint_confirm` / `resource_recommend` / `scheduled_task` / `auth_required` / `system_alert` / `agent_version` / `gateway_status` / `agent_connected` / `client_connected` / `custom`

### get-watchlist — 读取自选股

```bash
node <skill_path>/cli.mjs get-watchlist --user-id default
```

| 参数 | 必填 | 说明 |
|---|---|---|
| `--user-id ID` | 否 | 用户 ID，默认 `default` |

**输出 JSON**：

```json
[
  {
    "id": 1,
    "userId": "default",
    "stockCode": "600519.SH",
    "stockName": "贵州茅台",
    "sortOrder": 1,
    "addedAt": "2026-01-15T10:00:00Z"
  }
]
```

无自选股时返回空数组 `[]`。

### recommend-resource — 推荐资料

```bash
node <skill_path>/cli.mjs recommend-resource --source-type skill --title "白酒行业周报" \
  --content-type report --summary "本周白酒板块回顾" --recommend-reason "与持仓相关"
```

| 参数 | 必填 | 说明 |
|---|---|---|
| `--source-type T` | 是 | 来源类型（如 skill/agent/manual） |
| `--title X` | 是 | 资料标题 |
| `--content-type T` | 否 | 内容类型（如 article/report/news） |
| `--ciwei-id ID` | 否 | ciwei-ai 内容 ID |
| `--resource-url U` | 否 | 资料 URL |
| `--summary S` | 否 | 资料摘要 |
| `--full-content C` | 否 | 全文文本 |
| `--recommend-reason R` | 否 | 推荐理由 |

**输出 JSON**：

```json
{ "id": "rec-uuid", "status": "pending" }
```

### push-workflow — 推送工作流

```bash
node <skill_path>/cli.mjs push-workflow --name "每日复盘" \
  --workflow-def '{"tasks":[...],"result_task":"..."}' --agent-type hogagent
```

| 参数 | 必填 | 说明 |
|---|---|---|
| `--name N` | 是 | 工作流名称 |
| `--workflow-def '<json>'` | 是 | 工作流定义（见下方结构） |
| `--description D` | 否 | 工作流描述 |
| `--agent-type A` | 否 | Agent 类型，默认 hogagent |

**workflow-def JSON 结构**：

完整结构定义、示例和字段说明请参见 [workflow-def-spec.md](./references/workflow-def-spec.md)。

**输出 JSON**：

```json
{ "success": true, "work_id": "work-uuid", "status": "pending" }
```

### list-extensions — 列出扩展

```bash
node <skill_path>/cli.mjs list-extensions --type skill --enabled true
```

| 参数 | 必填 | 说明 |
|---|---|---|
| `--type T` | 否 | 过滤扩展类型：`skill` / `mcp` |
| `--enabled B` | 否 | 过滤启用状态：`true` / `false` |

**输出 JSON**：

```json
[
  {
    "name": "hog-kb-tools",
    "type": "skill",
    "version": "1.1.0",
    "enabled": true,
    "description": "Query the Hedgehog knowledge base..."
  }
]
```

无扩展时返回空数组 `[]`。

### call — 通用调用

当需要访问尚未封装的参数时，可直接传原始 JSON：

```bash
node <skill_path>/cli.mjs call send_notification --json '{"type":"custom","title":"Hi","body":"..."}'
```

## 约束

- MCP 请求超时 15 秒，超时返回错误而非挂起。
- `deliver-files` 的相对路径不得越出 workspace 目录，否则该文件被拒绝并计入 `errors`。
- `report-task-result`、`push-workflow` 依赖 Gateway 的 WorkEngine；若未启用会返回错误。
- 传入的 `--*-json` / `--workflow-def` 必须为合法 JSON，否则报错退出。
- 所有命令在失败时输出错误信息到 stderr 并以非零退出码退出：`Error: MCP request failed: <reason>`

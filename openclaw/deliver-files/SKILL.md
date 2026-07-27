---
name: deliver-files
version: 1.0.0
description: >
    Deliver downloadable files to the user in batch via the Hedgehog Gateway
    General MCP Server. Use whenever a generated report, chart, document or any
    other artifact needs to be handed over to the user for download.
---

# 文件交付 (Deliver Files)

封装 Gateway **General MCP Server**（`hedgehog-general-mcp`）的 `deliver_files` 工具，向用户批量交付可下载文件。所有调用通过 HTTP JSON-RPC 2.0 与 Gateway 交互。

## 运行环境

- **Node.js**: >=18（仅使用内置模块，无外部依赖）

## MCP 端点发现优先级

CLI 按以下优先级定位 Gateway General MCP Server：
1. `--url <url>` 命令行参数（最高优先级）
2. 环境变量 `HEDGEHOG_MCP_GENERAL_URL`
3. `~/.hogagent/hogagent.json` 的 `gateway.mcpGeneralUrl` 字段
4. 默认 `http://127.0.0.1:59102`

## 使用方法

通过 Node.js 脚本 CLI 执行。在 Bash 中运行（`<skill_path>` 替换为本技能实际安装路径）。文件路径相对 Gateway workspace 目录（或绝对路径）：

```bash
node <skill_path>/cli.mjs tasks/abc/report.pdf tasks/abc/chart.png --summary "分析报告" --task-id abc
# 或用 JSON 精确控制每个文件的 summary：
node <skill_path>/cli.mjs --files-json '[{"path":"tasks/abc/report.pdf","summary":"报告"}]' --task-id abc
```

## 参数说明

| 参数 | 必填 | 说明 |
|---|---|---|
| `<path...>` (位置参数) | 是* | 一个或多个文件路径 |
| `--summary S` | 否 | 统一附加到所有位置参数文件的描述 |
| `--files-json '<json>'` | 是* | 文件数组 `[{path, summary?}]`，与位置参数二选一 |
| `--task-id ID` | 否 | 关联的工作流任务 ID |
| `--url U` | 否 | 覆盖 MCP 端点（最高优先级） |

> `*` 位置参数与 `--files-json` 至少提供其一。

## 输出 JSON

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

## 约束

- MCP 请求超时 15 秒，超时返回错误而非挂起。
- 相对路径不得越出 workspace 目录，否则该文件被拒绝并计入 `errors`。
- 传入的 `--files-json` 必须为合法 JSON，否则报错退出。
- 失败时输出错误信息到 stderr 并以非零退出码退出：`Error: MCP request failed: <reason>`

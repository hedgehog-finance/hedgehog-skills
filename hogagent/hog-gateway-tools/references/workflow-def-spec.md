# workflow-def JSON 结构规范

本文档定义 Gateway 工作流编排器 `push-workflow` 命令中 `--workflow-def` 参数的完整 JSON 结构。

## 完整示例

```json
{
  "tasks": [
    {
      "id": "data_collect",
      "name": "数据采集",
      "mode": "quick",
      "prompt": {
        "cw_system_prompt": "你是专业金融分析师",
        "cw_market": "A股",
        "cw_content": "分析贵州茅台近期走势，输出结构化数据报告",
        "cw_output": "输出包含走势、成交量、资金流向的分析数据"
      },
      "depends_on": [],
      "required_tools_or_skills": ["hedgehog-stock-research"],
      "validation": {
        "rules": [
          { "type": "deliverable_exists", "name": "data_report" }
        ]
      },
      "checkpoint": true
    },
    {
      "id": "tech_analysis",
      "name": "技术面分析",
      "mode": "standard",
      "prompt": {
        "cw_context": "前序采集数据：\n$ref:data_collect.content\n\n前序交付文件：\n$ref:data_collect.delivery_files",
        "cw_content": "基于以上数据，进行技术面深度分析",
        "cw_output": "输出技术面分析报告（含K线形态、支撑压力位）"
      },
      "depends_on": ["data_collect"],
      "required_tools_or_skills": ["hedgehog-in-depth-analysis", "hedgehog-tech-indicator"],
      "checkpoint": false
    },
    {
      "id": "final_report",
      "name": "综合报告",
      "mode": "long_task",
      "prompt": {
        "cw_context": [
          "=== 数据采集结果 ===",
          "$ref:data_collect.summary",
          "",
          "=== 技术面分析结果 ===",
          "$ref:tech_analysis.content",
          "",
          "=== 技术面分析交付文件 ===",
          "$ref:tech_analysis.delivery_files"
        ],
        "cw_memory": "贵州茅台 技术分析",
        "cw_content": "综合以上全部分析，撰写完整的投资研究报告",
        "cw_output": "输出包含结论和投资建议的完整报告 PDF"
      },
      "depends_on": ["tech_analysis"],
      "required_tools_or_skills": ["hedgehog-in-depth-analysis"],
      "validation": {
        "rules": [
          { "type": "deliverable_min_length", "name": "report", "min_chars": 500 },
          { "type": "deliverable_contains", "name": "report", "keywords": ["结论", "投资建议"] }
        ]
      },
      "checkpoint": true
    }
  ],
  "result_task": "final_report"
}
```

## $ref 动态引用语法

`cw_context` 中可使用 `$ref:taskId.field` 语法引用前序任务的产出，编排器在执行时自动替换为实际值。

| 语法 | 说明 |
|---|---|
| `$ref:taskId.content` | 引用指定任务的 `content` 字段（Agent 的文字输出） |
| `$ref:taskId.summary` | 引用指定任务的 `summary` 字段（任务摘要） |
| `$ref:taskId.delivery_files` | 引用指定任务的 `delivery_files`（交付文件列表，格式化为 `name: path (summary)` 形式） |

**规则：**
- `$ref` 仅解析 `depends_on` 中声明的前序任务，未完成的引用保留原字符串
- `cw_context` 支持字符串和字符串数组两种形式，数组元素以 `\n` 连接
- 引用可嵌入任意文本中，如 `"前序结果：$ref:data_collect.content"`

## 字段说明

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `tasks` | `TaskDef[]` | 是 | 任务定义数组，按依赖顺序执行 |
| `result_task` | `string` | 是 | 最终汇总任务的 ID（其结果作为工作流产出） |

### TaskDef 字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `string` | 是 | 任务唯一标识（同 workflow 内唯一） |
| `name` | `string` | 是 | 任务名称（人类可读） |
| `mode` | `"quick"` \| `"standard"` \| `"long_task"` | 是 | 任务模式，决定会话时长和文件交付方式 |
| `prompt` | `TaskPrompt` | 是 | 任务提示词（见下方） |
| `depends_on` | `string[]` | 是 | 依赖的前置任务 ID 列表（空数组 = 无依赖） |
| `required_tools_or_skills` | `string[]` | 是 | 所需工具或技能名称列表 |
| `validation` | `ValidationSpec` | 否 | 任务完成后的验证规则 |
| `checkpoint` | `boolean` | 是 | 是否为检查点（中断后可从此恢复） |

### TaskPrompt 字段（`cw_` 前缀，编排器专用）

| 字段 | 说明 |
|---|---|
| `cw_system_prompt` | 系统提示词（可选） |
| `cw_market` | 市场标识，如 `"A股"` / `"美股"` |
| `cw_context` | 上下文：字符串或字符串数组，支持 `$ref:taskId.field` 引用前序任务产出（见上方 $ref 语法说明） |
| `cw_memory` | 记忆检索关键词（可选） |
| `cw_content` | 用户指令正文 |
| `cw_output` | 期望输出描述 |

### ValidationSpec 字段

```json
{
  "rules": [
    { "type": "deliverable_exists", "name": "report_file" },
    { "type": "deliverable_min_length", "name": "report_file", "min_chars": 100 },
    { "type": "deliverable_contains", "name": "report_file", "keywords": ["结论", "建议"] },
    { "type": "variable_exists", "name": "target_price" },
    { "type": "variable_in_range", "name": "confidence", "min": 0, "max": 1 }
  ]
}
```

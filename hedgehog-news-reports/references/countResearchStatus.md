# countResearchStatus

**方法**: GET  
**路径**: /v1/research/status/count  
**描述**: 统计各 Pipeline 状态下的研报数量。

## 请求

### Headers
| 字段 | 值 |
|------|----|
| X-API-Token | 从环境变量 `CIWEI_AI_TOKEN` 或 OpenClaw 配置读取 |

### Query 参数
无。

### 请求示例
```json
{}
```

## 响应

### 成功 (200)
| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 业务状态码 |
| message | string | 状态信息 |
| data.init_done | int | 初始化完成数量 |
| data.parse_processing | int | 解析处理中数量 |
| data.parse_done | int | 解析完成数量 |
| data.analyze_processing | int | 分析处理中数量 |
| data.done | int | 完成数量 |
| data.failed | int | 失败数量 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "init_done": 10,
    "parse_processing": 1,
    "parse_done": 20,
    "analyze_processing": 0,
    "done": 100,
    "failed": 3
  }
}
```

### 错误码
| 状态码 | 含义 |
|--------|------|
| 401 | 缺少或无效的 `X-API-Token` |
| 403 | 权限不足 |
| 500 | 服务端处理失败 |

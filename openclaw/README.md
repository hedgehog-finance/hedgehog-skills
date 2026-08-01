# OpenClaw Skills

适配 OpenClaw 平台的技能集合，共 20 个技能模块。包含全部 HogAgent 投研核心技能及 11 个额外技能（`deliver_files`、`hog-memory` 及 9 个通用工具）。

## 技能列表

### 投研核心技能

| 技能 | 版本 | 说明 |
|------|------|------|
| `hedgehog-company-index-data` | 1.6.0 | A 股上市公司数据查询：基本信息、日行情、基本面、资金流、财务报表、申万行业、交易日历 |
| `hedgehog-daily-morning-briefing` | 2.2.3 | 盘前情报简报，筛选宏观/板块/自选股新闻并提取核心逻辑 |
| `deliver_files` | 1.0.0 | Gateway MCP Server CLI：向用户批量交付可下载文件 |
| `hog-gateway-tools` | 2.0.1 | Gateway MCP Server CLI：任务结果上报、工作上下文、通知、自选股、资源推荐、工作流推送 |
| `hedgehog-in-depth-analysis` | 2.2.1 | 重大事件概率树情景分析（宏观波动/黑天鹅/地缘政治/政策转向），预测高概率路径并衡量市场影响 |
| `hedgehog-information-verification` | 2.2.1 | 多源交叉验证市场传闻与未确认新闻，量化置信度，防止误判 |
| `hog-kb-tools` | 1.1.0 | Gateway KB MCP Server CLI：知识库搜索与跨会话记忆管理 |
| `hedgehog-macro-industry-data` | 1.6.0 | 中美宏观数据查询：Shibor、LPR、CPI、PPI、PMI、M0/M1/M2、社融、美债收益率 |
| `hog-memory` | 1.1.0 | 跨会话持久记忆 CLI：保存、搜索、回忆市场洞察与投研结论 |
| `hedgehog-news-reports` | 1.6.0 | 财经新闻与研报：突发新闻、新闻分析、A 股研报、上市公司公告 |
| `hedgehog-stock-research` | 2.2.4 | 个股多维度深度分析：基本面、情绪面、技术面三位分析师 + CIO 整合输出最终研报 |

### 通用工具技能

| 技能 | 版本 | 说明 |
|------|------|------|
| `company-valuation` | 2.0.0 | 估值引擎：相对估值、绝对估值、战略估值 |
| `doc-convert` | 2.0.0 | 文档格式转换：MD / HTML / PDF / DOCX 互转 |
| `fin-calc` | 1.0.0 | 金融计算器：PV、FV、PMT、NPV、IRR、RATE |
| `gen-chart` | 2.1.3 | 图表生成（Vega-Lite / Mermaid / ECharts） |
| `gen-ppt` | 2.1.2 | 从 Markdown 生成 PPTX 演示文稿 |
| `math_calc` | 1.0.0 | 安全数学表达式求值 CLI |
| `table-convert` | 1.0.0 | 电子表格转换（xlsx / xls / csv → JSON / Markdown） |
| `tech-indicators` | 1.0.0 | 本地技术指标计算引擎 |
| `web_fetch` | 1.0.0 | 网页抓取与正文提取（输出 Markdown） |

## 目录结构

每个技能模块的标准结构：

```
<skill-name>/
├── SKILL.md        # 技能定义文件（Agent 指令与工具描述）
├── package.json    # 元数据与依赖声明
├── references/     # （可选）参考文档
└── scripts/        # （可选）调用脚本
```

## 许可证

[GPL-3.0](../LICENSE)

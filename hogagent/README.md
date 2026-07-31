# HogAgent Skills

适配 HogAgent 平台的 A 股投研技能集合，共 9 个技能模块。

## 技能列表

| 技能 | 版本 | 说明 |
|------|------|------|
| `hedgehog-company-index-data` | 1.6.0 | A 股上市公司数据查询：基本信息、日行情、基本面、资金流、财务报表、申万行业、交易日历 |
| `hedgehog-daily-morning-briefing` | 2.2.3 | 盘前情报简报，筛选宏观/板块/自选股新闻并提取核心逻辑 |
| `hog-gateway-tools` | 2.0.1 | Gateway MCP Server CLI：任务结果上报、工作上下文、通知、自选股、资源推荐、工作流推送 |
| `hedgehog-in-depth-analysis` | 2.2.1 | 重大事件概率树情景分析（宏观波动/黑天鹅/地缘政治/政策转向），预测高概率路径并衡量市场影响 |
| `hedgehog-information-verification` | 2.2.1 | 多源交叉验证市场传闻与未确认新闻，量化置信度，防止误判 |
| `hog-kb-tools` | 1.1.0 | Gateway KB MCP Server CLI：知识库搜索与跨会话记忆管理 |
| `hedgehog-macro-industry-data` | 1.6.0 | 中美宏观数据查询：Shibor、LPR、CPI、PPI、PMI、M0/M1/M2、社融、美债收益率 |
| `hedgehog-news-reports` | 1.6.0 | 财经新闻与研报：突发新闻、新闻分析、A 股研报、上市公司公告 |
| `hedgehog-stock-research` | 2.2.4 | 个股多维度深度分析：基本面、情绪面、技术面三位分析师 + CIO 整合输出最终研报 |

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

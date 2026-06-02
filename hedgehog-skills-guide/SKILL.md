---
name: hedgehog-skills-guide
description: >
    刺猬投研（CIWEI AI）金融核心技能路由与调度总纲。
    触发场景：工作空间（hedgehog-workspace）内涉及A股市场、宏观经济、行业研报、财务分析的业务链。
    阻断场景：非金融通用对话；脱离实时市场数据的纯知识检索。
version: 1.2.2
---

## 1. 核心参考文档 (references/)
本技能下的References文件夹里放了许多文档，是为整个workspace准备的，内容包括：
references/
├── financial-report-income.md        // 现金流量表字段说明
├── financial-report-balancesheet.md  // 资产负债表字段说明
├── financial-report-cashflow.md      // 现金流量表字段说明
├── finance-analysis-keypoints.md     // 不同公司类型的财务报表分析方法和要点
├── stock-moneyflow.md        // 股票每日资金流向数据
├── company-valuation.md      // 上市公司估值方法
├── industry_theme.md         // 股票的申万行业一级分类，主题分类
└── cn_stock_list.json        // A股（中国股市）所有股票列表，仅用于本地脚本调用，决不允许将文件加载放入提示词

## 约定及说明

### 资讯分类字典（注：数据库入参严格读取 `` 内标识符）
- **新闻 `News`** [检索字段：`news_type`]   枚举值：`macro` (宏观)、`industry` (产业/行业)、`stock` (公司)  
- **研报 `Research`** [检索字段：`report_type`]   枚举值：`macro` (宏观)、`industry` (产业/行业)、`stock` (公司)  
- **公告 `Announcements`** [检索字段：`announce_type`]   枚举值：`U1` (定期财务报告)、`U2` (业绩预告及快报)、`U3` (融资与资金管理)、`U4` (并购重组与重大交易)、`U5` (股东权益变动)、`U6` (公司治理与审计)、`U7` (异常与风险警示)、`U8` (司法与破产重整)、`U9` (其他重大事项)、`U10` (交易所监管)
    
### 财务报表中的公司类型（com_type）
- 1 一般工商业
- 2 银行
- 3 保险
- 4 证券

## 2. API 调用铁律
调用刺猬投研数据查询SKILL（如hedgehog-news-and-reports、hedgehog-company-and-index-data、hedgehog-macro-industry-data等），必须严格遵守规则：
1. **参数约束**：严格依API文档声明传参，严禁通过联想或模型先验知识捏造参数。
2. **阻断与容错**：调用失败自动重试1-3次。若核心数据缺失，直接向用户抛出异常中断任务，严禁基于幻觉生成结论。
3. **子Agent运行及数据清洗**：在实际调用时，组装好输入参数后，启用sub-agent去执行，严格遵守工作流：
    - 调用SKILL指定的工具获取数据。
    - 数据整理：
        * 无明确指令：原样返回。
        * 按需提取：精准切片指定字段，压缩结构后返回。
        * 如果有总结/摘要/概括的要求，长文本（>1000字）强制压缩为300字内摘要；数值格式字段严禁更改或截断。

## 3. 技能调度目录
### 3.1 金融数据接口 (Data API)
- `hedgehog-company-and-index-data`: 上市公司数据库。获取标的基本面、财务报表、量价行情及资金流向等结构化数据。
- `hedgehog-news-and-reports`: 文本情报库。获取宏观、行业、个股的快讯、新闻、研报与公告。自带量化过滤条件：`importance_score` 重要度(0~5)、`market_sentiment_score` 市场情绪(-5~5)、`horizon_impact_score` 长短期影响(0~5)、`macro_impact_score` 个股影响因子(-5~5)。
- `hedgehog-macro-industry-data`: 宏观时序数据库。获取中美利率、CPI、PPI、PMI、国债收益率等官方机构公布的宏观时间序列数据。

### 3.2 深度投研分析 (Analysis & Logic)
- `hedgehog-skills-guide`: 股票基本分析技能。执行多维度个股基本面与技术面诊断。
- `hedgehog-in-depth-analysis`: 极端事件推演技能。针对宏观异动、产业黑天鹅、政策转向等高势能事件，生成概率树与影响路径预测。
- `hedgehog-information-verification`: 信息核实技能。多源交叉验证市场传闻，输出量化置信度。
- `hedgehog-daily-morning-briefing`: 早报降噪技能。盘前环境过滤噪音，交付高信噪比的宏观及自选股情报。

### 3.3 金融计算工具 (Tools)
- `hedgehog-tech-indicator`: 技术指标计算。输入股票代码与时间窗口，输出技术指标序列（分析模型见 `tech-indicator-analysis.md`）。
- `hedgehog-calculator`: 高精度计算器。执行复杂财务比率与金融公式运算（排除基础加减乘除）。

## 4. 全局参数规范
- **日期规范**：入参严格执行 `YYYYMMDD` 格式（如 20250320）；API响应标准为 `YYYY-MM-DD`。
- **语义检索**：`keyword` 字段直接传递中文自然语言（如 `keyword=央行降息对银行板块的影响`），禁止人工拆词。
- **缺省配置**：技术指标周期强制使用系统最佳实践参数，除非用户显式干预。
- **空值响应**：若API返回 `[]`，判定为数据库无对应资产，必须声明“暂未查询到相关信息”，严禁捏造任何数值底稿。


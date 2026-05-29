---
name: hedgehog-skills-guide
description: >
    刺猬投研（CIWEI AI, Hedgehog Finance）相关Skill的指引，这些Skill通常以“hedgehog-”开头，涉及金融股票数据、财经信息、金融工具、常用基础工具等技能。
    适用场景：在 hedgehog-workspace 工作空间相关的对话，如果需要用到刺猬投研金融Skill，都需要使用本技能。
    不适用场景：非刺猬投研金融财经相关对话（如问天气预报）；纯知识问答（不涉及当前真实股票市场和资讯）。
version: 1.2
---

## 约定与概念（Conventions and Concepts）
如果遇到以下特定概念的名词或短语（必须在"`<"和">`"间引用，如`<刺猬理念>`），请访问hedgehog-skills-guide skill下的references/convention_concept.md文件获得详细解析。注意：没有在"`<xxx>`"中引用的名词或短语不要匹配以下词汇，没有匹配时不要加载convention_concept.md文件。
- 刺猬投研AI
- 刺猬理念
- 刺猬投研模型（HIRM）
- 刺猬法则（Hedgehog Principles）

## 参考文档目录

本技能下的References文件夹里放了许多文档，是为整个workspace准备的，内容包括：
references/
├── financial-report-income.md       // 现金流量表字段说明
├── financial-report-balancesheet.md        // 资产负债表字段说明
├── financial-report-cashflow.md        // 现金流量表字段说明
├── finance-analysis-keypoints.md        // 不同公司类型的财务报表分析方法和要点
├── stock-moneyflow.md        // 股票每日资金流向数据
├── company-valuation.md        // 上市公司估值方法
├── convention_concept.md        // 刺猬投研概念定义、重要原则
├── industry_theme.md        // 股票的行业和主题分类
└── cn_stock_list.json       // A股（中国股市）所有股票列表，仅用于本地脚本调用，决不允许将文件加载放入提示词

## 技能目录

### 股票分析类

- hedgehog-skills-guide

股票分析技能：需要分析股票/上市公司时调用，可以进行多维度全面分析，也可以针对基本面（含财务分析）、情绪/消息面、技术面进行专项分析。
输出一份专业的研究报告。

### 信息处理类

- hedgehog-daily-morning-briefing

每日早报信息降噪技能：在开盘前高效率完成信息降噪，提供高信噪比的宏观及自选股情报。
输出信息简报。

- hedgehog-information-verification

信息求证核实技能：针对市场传闻、未证实的新闻或小道消息进行多源交叉验证，量化信息置信度。
输出评估报告。

- hedgehog-in-depth-analysis

重要事件深度推演技能：针对高势能突发事件（宏观异动、产业黑天鹅、地缘博弈、重要政策），采用5阶二分法进行概率树推演，剥离长尾噪音，预测高胜率演进路径并输出影响分析。
输出评估报告。

### 金融工具类

- hedgehog-calculator

计算器技能：需要准确计算时调用，简单的加减乘除不需要调用本技能，直接依赖大模型计算能力。
输出计算结果。

- hedgehog-tech-indicator

技术指标计算技能：需要从行情数据计算得到某个技术指标时调用，也可以仅提供股票代码和起止日期调用服务器缓存的行情数据计算技术指标。里面有个tech-indicator-analysis.md文档说明技术指标分析方法。
输出技术指标序列数据。

### 金融数据接口

- hedgehog-news-and-reports

资讯、研报、公告等信息类数据库查询技能：需要宏观、行业、股票相关的文字类信息时，需要查询相关主题最新信息时调用。
注意：资讯数据中含有相关Tag、相关股票、重要性评分规则。其中包括重要性评分importance_score（0～5）、市场情绪影响market_sentiment_score（-5～5）、长短期影响horizon_impact_score（0～5）、相关股票影响评分stock_impact_score（-5，5）。资讯类信息主要分为四类：快讯（Flash）、新闻资讯（News）、研报（Research）、公告（Announcements）。
输出文字类信息列表或者内容。

- hedgehog-company-and-index-data

上市公司基本信息、财务数据、行情数据、资金流向等结构化数据库查询技能：需要查询上市公司/股票相关结构化信息，或者各种交易数据、资金数据统计信息时调用。

- hedgehog-macro-industry-data

宏观经济数据（含中国、美国等）序列数据库查询技能：需要查询利率、CPI、PPI、PMI、国债收益率等等宏观金融数据时调用，该数据特点是官方机构公布的时间序列数据。
输出序列数据。

## 公共功能

### 查询股票名称或代码
[待开发]

## 重要注意事项

- **日期输入格式统一用 `YYYYMMDD`**（如 `20250320`）；API 返回的日期时间格式（如 `YYYY-MM-DD`）。
- **不知道股票代码时，先调 `/v1/stock-basic?name=` 获取**，不要猜测代码
- **语义搜索的 keyword 直接用中文自然语言**，无需拆词，例如 `keyword=央行降息对银行板块的影响`
- **技术指标默认参数已经是最佳实践**，无需在请求中手动指定周期参数
- **单位换算**：A 股交易单位为“手”（1 手 = 100 股），若涉及成交量计算，请务必确认单位并进行换算。
- **分页**：默认 `limit` 已够用，需要更多数据时用 `skip` 翻页，避免一次拉取过多
- **空结果处理**：若请求返回 `[]`（空数组），表示数据库暂无该项数据，必须如实回答“暂未查询到相关信息”，严禁基于名称捏造任何数字或结论。

---


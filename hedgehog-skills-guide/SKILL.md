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
├── xxx.md        // xxxxx
├── xxx.md        // xxxxx
├── xxx.md        // xxxxx
├── xxx.md        // xxxxx
├── xxx.md        // xxxxx
├── xxx.md        // xxxxx
└── yyy.md       // cccccc

## 技能目录

### 股票分析类

- hedgehog-skills-guide

股票分析技能：需要分析股票/上市公司时调用，可以进行多维度全面分析，也可以针对基本面（含财务分析）、情绪/消息面、技术面进行专项分析。
输出一份专业的研究报告。

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
输出文字类信息列表或者内容。

- hedgehog-company-data

上市公司基本信息、财务数据、行情数据、资金流向等结构化数据库查询技能：需要查询上市公司/股票相关结构化信息，或者各种交易数据、资金数据统计信息时调用。

- hedgehog-macro-industry-data

宏观经济数据（含中国、美国等）序列数据库查询技能：需要查询利率、CPI、PPI、PMI、国债收益率等等宏观金融数据时调用，该数据特点是官方机构公布的时间序列数据。
输出序列数据。


## 重要注意事项

- **日期输入格式统一用 `YYYYMMDD`**（如 `20250320`）；API 返回的日期时间格式（如 `YYYY-MM-DD`）。
- **不知道股票代码时，先调 `/v1/stock-basic?name=` 获取**，不要猜测代码
- **语义搜索的 keyword 直接用中文自然语言**，无需拆词，例如 `keyword=央行降息对银行板块的影响`
- **技术指标默认参数已经是最佳实践**，无需在请求中手动指定周期参数
- **单位换算**：A 股交易单位为“手”（1 手 = 100 股），若涉及成交量计算，请务必确认单位并进行换算。
- **分页**：默认 `limit` 已够用，需要更多数据时用 `skip` 翻页，避免一次拉取过多
- **空结果处理**：若请求返回 `[]`（空数组），表示数据库暂无该项数据，必须如实回答“暂未查询到相关信息”，严禁基于名称捏造任何数字或结论。

---


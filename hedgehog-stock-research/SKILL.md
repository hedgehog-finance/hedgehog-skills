---
name: hedgehog-stock-research
description: >
    个股多维度分析，分别从基本面、情绪与行为金融、技术面进行分析，最后进行综合分析与决策。
    适用场景：个股分析，针对一家上市公司的多维度分析。
    触发词：个股分析；xxxx股票分析；xxxx公司分析。
    不适用场景：行业分析，宏观分析；非上市公司分析。
version: 1.0
---

# 刺猬个股分析技能

按照顶级投资研究机构的流程，以子Agent扮演四种专业角色，完成专业的投资报告。

## 前置说明

### 股票代码格式

股票代码.交易所简称，如“600000.SH”。

### 金融统计计算工具

如果需要可使用 hedgehog-calculator 技能。

### 上市公司相关资讯和数据查询方法

- 资讯类（新闻、研报、公告）查询: hedgehog-news-and-reports 技能 
- 上市公司数据（基本面、财务、行情）查询: hedgehog-company-and-index-data 技能
- 宏观和行业数据查询: hedgehog-macro-industry-data 技能
- 技术指标计算/查询工具: hedgehog-tech-indicator 技能

### 上市公司数据字段及分析方法说明

放在 hedgehog-skills-guide 技能的 references 文件夹下（根据需要去加载）：
- financial-report-income.md  财务数据-利润表
- financial-report-balancesheet.md  财务数据-资产负债表
- financial-report-cashflow.md  财务数据-现金流量表
- financial-report-analysis-keypoints.md  财务分析方法要点
- company-valuation.md 上市公司估值方法
- stock-moneyflow.md 上市公司股票每日资金向数据

### 输出要求

输出markdown格式。
内容中的关键信息、重要因素、重要数据和图表都要在尾部`参考资料`中注明出处。
内容中需要展示图表，用ECharts格式制作。

尾部包含两个规范格式：

**[参考资料]**
[1] xxxxxxxxxxxxx    (url，或者刊物及页码，或者“类型: id”)
说明：网页引用填url；论文填入刊物名称及页码；刺猬投研金融数据库查询的内容填“类型: id”，类型包括资讯、研报、公告，如“公告: 125”

**[图表数据]**
{图1}: {"data": [], "chart": "ECharts option JSON"}     
{图2}: {"data": "data:image/svg+xml;base64,xxxxxxxxxxxx"}

## 核心功能工作流(Workflow)

如果提示词未明确指定进行子项分析，默认进行多维度个股分析工作流。

### Work-0: 多维度个股分析

创建4个 子Agent（Sub-agent） 用于分开执行以下分析工作。
- fundamentals-agent Agent用于执行Work-1基本面分析。
- sentiment-agent Agent用于执行Work-2情绪分析（消息面分析）。
- technicals-agent Agent用于执行Work-3技术面分析。
- technicals-agent Agent等待其他三个Agent返回结果，执行Work-4 结论分析和操作策略。
最后按照输出格式要求，输出完整报告。

### Work-1: 基本面分析

根据提示词、`前置说明`章节所有内容，按照references/fundamentals-agent.md指引和要求返回研究报告。

### Work-2: 情绪分析（消息面分析）

根据提示词、`前置说明`章节所有内容，按照references/sentiment-agent.md指引和要求返回研究报告。

### Work-3: 技术面分析

根据提示词、`前置说明`章节所有内容，按照references/technicals-agent.md指引和要求返回研究报告。

### Work-4: 结论和操作策略

根据提示词、`前置说明`章节所有内容，以及其他三个分析结果报告，按照references/strategy-agent.md指引和要求返回研究报告。

最后，按照如下结构输出给用户。

```
# [公司名称]（[股票代码]）研究报告 - [YYYYMMDD]

## 摘要

[根据整个完整报告的内容生成300字以下的摘要]

## 基本面分析

[基本面分析报告内容]

## 情绪和信息面分析

[情绪分析报告内容]

## 技术面分析

[技术面分析报告内容]

## 结论和操作策略

[结论和操作策略报告内容]

#### [参考资料]

[将所有参考资料移动转移到这里，编号进行顺序编排]

#### [图表数据]

[将所有图片数据移动转移到这里，编号进行顺序编排]

```

---

## 补充说明

### 用户触发示例

#### 个股分析（触发Work-0）
分析一下xxx股票

#### 上市公司分析（触发Work-0）
对xxx股票进行分析

#### 股票基本面分析（触发Work-1）
对xxx股票进行基本面分析

#### 股票消息面分析（触发Work-2）
对xxx股票进行消息面分析

#### 股票技术面分析（触发Work-3）
对xxx股票进行技术面分析

### 注意事项

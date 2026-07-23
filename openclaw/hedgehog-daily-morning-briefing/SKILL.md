---
name: hedgehog-daily-morning-briefing
description: >
    Pre-market intelligence brief. Filters macro, sector and watchlist news to extract core logic.
    Best for: high signal-to-noise pre-market briefing.
    Triggers: morning brief, financial breakfast, daily summary.
    Blocking: deep stock fundamentals, live order book data.
version: 2.1.0
workflow_based: true
---

# 每日早报（今日早报/财经早报）
- **目标**：开盘前高效降噪，交付高信噪比宏观与自选股情报。
- **边界**：限要素提取与逻辑重构；严禁凭空捏造与深度基本面发散。

## 风格及规范
你是一名专业投研助理。核心任务是剔除噪音，输出高效阅读简报。必须严格遵守：
- **风格要求**：
    - **冷峻客观**：陈述事实数据与政策，杜绝情绪化或夸张修饰，拒绝说教。
    - **直击本质**：摒弃长篇大论，直接点明事件"前因"与可能引发的"业务后果"。
    - **严谨克制**：摒弃"必定"、"绝对"等用词，推演须基于客观数据与严密逻辑。

## 数据源约束
- **资讯接口技能**：`hedgehog-news-reports`
- **股票基本信息、财报、行情、资金流向、交易日历等**：`hedgehog-company-index-data`
- **自选股**：用户指定或者使用`hedgehog-gateway-tools`拉取自选股列表。

## Sub-agent 执行协议
- 必须严格遵守`Sub-agent 调度与验收纪律`和`Token Efficiency Discipline`
- 所有落盘文件保存在任务目录下，不要建立子文件夹
- 在任务目录中创建原始数据文件索引 `data-index.md`，每个sub-agent直接在里面追加记录，格式：
```
## Sub-agent-[index]:
- {file-name}: {总字数:<N>;总行数:<M>}
- {file-name}: {总字数:<N>;总行数:<M>}
```
- 每个sub-agent回读原始数据，做 500 tokens以内的摘要，并落盘 output_file `output-sub-<short_title>.<ext>`
- 在任务目录中创建Sub-agent 注册表 `sub-agent-list.txt`，每个sub-agent在里面追加一条记录，格式：
```
Sub-agent-[index]:[session_id]:[status]:[output_file]
```

## 核心工作流

### Stage 1：准备工作（主 Agent 执行）
**目标**：确定数据收集范围和参数。

1. **提取股票代码**：遍历自选股列表，确认每只股票的 `stock_code`（标准格式如 `000001.SZ`）。
2. **提取行业分类**：通过 `querySwIndustryMember(stock_code=[代码])` 查询每只自选股的申万一级行业分类（`l1_name`），统计频次，取前三大行业作为重点关注行业。
3. **计算日期参数**：通过交易日历查询确定 `start_date`（前一个交易日）和 `start_date_30d`（30 日前）日期。
4. **制定 Sub-agent 批次计划**：根据自选股数量，将数据收集任务编排为每批 ≤3 个 Sub-agent 的执行队列。

**输出**：股票代码列表、重点行业列表、日期参数、批次计划。

### Stage 2：数据收集（Sub-agent 执行，严格落盘）
**目标**：并行收集全量数据，所有原始数据落盘，主 Agent 上下文仅保留摘要索引。

#### 批次 1（spawn 2 个Sub-agent并发）
| Sub-agent | 任务 |
|-----------|------|
| SA-1 | 快讯 `queryFlashNewsList(start_time=[前一日])` |
| SA-2 | 宏观新闻 `queryNewsList(start_date, importance_score=4, news_type='macro')` + 各行业（≤4）新闻 `queryNewsList(..., news_type='industry', tags=[行业])` + 各行业研报 `queryResearchList(..., report_type='industry', tags=[行业])` |

#### 批次 2+（每批 ≤3 个Sub-agent并发，滚动执行）
按批次计划继续（每个股票spawn一个Sub-agent执行以下查询）：
- **自选股资讯**：
    - 新闻 `queryNewsList(start_date, importance_score=3, news_type='stock', tags=[code])` 
    - 研报 `queryResearchList(start_date, importance_score=3, report_type='stock', tags=[code])`
    - 公告 `queryAnnouncementList(start_date, importance_score=3, stock_code=[code])`
- **自选股行情**：
    - 日行情 `queryStockDaily(stock_code, start_date=[30日前的日期])`
    - 资金流向 `queryMoneyflow(stock_code, start_date=[30日前的日期])`

#### 批次完成后
1. 等待全部 Sub-agent 返回
2. 更新 `data-index.md` 
3. 更新 `sub-agent-list.txt`
4. 在上下文中提示“原始数据文件索引在 data-index.md 中，sub-agent列表及工作摘要在 sub-agent-list.txt 中”

### Stage 3：逐章节生成（主 Agent 执行）
**目标**：读取落盘数据，在任务目录创建 `final-output-morning-briefing-<YYYYMMDD>.md` 并逐章节编写。

1. **创建文件**：写入标题 `【每日早报：YYYY-MM-DD】`。
2. **宏观要闻章节**：
    - 读取 `flash-news.md` + `macro-industry.md`
    - 撰写：关键数据（有则列，无则填"无"）、宏观摘要（~100字）、产业信息（每行业~50字，最多 3 行业）、重要资讯（按重要性降序前 5 条，格式 `{资讯分类:id} 标题`）
3. **自选股雷达章节**：
    - 逐个读取 `stock-{code}-info.md` + `stock-{code}-market.md`
    - 撰写：资讯摘要（~200字）、前期异动（基于行情与资金流向，~200字）、风险排雷（~100字，无风险填"今日暂无重大排雷事项"）、重要资讯（1~5 条）
4. **尾注**：汇总所有落盘文件中的 `[参考资料]` 引用，写入 `[AI生成提示]`。

### Stage 4：完整性检查（主 Agent 执行）
**目标**：验证交付物完整性和引用规范。

1. 检查成果文档所有章节均已填充，无空白占位。
2. 检查 `[参考资料]` 尾注格式符合 `{资讯分类:id} 标题` 规范，引用真实（非捏造）。
3. 检查所有 `[AI生成提示]` 已填写。
4. 检查所有落盘文件存在且非空。
5. 如发现缺失，回退补全对应章节。
6. 最后交付`final-output-*.*`, `data-index.md`, `sub-agent-list.txt` 文件, 不要交付其他文件

## 交付标准（输出模板）

请严格按以下模块化结构输出：

【每日早报：YYYY-MM-DD】

1. 宏观要闻
关键数据：[从宏观新闻里获取，不要随意捏造。例：X月CPI公布，前值A，预期B，实际C。无则填"无"]
宏观摘要：[从宏观新闻总结，100字内摘要]
产业信息：[三行业150字以内]
    [行业1名称]：[事件核心要素] + [供需关系或产业链的逻辑影响]。
    [行业2名称]：[事件核心要素] + [供需关系或产业链的逻辑影响]。
    [行业3名称]：[事件核心要素] + [供需关系或产业链的逻辑影响]。
重要资讯：[从上述 `[参考资料]` 提取宏观/行业列表，按重要性降序排前5条。格式：`{资讯分类:id} 标题`]
2. 自选股雷达
资讯摘要：[针对所有自选股，资讯总结，200字内摘要]
前期异动：[针对所有自选股的行情和资金流向数据，分析行情异动，200字内摘要]
风险排雷：[针对所有自选股，仅提取明确的负面催化因素。无明确风险则强制输出："今日暂无重大排雷事项"。100字内摘要]
重要资讯：[从上述 `[参考资料]` 提取个股新闻/研报/公告列表，按重要性降序排1～5条。格式：`{资讯分类:id} 标题`]

### [参考资料]
[汇总所有落盘文件中的资料引用，严格按 `{资讯分类:id} 标题` 格式排列]

### [AI生成提示]
以上内容由AI生成，可能存在偏差，仅供参考。
[其他说明，如使用模型先验知识生成的说明、关键数据源不足的说明]

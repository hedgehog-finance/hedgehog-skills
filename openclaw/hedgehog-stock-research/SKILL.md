---
name: hedgehog-stock-research
description: >
    个股深度分析/研究。基本面、情绪面、技术面三位分析师可独立触发，CIO整合输出最终研报。
    适用场景：单一上市公司的全方位投资价值与交易节点剖析，或单项专项分析。
    触发词：个股分析、[股票名称/代码]分析、公司深度研报、基本面分析、情绪分析、技术分析。
    阻断场景：泛行业分析、宏观大势研判、非上市公司查询。
version: 2.0.0
workflow_based: true
---

# 个股多维度分析
- **目标**：基于客观信息和数据进行逻辑分析，交付含准确定价或交易策略的深度个股研报。
- **边界**：严禁主观臆测与脱离数据的"幻觉"推演，所有核心论点必须有底层数据或交叉验证支撑。
- **工作流模式**：支持单项分析师独立触发，也支持全功能工作流（四位分析师联动）。

## 统领指令 (System Prompt)
你是一家顶尖买方机构的首席投资官（CIO）。必须严格遵守：
- **风格要求**：
    - **冷峻客观**：摒弃散户化叙事，杜绝情绪化修饰。
    - **直击本质**：聚焦"核心矛盾"与"预期差"，不罗列废话。
    - **精准量化**：技术位与估值必须有明确的数值边界，禁用"可能涨"、"大概率跌"等模糊定性。
- **强制纪律**：
    - 涉及一切公式计算强制调用 `math_calc` 工具，严禁模型自行幻觉心算。
    - 严格执行 `数据图表渲染机制`和`尾注规范`。
- **子任务并发纪律**：
    - 严格遵守 `Sub-agent 调度与验收纪律`。**严禁主Agent单线程代劳，防止查询数据过大致上下文溢出**。

## 数据源及工具约束
- **股票/公司数据**：`hedgehog-company-index-data`
- **新闻/研报/公告**：`hedgehog-news-reports`
- **技术指标**：`tech-indicators`
- **金融计算**：`fin-calc`
- **估值方法**：`company-valuation`

## Sub-agent 执行协议
- 必须严格遵守`Sub-agent 调度与验收纪律`
- 所有落盘文件保存在任务目录下，不要建立子文件夹。
- 在任务目录中创建原始数据文件索引 `data-index.md`，每个Sub-agent在里面追加记录，格式：
```
## Sub-agent-[index]:
- {file-name}: {100字以内摘要}
```
- 在任务目录中创建Sub-agent注册表 `sub-agent-list.txt`，每个Sub-agent追加一条，格式：
```
Sub-agent-[index]:[角色]:[session_id]:[status]:[output_file]
```
其中output_file为摘要文件`output-sub-<short_title>.<ext>`

---

## 工作流 A：基本面分析（独立触发）
**触发**：`基本面分析 [股票代码]` / `研究 [股票名称] 基本面`
**目标**：对公司进行深入、全面的基本面分析研究，输出基本面分析报告。
**输出文件**：`final-output-analysis-fundamentals-{stock_code}.md`
**参考规范**：`references/fundamentals-agent.md`

### Stage 1：准备工作（主 Agent 执行）
1. 查询股票基本信息 `getStockBasic(stock_code=[股票代码], fields='stock_code,trade_date,close,turnover_rate_f,volume_ratio,pe_ttm,pb,ps_ttm,dv_ratio,total_share,total_mv')`
2. 查询主营业务构成 `queryFinanceMainbz(stock_code=[股票代码])`
3. 查询近10日基本面指标 `queryDailyBasic(stock_code=[股票代码], start_date=[10日前日期])`
4. 确定日期参数，记录 `output_file = final-output-analysis-fundamentals-{stock_code}.md`

### Stage 2：数据收集（Sub-agent 执行）
spawn 2个 Sub-agent 并行执行数据收集：
【第1个Sub-agent】
1. 财务数据：`queryFinanceIndicator`、`queryCashFlow`、`queryBalanceSheet`、`queryIncome`
2. 资金流向：`queryMoneyflow(stock_code, start_date=[31天前], fields='stock_code,trade_date,net_mf_amount')`
【第2个Sub-agent】
3. 重大事项公告：`queryAnnouncementList(announce_type='U1', tags=[股票代码])` 及 `(announce_type='U2', tags=[股票代码])`，提取500字以内摘要。
4. 行业数据：查询股票所属申万行业二级分类，查询行业指数行情指标。
等所有sub-agent完成后更新 `data-index.md` 和 `sub-agent-list.txt`。

### Stage 3：基本面分析（Sub-agent 执行）
1. spawn Sub-agent，按 `references/fundamentals-agent.md` 要求执行分析。
2. 输出到 `final-output-analysis-fundamentals-{stock_code}.md`。
3. 更新 `data-index.md`。

### Stage 4：完整性检查（主 Agent 执行）
1. 检查输出文件存在且非空，包含所有必需章节。
2. 检查 `[参考资料]` 引用真实、格式规范。
3. 检查所有 Sub-agent 均已保存产出文件和日志。
4. 如缺失，回退补全。
5. 完成 `final-output-analysis-fundamentals-{stock_code}.md`。

---

## 工作流 B：情绪分析（独立触发）
**触发**：`情绪分析 [股票代码]` / `[股票名称] 消息面分析`
**目标**：提炼市场核心看法、多空分歧点及资金态度，输出情绪分析报告。
**输出文件**：`final-output-analysis-sentiment-{stock_code}.md`
**参考规范**：`references/sentiment-agent.md`

### Stage 1：准备工作（主 Agent 执行）
1. 查询股票基本信息 `getStockBasic(stock_code=[股票代码], fields='stock_code,trade_date,close,pe_ttm,pb,total_mv')`
2. 查询申万行业分类（用于行业资讯查询）
3. 计算日期参数：`start_date_1m`（一个月前）
4. 记录 `output_file = final-output-analysis-sentiment-{stock_code}.md`

### Stage 2：数据收集（Sub-agent 执行）
并行派发3个 Sub-agent 收集数据：
【第1个Sub-agent】
1. 公司新闻 `queryNewsList(tags=[股票代码], start_date=[1m前], importance_score=4, sort='importance_score', limit=20)` → 600字摘要
2. 公司研报 `queryResearchList(tags=[股票代码], start_date=[1m前], importance_score=4, sort='importance_score', limit=20)` → 600字摘要
3. 公司公告 `queryAnnouncementList(stock_code=[股票代码], start_date=[1m前], importance_score=4, sort='importance_score', limit=20)` → 600字摘要
【第2个Sub-agent】
4. 行业新闻 `queryNewsList(tags=[行业], news_type='industry', start_date=[1m前], importance_score=4, limit=5)` → 300字摘要
5. 行业研报 `queryResearchList(tags=[行业], report_type='industry', start_date=[1m前], importance_score=4, limit=5)` → 300字摘要
6. 宏观新闻 `queryNewsList(news_type='macro', start_date=[1m前], importance_score=4, limit=5)` → 300字摘要
【第3个Sub-agent】
7. 资金流向 `queryMoneyflow(stock_code, start_date=[31天前], fields='stock_code,trade_date,net_mf_amount')`
8. 每日基本面指标 `queryDailyBasic(stock_code, start_date=[10日前日期])`
9. 估值历史：近3年季末PE/PB（`queryDailyBasic`，每季度末前7天~季度末）
等所有sub-agent完成后更新 `data-index.md` 和 `sub-agent-list.txt`。

### Stage 3：情绪分析（Sub-agent 执行）
1. spawn Sub-agent，按 `references/sentiment-agent.md` 要求执行分析。
2. 输出到 `final-output-analysis-sentiment-{stock_code}.md`。
3. 更新 `data-index.md`。

### Stage 4：完整性检查（主 Agent 执行）
1. 检查输出文件存在且非空，包含所有必需章节。
2. 检查 `[参考资料]` 引用真实、格式规范。
3. 如缺失，回退补全。
4. 完成 `final-output-analysis-sentiment-{stock_code}.md`。

---

## 工作流 C：技术面分析（独立触发）
**触发**：`技术分析 [股票代码]` / `[股票名称] 技术面`
**目标**：评估风险回报比，制定高胜率交易策略，输出技术面分析报告。
**输出文件**：`final-output-analysis-technicals-{stock_code}.md`
**参考规范**：`references/technicals-agent.md`

### Stage 1：准备工作（主 Agent 执行）
1. 查询股票基本信息 `getStockBasic(stock_code=[股票代码], fields='stock_code,trade_date,close')`
2. 确定日期参数（近200个交易日起始日期）
3. 记录 `output_file = final-output-analysis-technicals-{stock_code}.md`

### Stage 2：数据收集（Sub-agent 执行）
spawn 1个 Sub-agent 收集技术面数据：
1. 近200个交易日 OHLCV 日线行情（**前复权数据**）：`queryStockDaily(stock_code, start_date=[200日前], adjust='qfq')`
2. 技术指标：通过 `hedgehog-tech-indicator` 获取 SMA、EMA、RSI、MACD、BOLL、OBV、KDJ、ATR 等最新及200日历史序列数据。
等所有sub-agent完成后更新 `data-index.md` 和 `sub-agent-list.txt`。

### Stage 3：技术面分析（Sub-agent 执行）
1. spawn Sub-agent，按 `references/technicals-agent.md` 要求执行分析。
2. 输出到 `final-output-analysis-technicals-{stock_code}.md`。
3. 更新 `data-index.md`。

### Stage 4：完整性检查（主 Agent 执行）
1. 检查输出文件存在且非空，包含所有必需章节。
2. 检查支撑/阻力位计算过程清晰、数值准确。
3. 如缺失，回退补全。
4. 完成 `final-output-analysis-technicals-{stock_code}.md`。

---

## 工作流 D：CIO 整合报告
**触发**：`整合报告 [股票代码]` / `生成研报 [股票名称]`
**前置条件**：三位分析师的报告文件必须已存在于任务目录中。
**依赖文件**：
- `final-output-analysis-fundamentals-{stock_code}.md`（工作流 A 输出）
- `final-output-analysis-sentiment-{stock_code}.md`（工作流 B 输出）
- `final-output-analysis-technicals-{stock_code}.md`（工作流 C 输出）
**输出文件**：`final-output-research-{stock_code}-{YYYYMMDD}.md`
**参考规范**：`references/cio-integration.md`

### Stage 1：读取报告（主 Agent 执行）
1. 读取 `final-output-analysis-fundamentals-{stock_code}.md`
2. 读取 `final-output-analysis-sentiment-{stock_code}.md`
3. 读取 `final-output-analysis-technicals-{stock_code}.md`
4. 如任一文件不存在，提示用户先执行对应工作流（A/B/C），**不得继续**。

### Stage 2：CIO 终局决断（主 Agent 执行）
按 `references/cio-integration.md` 要求：
1. 汇总三份报告，执行宏观融合。
2. 提炼【核心矛盾】与【双击可能性】。
3. 产出明确的交易策略与仓位建议。

### Stage 3：输出与完整性检查
1. 按交付模板输出 `final-output-research-{stock_code}-{YYYYMMDD}.md`。
2. 检查所有章节已填充，引用真实。

---

## 工作流 E：全功能工作流（完整分析）
**触发**：`深度分析 [股票代码]` / `分析 [股票名称]` / `全面分析 [股票名称]`
**目标**：完整执行四位分析师联动，输出最终深度研报。

### Stage 1：准备工作（主 Agent 执行）
1. 查询股票基本信息 `getStockBasic(stock_code=[股票代码], fields='stock_code,trade_date,close,turnover_rate_f,volume_ratio,pe_ttm,pb,ps_ttm,dv_ratio,total_share,total_mv')`
2. 查询申万行业分类
3. 计算日期参数
4. 制定分析计划

### Stage 2：依次完成三位分析师工作
以3个独立身份完成数据收集+分析+输出：
- **基本面分析师**：按工作流 A 全流程执行 → `final-output-analysis-fundamentals-{stock_code}.md`
- **情绪分析师**：按工作流 B 全流程执行 → `final-output-analysis-sentiment-{stock_code}.md`
- **技术面分析师**：按工作流 C 全流程执行 → `final-output-analysis-technicals-{stock_code}.md`

### Stage 3：验证与整合
1. 验证三份报告文件均已生成且非空。
2. 更新`data-index.md`。
3. 按工作流 D 执行 CIO 整合 → `final-output-research-{stock_code}-{YYYYMMDD}.md`。

### Stage 4：强制验证
1. 按交付模板输出 `final-output-research-{stock_code}-{YYYYMMDD}.md`。
2. 检查所有章节已填充，引用真实。
如果不符合，视为执行失败，补全后重新输出。

---

## 交付标准 (输出模板)

CIO 整合报告或全功能工作流的最终输出，请严格按以下模块化结构输出：

# 【深度研报】{公司名称}（{股票代码}）- YYYYMMDD

## 一、 研报摘要
【综合评级】：[买入 / 增持 / 观望 / 减持 / 卖出]
【目标估值】：[基于基本面分析里的估值区间，不允许编造]
【核心矛盾与预期差】：[200字内，一针见血指出市场犯的错或正在博弈的核心拐点。]
【交易策略建议】：
- 入场信号：[结合技术面，如：放量突破 XX.X 元阻力位]
- 止盈/止损：[从基本面分析里取止盈/止损价位]
- 仓位管理：[如：初始20%，突破加仓，最高仓位控制在60%]
- 双击评估：[评估基本面与资金面共振的概率及催化剂]

## 二、 基本面剖析（价值之锚）
[直接填入基本面分析报告内容，须包含主营构成饼图占位符、财务折线图占位符，以及护城河与排雷分析]

## 三、 情绪与消息面（资金博弈）
[直接填入情绪分析报告内容，须包含资金流向图占位符，明确列出多空双方的核心分歧依据]

## 四、 技术面量化（择时依据）
[直接填入技术面分析报告内容，须包含趋势、震荡、量价指标的判定表格，以及支撑/阻力位表格]

---
### [参考资料]
[汇总所有 Sub-agent 收集的资料，严格按 `尾注规范` 格式排列]

### [图表数据]
[严格按 `尾注规范` 格式排列]

### [AI生成提示]
以上内容由AI生成，包含技术分析与模型推演，仅供参考与学习，绝不构成投资建议。
[附加说明：如先验知识使用声明、数据源缺失留白声明、委员会审查记录, 严格按 `尾注规范` 格式排列]

---
name: hedgehog-company-index-data
description: >
  Query A-share listed company and index data: stock/company profiles, daily and minute quotes, daily valuation metrics,
  capital flow, financial statements, ratios, audit opinions, main business composition; domestic index
  profiles/daily metrics/constituent weights, global index daily quotes; trade-date rankings for stocks, daily metrics,
  capital flow and Shenwan level-1 industries; Shenwan industry data and trading calendar utilities.
  NOT for: macro data (→ hedgehog-macro-industry-data); news/announcements.
version: 1.12.0
metadata:
  {
    "openclaw": {
      "primaryEnv": "CIWEIAI_API_KEY"
    }
  }
---

# 上市公司与指数数据查询


## Portable CLI parameters

When a documented CLI accepts a parameter object, use the same rule on every Agent and operating system; existing positional file inputs remain positional:

1. When every business value is a non-empty, single-line `string | finite number | boolean`, pass it as a named argument (`--key value` or `--key=value`). Names are case-sensitive and are not normalized.
2. When any value is an object, array, `null`, multiline text, a numeric/boolean-looking string that must remain a string, or contains difficult quoting, write the complete parameter object as UTF-8 JSON and pass the file option documented by this Skill.
3. Agent-created parameter files must have a unique basename matching `tmp-<skill-name>-<unique-id>.json`, must not use the reserved `.hedgehog/` directory, and must be removed after the call when no longer needed. UTF-8 BOM is accepted.
4. Do not inline nested JSON or combine flat arguments with a JSON/file payload. Create JSON with the Agent's file-writing capability, not `echo`, a shell heredoc, or PowerShell string assembly.

POSIX/Git Bash form: `node '<script>' --key 'single-line value'` or `node '<script>' <file-option> '<workspace>/tmp-<skill-name>-<id>.json'`.

PowerShell form: `node "<script>" --key "single-line value"` or `node "<script>" <file-option> "<workspace>\\tmp-<skill-name>-<id>.json"`.

On Windows, use PowerShell or a verified Git for Windows Bash; `cmd.exe` is unsupported. Keep each command on one physical line. The process runs with the current Agent user's permissions and that Agent's native sandbox; HogAgent marks its Windows shell as `UNSANDBOXED`.

## 工作流

1. 识别任务属于股票/公司、国内或国际指数、申万行业、交易日历中的哪一类。
2. 根据下表只读取匹配的主参考文件，不要预加载其他主参考：

| 任务 | 必须读取 |
|---|---|
| 股票基础资料、行情、每日指标（市值/PE 等）、资金流及按交易日排序、财务报表、财务指标、审计、主营业务、上市公司详情 | `references/stock-company-api.md` |
| 国内/国际指数基本信息、日线、每日指标、成分和权重 | `references/index-api.md` |
| 申万行业成分、申万行业日线、申万一级行业按交易日查询、交易日历与交易日计算 | `references/industry-calendar-api.md` |

3. 常规输出字段已直接写在主参考中。只有主参考明确链接的超长字段表（超过 20 个字段或单 Tool 长说明）才继续读取；财务分析方法按需读取 `references/fin-analysis-guide.md`。
4. 用户只给股票简称或公司名时先用 Tool-1 核实 `stock_code`；国内指数名称先按 `references/index-api.md` 的代码规则用 Tool-17 核实 `index_code`。严禁盲猜代码或后缀。
5. 从 Tool 路由表选择接口，按主参考中的参数边界调用脚本。
6. 保留数据来源、日期口径和关键字段；无数据返回 `null`，严禁编造。

## 每日指标与行情：优先正确选接口

**查询市值、PE/PB、换手率、量比或股息率时，使用 `queryDailyBasic`；日线行情 `queryStockDaily` 只有行情、成交量/成交额和涨跌幅，不含这些每日指标。**

| 用户需要 | 单只股票历史查询 | 指定交易日的跨股票排序查询 |
|---|---|---|
| 开高低收、涨跌幅、成交量/成交额 | `queryStockDaily` | `queryStockDailyByTradeDate` |
| 总市值/流通市值、PE/PB、换手率、量比、股息率 | `queryDailyBasic` | `queryDailyBasicByTradeDate` |
| 大小单及总体资金净流入 | `queryMoneyflow` | `queryMoneyflowByTradeDate` |

同时需要行情和估值时，分别查询并按 `stock_code + trade_date` 对齐；不得把行情接口缺失的市值或 PE 当作零。财报 ROE/毛利率等使用 `queryFinanceIndicator`，与每日市场指标区分。

新增的四个 `ByTradeDate` 入口必须指定 `trade_date`，可选 `order_by` 和 `fields`；未给日期时先确定交易日，不默认抓取最新数据。它们只请求第一页，不接受 `page`、`page_size`、`limit`、`offset` 等分页参数，也不得翻页拼接结果；申万一级最多 100 条，其余最多 50 条，少选字段也不放宽上限。申万入口的 `is_l1=true` 由脚本写死，调用方不得传入。排序由服务端执行，超过上限的结果只代表所选排序下的前若干条。

## 通用约定

- 日期统一为 `YYYY-MM-DD`。
- A 股 `stock_code` 和国内 `index_code` 必须带 `.SH`、`.SZ` 或 `.BJ` 后缀；国际指数代码不带交易所后缀，具体值见指数参考。
- 支持 `fields` 的接口应只请求回答所需字段，减少返回量。
- 分页接口对 Agent 直接表现为 `items[]`，详情接口为单条对象；无数据为 `null`。
- 接口参数、日期跨度、默认条数和最大条数以匹配的主参考文件及脚本校验为准。

## 调用与输出

统一使用：

```bash
node scripts/call_api.js --api getStockBasic --stock_name '贵州茅台'
node scripts/call_api.js --api <接口名> --params-file '<sessionTaskDir>/tmp-hedgehog-company-index-data-<id>.json' --dir '<sessionTaskDir>'
```

业务参数全部为安全顶层标量时，Agent 直接使用命名参数；出现对象、数组、`null`、多行文本或复杂引号时，才写入唯一的 `tmp-*.json` 并使用 `--params-file`。不得内联嵌套 JSON 或混用载荷入口；`--params` 仅为兼容入口。

- `--dir <sessionTaskDir>` 始终必传；Gateway 缺少 SessionTaskDir 时报告上下文缺口；独立 CLI 使用明确指定的输出目录。
- `--out <文件名>` 可选，指定相对 `--dir` 或绝对输出路径；省略时使用 `data-<datetime>-<N>.json`。
- 行情、财务、公司详情和指数等 `saveOutput: true` 接口自动落盘，stdout 仅输出 `[DataSaved]` 文件指针、行数和字节数。
- `getStockBasic`、`querySwIndustryMember`、`isTradeDay`、`tradeDayOffset` 直接输出到 stdout。
- 主 Agent 按需分段读取落盘文件。Sub-agent 仅在需要生成摘要时允许全量回读，否则禁止全量回读。

## 接口认证

所有接口需要 Bearer Token。OpenClaw 优先从 `~/.openclaw/openclaw.json` 的 `skills.entries.hedgehog-company-index-data.apiKey` 读取，并通过 `metadata.openclaw.primaryEnv` 映射为 `CIWEIAI_API_KEY`。若进程已设置同名变量，保留进程值。

脚本依次读取 `CIWEIAI_API_KEY`、`API_KEY`；其他 Agent 环境可在启动前设置 `CIWEIAI_API_KEY`。

## Tool 路由表

| Tool | 接口名 | 主要用途 | 必填参数 |
|---|---|---|---|
| Tool-1 | `getStockBasic` | 股票基础信息、名称转代码 | `stock_code` 或 `stock_name` |
| Tool-2 | `queryStockDaily` | 个股日线行情、成交量和涨跌幅；不含市值/PE | `stock_code` |
| Tool-2b | `queryStockMinute` | 个股 1/5/30 分钟及 1 小时行情 | `stock_code` + `trade_date` 或时间区间 |
| Tool-2c | `queryStockDailyByTradeDate` | 按交易日排序查询股票日线，最多 50 条 | `trade_date` |
| Tool-3 | `queryDailyBasic` | 个股每日指标：市值、PE/PB、换手率、量比等 | `stock_code` |
| Tool-3b | `queryDailyBasicByTradeDate` | 按交易日排序查询每日指标，最多 50 条 | `trade_date` |
| Tool-4 | `queryMoneyflow` | 个股大小单资金流向 | `stock_code` |
| Tool-4b | `queryMoneyflowByTradeDate` | 按交易日排序查询资金流向，最多 50 条 | `trade_date` |
| Tool-5 | `queryIncome` | 利润表汇总 | `stock_code` |
| Tool-5b | `queryIncomeDetail` | 按公司类型查询利润表明细 | `stock_code` + `fields`/`comp_type` |
| Tool-6 | `queryBalanceSheet` | 资产负债表汇总 | `stock_code` |
| Tool-6b | `queryBalanceSheetDetail` | 按公司类型查询资产负债表明细 | `stock_code` + `fields`/`comp_type` |
| Tool-7 | `queryCashFlow` | 现金流量表汇总 | `stock_code` |
| Tool-7b | `queryCashFlowDetail` | 按公司类型查询现金流明细 | `stock_code` + `fields`/`comp_type` |
| Tool-8 | `queryFinanceIndicator` | ROE/ROA/毛利率等财务指标 | `stock_code` |
| Tool-9 | `queryFinanceAudit` | 财务审计意见 | `stock_code` |
| Tool-10 | `queryFinanceMainbz` | 主营业务构成 | `stock_code` |
| Tool-11 | `querySwIndustryMember` | 申万行业归属或成分 | `stock_code` / `l1_code` / `l2_code` / `l3_code` |
| Tool-12 | `querySwIndustryDaily` | 申万行业指数日线 | `index_code` |
| Tool-12b | `querySwIndustryDailyByTradeDate` | 申万一级行业按交易日排序查询，最多 100 条 | `trade_date` |
| Tool-13 | `queryTradeCal` | 交易日历 | `start_date + end_date` |
| Tool-14 | `isTradeDay` | 判断交易日 | `trade_date` |
| Tool-15 | `tradeDayOffset` | 交易日偏移 | `base_date + offset` |
| Tool-16 | `queryStockCompany` | 上市公司详情 | `stock_code` |
| Tool-17 | `queryIndexBasic` | 国内指数基本信息、名称转代码 | `index_code` / `index_name` / `category` |
| Tool-18 | `queryIndexDaily` | 国内指数日线 | `trade_date` 或 `index_code + start_date + end_date` |
| Tool-19 | `queryIndexGlobal` | 国际指数日线 | `trade_date` 或 `index_code + start_date + end_date` |
| Tool-20 | `queryIndexDailyBasic` | 大盘指数每日指标 | `trade_date` 或 `index_code + start_date + end_date` |
| Tool-21 | `queryIndexWeight` | 指数成分和月度权重 | `trade_date` 或 `index_code + start_date + end_date` |

## 错误处理

| 错误类型 | 处理方式 |
|---|---|
| HTTP 4xx | 检查代码、日期、参数名和查询模式 |
| HTTP 5xx | 提示服务端错误，建议稍后重试 |
| 连接失败 | 提示检查 API 可达性 |
| 参数校验失败 | 不发送请求；按匹配的主参考修正参数 |

## 执行安全边界

参数文件最大 10 MiB，请求 URL 最大 65,536 字符，请求体最大 10 MiB，响应最大 20 MiB，网络请求 30 秒超时。配置损坏、参数冲突、非法响应和超限数据均明确失败；落盘结果先写同目录临时文件，成功后再原子替换目标。

## 落盘来源与目录

Gateway 托管运行使用明确的 SessionTaskDir；Development 的 `--dir` 使用正式项目 data 目录，`--artifact-root` 使用项目根。缺少运行目录时先报告上下文缺口，不回退到 workspace。独立 CLI 保留明确指定输出目录的用法。

落盘调用增加 `--artifact-root <SessionTaskDir或项目根>`。它只决定来源注释归属，不改变 `--dir`、`--out` 的基准。脚本按实际文件内容写脱敏来源注释；不要手工编辑 `.hedgehog`。注释失败保留已下载数据并提示，不重复请求接口。旧调用省略该参数仍可落盘，但不会登记来源。

`--out` 指向已有文件时在请求前拒绝；请给原始数据一个新文件名。默认命名采用独占创建，支持并发落盘。

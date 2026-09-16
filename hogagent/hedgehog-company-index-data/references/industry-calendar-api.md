# 申万行业与交易日历接口

本参考包含 Tool-11 至 Tool-15（含 Tool-12b）。处理申万行业归属、行业指数行情、一级行业按交易日查询或交易日计算时先读本文件；其他任务不要加载。

所有日期使用 `YYYY-MM-DD`。`fields` 为可选的逗号分隔返回字段列表。

## Tool-11 申万行业成分 `querySwIndustryMember`

用于查询单只股票所属申万行业，或某个申万行业当前有效的成分股。

`stock_code`、`l1_code`、`l2_code`、`l3_code` 四选一必填；可选 `fields`。脚本固定设置 `is_new=Y`，按 `in_date` 倒序，最多返回 300 条，并直接输出到 stdout。

返回字段：

`stock_code, stock_name, l1_code, l1_name, l2_code, l2_name, l3_code, l3_name, in_date`

## Tool-12 申万行业日线 `querySwIndustryDaily`

用于查询申万行业指数开高低收、涨跌幅、成交量、成交额、PE 和 PB。

| 参数 | 必填 | 说明 |
|---|---|---|
| `index_code` | 是 | 申万行业指数代码 |
| `start_date` | 否 | 开始日期，距今最多 10 年 |
| `end_date` | 否 | 结束日期 |
| `fields` | 否 | 逗号分隔返回字段 |

默认区间最多 60 天、最多 60 条；`fields` 不超过 6 个时放宽为 180 天、180 条。结果按 `trade_date` 倒序并自动落盘。

返回字段：

`index_code, trade_date, name, open, low, high, close, change, pct_change, vol, amount, pe, pb, float_mv, total_mv`

`pct_change` 单位为百分比；`vol` 为万股；`amount`、`float_mv`、`total_mv` 为万元。

## Tool-12b 申万一级行业按交易日查询 `querySwIndustryDailyByTradeDate`

固定调用 `GET /v1/stock/sw-industry-daily`（路径相对 `/api/data`），查询某一交易日的申万一级行业指数。

| 参数 | 必填 | 说明 |
|---|---|---|
| `trade_date` | 是 | 有效的 `YYYY-MM-DD` 交易日期；不可省略或以日期区间代替 |
| `order_by` | 否 | 后端支持的非空排序字符串，原样传入；省略时使用服务端默认排序 |
| `fields` | 否 | 逗号分隔返回字段，字段及单位同 Tool-12 |

脚本硬编码 `is_l1=true`，只查申万一级行业；**不对外开放 `is_l1`，即使调用方传 `true` 也拒绝**。不接收 `index_code`、`start_date`、`end_date`；单个行业历史区间使用 Tool-12。

不允许分页，不接收 `page`、`page_size`、`limit`、`offset` 或其他额外参数；内部固定 `page=1, page_size=100`，一次只发一个请求，响应侧也最多保留 100 条。`fields` 较少时仍不得放宽上限或翻页拼接。排序在服务端完成，返回顺序原样保留；无数据为 `null`，结果自动落盘。

示例（在技能目录运行；Hermes 的脚本路径使用 `${HERMES_SKILL_DIR}/scripts/call_api.js`）：

```bash
node scripts/call_api.js --api querySwIndustryDailyByTradeDate --trade_date 2026-09-15 --fields index_code,trade_date,name,pct_change,pe,pb --dir '<sessionTaskDir>' --artifact-root '<sessionTaskDir>'
```

## Tool-13 交易日历 `queryTradeCal`

`start_date`、`end_date` 必填，区间最多 366 天；`exchange` 可选，默认 `SSE`。返回 `cal_date, is_open`，其中 `is_open` 为 `1` 表示开盘、`0` 表示休市。结果自动落盘。

## Tool-14 判断交易日 `isTradeDay`

必须传 `trade_date`。结果直接输出：

```json
{"trade_date":"2024-01-02","is_open":1}
```

## Tool-15 交易日偏移 `tradeDayOffset`

必须传 `base_date` 和整数 `offset`；正数向后、负数向前。结果直接输出：

```json
{"base_date":"2024-01-02","offset":5,"target_date":"2024-01-09"}
```

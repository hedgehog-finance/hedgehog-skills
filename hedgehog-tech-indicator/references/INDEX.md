# 接口索引

| 接口名 | 方法 | 路径 | 说明 | 文档 |
|--------|------|------|------|------|
| SMA | POST | /v1/indicators/calculate 或 /v1/indicators/calculate-from-data | 计算收盘价简单移动平均线 | [查看](./sma.md) |
| EMA | POST | /v1/indicators/calculate 或 /v1/indicators/calculate-from-data | 计算收盘价指数移动平均线 | [查看](./ema.md) |
| RSI | POST | /v1/indicators/calculate 或 /v1/indicators/calculate-from-data | 计算相对强弱指数 | [查看](./rsi.md) |
| MACD | POST | /v1/indicators/calculate 或 /v1/indicators/calculate-from-data | 计算异同移动平均线、信号线和柱状值 | [查看](./macd.md) |
| BOLL | POST | /v1/indicators/calculate 或 /v1/indicators/calculate-from-data | 计算布林带上下轨、中轨、带宽和百分比位置 | [查看](./boll.md) |
| OBV | POST | /v1/indicators/calculate 或 /v1/indicators/calculate-from-data | 计算能量潮成交量指标 | [查看](./obv.md) |
| KDJ | POST | /v1/indicators/calculate 或 /v1/indicators/calculate-from-data | 计算K、D、J三线随机指标 | [查看](./kdj.md) |
| ATR | POST | /v1/indicators/calculate 或 /v1/indicators/calculate-from-data | 计算平均真实波动幅度 | [查看](./atr.md) |
| VWAP | POST | /v1/indicators/calculate 或 /v1/indicators/calculate-from-data | 计算成交量加权平均价 | [查看](./vwap.md) |

说明：以上为逻辑接口名。脚本会将接口名映射为后端 `indicator` 字段，例如 `BOLL` 映射为 `bbands`；传 `data` 时走直传计算，不传 `data` 时走行情查询计算。

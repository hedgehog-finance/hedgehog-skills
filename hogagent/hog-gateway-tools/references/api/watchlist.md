# 自选股 API

正常使用 `find-stock`、`get-watchlist`、`watchlist-add`、`watchlist-move`。以下表格用于经用户确认后的诊断/兼容处理。所有 ID 和代码必须来自实际查询。

| 方法/路径 | 输入与结果 |
|---|---|
| `GET /api/watchlist?list_type=watchlist` | `list_type` 可为 `watchlist`/`candidate`，缺省正式自选；可选 `mark` 精确过滤。返回 `{data:[...],total}` |
| `GET /api/watchlist/count?list_type=watchlist` | 当前列表数量；使用服务端结果，不以本地缓存推断剩余额度 |
| `GET /api/watchlist/:id?list_type=watchlist` | 当前用户、指定列表的记录；返回 `{data:item}`，不存在返回错误 |
| `POST /api/watchlist` | body 必须有 `stock_code,list_type`；传入已核验的 `stock_name,exchange,market`。返回 HTTP 201 `{data:item,classification_started}` |
| `PUT /api/watchlist/reorder` | body `{list_type,items:[{id,sort_order}]}`；仅调整既有记录排序，返回 `{success:true}` |
| `POST /api/watchlist/move` | body `{id,list_type,target_list_type}`；源/目标必须不同，转入正式自选遵守容量限制；返回 `{data:{id,list_type}}` |
| `PATCH /api/watchlist/:id/mark` | body `{list_type,mark}`；空字符串清除，`ready-to-buy` 表示备买，普通添加不自动设置 |
| `DELETE /api/watchlist/:id?list_type=watchlist` | 从明确列表删除指定记录，需对应删除授权，返回 `{success:true}` |
| `GET /api/watchlist/sync?list_type=watchlist&since=<time>` | 沿用现有增量同步响应；账号和 Gateway 边界不变 |

默认正式自选 10 只（包含备买），候选 500 只，以当前服务端限制为准。同一股票不能同时在两个列表；跨列表用 move，标签保留。MCP `watchlist_add` 同列表重复返回 `{id,skipped:true}`；HTTP POST 会再读取记录并返回 `{data:item,...}`，**HTTP 201 本身不证明是本次新增**。

正式自选添加的行业/主题分类目前由消费端另行调度；Skill 只报告入库结果，不承诺已经完成分类。候选添加已有服务端异步分类，`classification_started` 也不等于分类完成。移动保留原有标签，不重新分类。

股票字典通过现有 MCP `get_stock_basic_list` / `get_stock_basic_info` 使用。不要凭 action 名发明 `/api/get_stock_basic_info` HTTP 路径。

请求确认与认证遵循[公共流程](request-flow.md)；[返回分类入口](../gateway-api.md)。

源码：Gateway `src/server/routes/watchlist.ts`，通过 `src/index.ts` 挂载 `/api/watchlist`。

import { printableToolResult, toolResultError } from './mcp-client.mjs';

async function invoke(client, name, input) {
  const response = await client.callTool(name, input);
  const error = toolResultError(response);
  if (error) throw new Error(error);
  if (response.resultType === 'task') throw new Error('Unexpected asynchronous watchlist response; verify the result before retrying');
  return printableToolResult(response);
}

function rows(result) {
  // The application registry returns an envelope; older standalone MCP reads returned an array.
  const items = Array.isArray(result) ? result : result?.watchlist;
  if (!Array.isArray(items)) throw new Error('Invalid watchlist response; stop and check Gateway compatibility');
  return items;
}

export async function findStock(client, query) {
  const result = await invoke(client, 'get_stock_basic_list', {});
  if (result?.success !== true || !Array.isArray(result.data)) throw new Error('Stock dictionary unavailable');
  const key = query.trim().toUpperCase().replace(/\.SS$/, '.SH');
  const fields = ['stock_code', 'symbol', 'name', 'fullname', 'enname', 'cnspell'];
  const exact = result.data.filter(item => fields.some(field => String(item[field] ?? '').toUpperCase() === key));
  const matches = exact.length ? exact : result.data.filter(item => fields.some(field => String(item[field] ?? '').toUpperCase().includes(key)));
  return { matches: matches.slice(0, 20), total: matches.length, truncated: matches.length > 20 };
}

export async function addWatchlist(client, stockCode, listType) {
  const code = stockCode.trim().toUpperCase().replace(/\.SS$/, '.SH');
  const result = await invoke(client, 'get_stock_basic_info', { stock_code: code });
  const stock = result?.data;
  if (result?.success !== true || !stock || stock.stock_code !== code || !['stock_code', 'name', 'exchange'].every(key => typeof stock[key] === 'string' && stock[key].trim())) {
    throw new Error('Stock code is not verified by the Gateway dictionary; use find-stock and resolve the exact market/code first');
  }
  const target = rows(await invoke(client, 'get_watchlist', { list_type: listType }));
  const existing = target.find(item => item.stock_code === stock.stock_code && item.exchange === stock.exchange);
  if (existing) return { status: 'already_present', id: existing.id, stock_code: stock.stock_code, list_type: listType };
  const otherType = listType === 'watchlist' ? 'candidate' : 'watchlist';
  const other = rows(await invoke(client, 'get_watchlist', { list_type: otherType }));
  const otherItem = other.find(item => item.stock_code === stock.stock_code && item.exchange === stock.exchange);
  if (otherItem) return { status: 'move_required', id: otherItem.id, stock_code: stock.stock_code, list_type: otherType, target_list_type: listType };
  const added = await invoke(client, 'watchlist_add', {
    stock_code: stock.stock_code, stock_name: stock.name, exchange: stock.exchange, market: typeof stock.market === 'string' ? stock.market : '', list_type: listType,
  });
  if (typeof added?.id !== 'string' || !added.id) throw new Error('Missing write receipt; verify the list before retrying');
  return { ...added, status: added.skipped ? 'already_present' : 'added', stock_code: stock.stock_code, list_type: listType };
}

export async function moveWatchlist(client, id, from, to) {
  if (from === to) throw new Error('Source and target lists must differ');
  const source = rows(await invoke(client, 'get_watchlist', { list_type: from }));
  if (!source.some(item => item.id === id)) {
    const target = rows(await invoke(client, 'get_watchlist', { list_type: to }));
    if (target.some(item => item.id === id)) return { status: 'already_in_target', id, list_type: to };
    throw new Error('Stock ID is not in the specified source list; read the lists again');
  }
  const moved = await invoke(client, 'watchlist_move', { id, list_type: from, target_list_type: to });
  if (moved?.id !== id || moved.list_type !== to) throw new Error('Invalid move receipt; verify both lists before retrying');
  return { ...moved, status: 'moved' };
}

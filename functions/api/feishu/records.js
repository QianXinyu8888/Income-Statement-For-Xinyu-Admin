/**
 * Cloudflare Pages Function
 * GET  /api/feishu/records  — 拉取全量交易记录（自动分页）
 * POST /api/feishu/records  — 新增交易记录
 * PUT  /api/feishu/records  — 更新交易记录（批量状态更新）
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

async function getTenantToken(env) {
  const appId = env?.FEISHU_APP_ID || 'cli_aafbdc1dc5b85bdd';
  const appSecret = env?.FEISHU_APP_SECRET || 'xYtSrjj4wg2aubHc85WPXg87xKxjC4lY';
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret,
    }),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error('获取飞书 Token 失败: ' + json.msg);
  return json.tenant_access_token;
}

async function getFirstTableId(token, env) {
  const bitableAppToken = env?.FEISHU_BITABLE_APP_TOKEN || 'I8uhbjG29aOl9Rs9wcjcWVmYnvd';
  const res = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${bitableAppToken}/tables`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const json = await res.json();
  if (json.code !== 0 || !json.data?.items?.length) {
    throw new Error(json.msg || '获取 Table ID 失败');
  }
  const detailTable =
    json.data.items.find((i) => i.name.includes('交易') || i.name.includes('明细')) ||
    json.data.items[0];
  return detailTable.table_id;
}

async function fetchAllRecords(token, env, tableId) {
  let allItems = [];
  let pageToken = '';
  let hasMore = true;
  const bitableAppToken = env?.FEISHU_BITABLE_APP_TOKEN || 'I8uhbjG29aOl9Rs9wcjcWVmYnvd';

  while (hasMore) {
    let url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${bitableAppToken}/tables/${tableId}/records?page_size=500&sort=%5B%22%E5%94%AE%E5%87%BA%E6%97%A5%E6%9C%9F%20DESC%22%5D`;
    if (pageToken) url += `&page_token=${pageToken}`;

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (json.code !== 0) throw new Error(json.msg || '读取飞书多维表格失败');

    const items = json.data?.items || [];
    allItems = allItems.concat(items);
    hasMore = json.data?.has_more || false;
    pageToken = json.data?.page_token || '';
    if (!pageToken || items.length === 0) break;
  }
  return allItems;
}

// GET — 拉取全量记录
export async function onRequestGet({ env }) {
  try {
    const token = await getTenantToken(env);
    const tableId = await getFirstTableId(token, env);
    const allItems = await fetchAllRecords(token, env, tableId);
    return new Response(
      JSON.stringify({ code: 0, msg: 'success', data: { total: allItems.length, items: allItems } }),
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ code: 500, msg: err.message }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// POST — 新增记录
export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();
    const token = await getTenantToken(env);
    const tableId = await getFirstTableId(token, env);
    const bitableAppToken = env?.FEISHU_BITABLE_APP_TOKEN || 'I8uhbjG29aOl9Rs9wcjcWVmYnvd';
    const feishuRes = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${bitableAppToken}/tables/${tableId}/records`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: data.fields }),
      }
    );
    const json = await feishuRes.json();
    return new Response(JSON.stringify(json), { headers: CORS_HEADERS });
  } catch (err) {
    return new Response(
      JSON.stringify({ code: 500, msg: err.message }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// PUT — 更新记录（批量状态更新）
export async function onRequestPut({ request, env }) {
  try {
    const data = await request.json();
    const { record_id, fields } = data;
    const token = await getTenantToken(env);
    const tableId = await getFirstTableId(token, env);
    const bitableAppToken = env?.FEISHU_BITABLE_APP_TOKEN || 'I8uhbjG29aOl9Rs9wcjcWVmYnvd';
    const feishuRes = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${bitableAppToken}/tables/${tableId}/records/${record_id}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      }
    );
    const json = await feishuRes.json();
    return new Response(JSON.stringify(json), { headers: CORS_HEADERS });
  } catch (err) {
    return new Response(
      JSON.stringify({ code: 500, msg: err.message }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// OPTIONS — CORS preflight
export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

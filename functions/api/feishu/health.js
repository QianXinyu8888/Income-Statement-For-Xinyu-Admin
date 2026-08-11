/**
 * Cloudflare Pages Function
 * GET /api/feishu/health
 * 检查飞书 API 连接状态
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

export async function onRequestGet({ env }) {
  try {
    const token = await getTenantToken(env);
    const tableId = await getFirstTableId(token, env);
    const bitableAppToken = env?.FEISHU_BITABLE_APP_TOKEN || 'I8uhbjG29aOl9Rs9wcjcWVmYnvd';
    return new Response(
      JSON.stringify({
        connected: true,
        message: '飞书 API 连接正常，多维表格数据已就绪',
        appToken: bitableAppToken,
        tableId,
      }),
      { headers: CORS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ connected: false, message: err.message }),
      { status: 500, headers: CORS }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

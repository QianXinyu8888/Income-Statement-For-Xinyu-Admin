/**
 * Cloudflare Pages Function
 * POST /api/auth/login
 * 对比飞书《系统用户》多维表格验证用户名+密码
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const USERS_TABLE_ID = 'tbltqVJUuzWdVI1D'; // 飞书《系统用户》表 ID

async function getTenantToken(env) {
  const appId = (env?.FEISHU_APP_ID && String(env.FEISHU_APP_ID).trim()) || 'cli_aafbdc1dc5b85bdd';
  const appSecret = (env?.FEISHU_APP_SECRET && String(env.FEISHU_APP_SECRET).trim()) || 'xYtSrjj4wg2aubHc85WPXg87xKxjC4lY';
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret,
    }),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`获取飞书 Token 失败: ${json.msg} (appId:${appId.slice(0, 6)}, secretLen:${appSecret.length})`);
  return json.tenant_access_token;
}

export async function onRequestPost({ request, env }) {
  try {
    const { username, password } = await request.json();

    const token = await getTenantToken(env);
    const bitableAppToken = env?.FEISHU_BITABLE_APP_TOKEN || 'I8uhbjG29aOl9Rs9wcjcWVmYnvd';
    const feishuRes = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${bitableAppToken}/tables/${USERS_TABLE_ID}/records?page_size=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const json = await feishuRes.json();

    if (json.code === 0 && Array.isArray(json.data?.items)) {
      const matchedUser = json.data.items.find((item) => {
        const f = item.fields || {};
        const u = String(f['用户名'] || '').trim();
        const p = String(f['密码'] || '').trim();
        const rawStatus = f['状态'];
        const statusStr =
          typeof rawStatus === 'object' && rawStatus !== null
            ? rawStatus.name || ''
            : String(rawStatus || '正常');
        return u === String(username).trim() && p === String(password).trim() && statusStr !== '禁用';
      });

      if (matchedUser) {
        const userFields = matchedUser.fields || {};
        const rawRole = userFields['角色'];
        const roleStr =
          typeof rawRole === 'object' && rawRole !== null
            ? rawRole.name || '管理员'
            : String(rawRole || '管理员');

        return new Response(
          JSON.stringify({
            code: 0,
            token: 'jwt_feishu_' + Date.now(),
            user: { username: userFields['用户名'], role: roleStr },
          }),
          { headers: CORS_HEADERS }
        );
      }
    }

    return new Response(
      JSON.stringify({ code: 401, message: '账号或密码错误，或账号已被禁用' }),
      { status: 401, headers: CORS_HEADERS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ code: 500, message: err.message }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const APP_ID = 'cli_aafbdc1dc5b85bdd';
const APP_SECRET = 'xYtSrjj4wg2aubHc85WPXg87xKxjC4lY';
const BITABLE_APP_TOKEN = 'I8uhbjG29aOl9Rs9wcjcWVmYnvd';
const USERS_TABLE_ID = 'tbltqVJUuzWdVI1D'; // 飞书《系统用户》表 ID

async function getTenantToken() {
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error('获取飞书 Access Token 失败: ' + json.msg);
  return json.tenant_access_token;
}

async function getFirstTableId(token) {
  const res = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const json = await res.json();
  if (json.code !== 0 || !json.data?.items?.length) {
    throw new Error(json.msg || '获取多维表格 Table ID 失败');
  }
  const detailTable = json.data.items.find(i => i.name.includes('交易') || i.name.includes('明细')) || json.data.items[0];
  return detailTable.table_id;
}

// 自动翻页拉取所有全量记录 (page_size=500 消除限制)
async function fetchAllRecords(token, tableId) {
  let allItems = [];
  let pageToken = '';
  let hasMore = true;

  while (hasMore) {
    let url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${tableId}/records?page_size=500`;
    if (pageToken) {
      url += `&page_token=${pageToken}`;
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const json = await res.json();

    if (json.code !== 0) {
      throw new Error(json.msg || '读取飞书多维表格失败');
    }

    const items = json.data?.items || [];
    allItems = allItems.concat(items);

    hasMore = json.data?.has_more || false;
    pageToken = json.data?.page_token || '';

    if (!pageToken || items.length === 0) break;
  }

  return allItems;
}

function feishuDevPlugin() {
  return {
    name: 'feishu-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/feishu/health' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          try {
            const token = await getTenantToken();
            const tableId = await getFirstTableId(token);
            res.end(JSON.stringify({
              connected: true,
              message: '飞书 API 已建立直连通讯，《系统用户》与《闲鱼交易明细》双表就绪！',
              appToken: BITABLE_APP_TOKEN,
              tableId
            }));
          } catch (err) {
            res.end(JSON.stringify({
              connected: false,
              message: err.message,
              appToken: BITABLE_APP_TOKEN
            }));
          }
          return;
        }

        if (req.url === '/api/feishu/records' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          try {
            const token = await getTenantToken();
            const tableId = await getFirstTableId(token);
            const allItems = await fetchAllRecords(token, tableId);
            
            res.end(JSON.stringify({
              code: 0,
              msg: 'success',
              data: {
                total: allItems.length,
                items: allItems
              }
            }));
          } catch (err) {
            res.end(JSON.stringify({ code: 500, msg: err.message }));
          }
          return;
        }

        if (req.url === '/api/feishu/records' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json');
            try {
              const data = JSON.parse(body);
              const token = await getTenantToken();
              const tableId = await getFirstTableId(token);
              const feishuRes = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${tableId}/records`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fields: data.fields })
              });
              const json = await feishuRes.json();
              res.end(JSON.stringify(json));
            } catch (err) {
              res.end(JSON.stringify({ code: 500, msg: err.message }));
            }
          });
          return;
        }

        // 验证飞书《系统用户》单选字段表登录
        if (req.url === '/api/auth/login' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json');
            try {
              const data = JSON.parse(body || '{}');
              const { username, password } = data;

              const token = await getTenantToken();
              const feishuRes = await fetch(
                `https://open.feishu.cn/open-apis/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${USERS_TABLE_ID}/records?page_size=100`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              const json = await feishuRes.json();

              if (json.code === 0 && Array.isArray(json.data?.items)) {
                const matchedUser = json.data.items.find(item => {
                  const f = item.fields || {};
                  const u = String(f['用户名'] || '').trim();
                  const p = String(f['密码'] || '').trim();
                  
                  const rawStatus = f['状态'];
                  const statusStr = typeof rawStatus === 'object' && rawStatus !== null ? (rawStatus.name || '') : String(rawStatus || '正常');
                  
                  return u === String(username).trim() && p === String(password).trim() && statusStr !== '禁用';
                });

                if (matchedUser) {
                  const userFields = matchedUser.fields || {};
                  const rawRole = userFields['角色'];
                  const roleStr = typeof rawRole === 'object' && rawRole !== null ? (rawRole.name || '管理员') : String(rawRole || '管理员');

                  res.end(JSON.stringify({
                    code: 0,
                    token: 'jwt_feishu_' + Date.now(),
                    user: { username: userFields['用户名'], role: roleStr }
                  }));
                  return;
                }
              }

              res.statusCode = 401;
              res.end(JSON.stringify({ code: 401, message: '登录失败：账号密码在飞书《系统用户》表中不存在或已被禁用' }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ code: 500, message: err.message }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

const isDev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  plugins: [react(), ...(isDev ? [feishuDevPlugin()] : [])],
  server: {
    port: 3010,
    strictPort: true,
    host: true
  },
  build: {
    outDir: 'dist',
  }
});

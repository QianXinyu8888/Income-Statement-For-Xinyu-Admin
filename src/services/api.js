const AUTH_TOKEN_KEY = 'xianyu_auth_token_v1';

// 将飞书 Raw Record 项规范化为组件可直接读取的平铺字段
function normalizeRecord(item) {
  if (!item) return null;
  const f = item.fields || {};
  
  // 智能格式化日期
  let rawDate = f['交易日期'] || f['售出日期'] || f['日期'] || '';
  if (typeof rawDate === 'number') {
    rawDate = new Date(rawDate).toISOString().slice(0, 10);
  }

  const salePrice = Number(f['成交价(¥)'] || f['卖出价格'] || f['成交价'] || f['售价'] || 0);
  const costPrice = Number(f['购入成本(¥)'] || f['买入成本'] || f['购入成本'] || f['总成本(¥)'] || 0);
  const shippingFee = Number(f['运费(¥)'] || f['快递运费'] || f['运费'] || 0);
  
  // 如果飞书里有公式计算的“利润(¥)”或“实际净利润”，优先读取，否则自动计算
  let profit = salePrice - costPrice - shippingFee;
  if (f['利润(¥)'] !== undefined && f['利润(¥)'] !== null) {
    profit = Number(f['利润(¥)']);
  } else if (f['实际净利润'] !== undefined && f['实际净利润'] !== null) {
    profit = Number(f['实际净利润']);
  }

  // 状态提取 (兼容单选字段对象格式或字符串)
  let status = '已完成';
  if (f['交易状态']) {
    status = typeof f['交易状态'] === 'object' ? (f['交易状态'].name || '已完成') : String(f['交易状态']);
  }

  // 品类提取
  let category = '3C数码';
  if (f['品类'] || f['分类']) {
    const rawCat = f['品类'] || f['分类'];
    category = typeof rawCat === 'object' ? (rawCat.name || '3C数码') : String(rawCat);
  }

  return {
    record_id: item.record_id || item.id,
    title: f['商品名称'] || f['物品名称'] || f['商品'] || '未命名宝贝',
    sale_price: salePrice,
    cost_price: costPrice,
    shipping_fee: shippingFee,
    profit: profit,
    status: status,
    category: category,
    date: rawDate,
    note: f['备注'] || f['说明'] || '',
    fields: f // 保留原始 fields 结构供弹窗编辑使用
  };
}

export const authService = {
  // 严格从飞书《系统用户》表中进行账号密码鉴权
  login: async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const json = await res.json();
    if (res.ok && json.code === 0) {
      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify({
        token: json.token,
        username: json.user?.username || username,
        role: json.user?.role || '管理员',
        loginTime: Date.now()
      }));
      return { success: true, token: json.token, user: json.user };
    }

    throw new Error(json.message || '登录失败：账号密码在飞书《系统用户》表中不存在');
  },

  logout: () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  },

  getCurrentUser: () => {
    const raw = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      if (Date.now() - data.loginTime > 7 * 24 * 3600 * 1000) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }
};

export const bitableService = {
  // 获取真实飞书表格记录并规范化
  fetchRecords: async () => {
    const response = await fetch('/api/feishu/records');
    const json = await response.json();
    if (json.code === 0 && Array.isArray(json.data?.items)) {
      const normalized = json.data.items.map(normalizeRecord).filter(Boolean);
      return { isLive: true, records: normalized };
    }
    
    throw new Error(json.msg || `获取飞书多维表格失败 (错误码: ${json.code})`);
  },

  // 创建飞书表格记录
  createRecord: async (fields) => {
    const response = await fetch('/api/feishu/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    const json = await response.json();
    if (json.code === 0) return json.data;
    throw new Error(json.msg || `新增飞书记录失败 (错误码: ${json.code})`);
  },

  // 更新记录
  updateRecord: async (recordId, fields) => {
    const response = await fetch(`/api/feishu/records/${recordId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    const json = await response.json();
    if (json.code === 0) return json.data;
    throw new Error(json.msg || `更新飞书记录失败 (错误码: ${json.code})`);
  },

  // 批量更新交易状态
  batchUpdateStatus: async (recordIds, newStatus) => {
    const response = await fetch('/api/feishu/batch-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record_ids: recordIds, status: newStatus })
    });
    const json = await response.json();
    if (json.code === 0) return true;
    throw new Error(json.msg || `批量更新失败 (错误码: ${json.code})`);
  },

  // 批量删除记录
  deleteRecords: async (recordIds) => {
    const response = await fetch('/api/feishu/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record_ids: recordIds })
    });
    const json = await response.json();
    if (json.code === 0) return true;
    throw new Error(json.msg || `批量删除失败 (错误码: ${json.code})`);
  },

  // 检查飞书 API 健康状态
  checkHealth: async () => {
    const response = await fetch('/api/feishu/health');
    const json = await response.json();
    return json;
  }
};

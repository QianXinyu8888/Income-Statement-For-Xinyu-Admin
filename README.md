# 闲鱼交易明细及损益管理系统 (基于飞书多维表格 & Cloudflare)

本项目是一个为闲鱼卖家量身打造的**苹果风 (Apple Style) 全端响应式**交易明细与损益后台管理系统。系统以飞书多维表格（Base Token: `I8uhbjG29aOl9Rs9wcjcWVmYnvd`）作为数据底座，支持 Web 端与飞书表格端双向实时数据增删改查，并部署至 Cloudflare Pages 绑定自定义域名 `20041115.xyz`。

---

## 🌟 核心功能亮点

1. **苹果极简视觉美学 (Apple Aesthetic UI)**
   - 全端自适应磨砂玻璃（Backdrop Blur）、大圆角卡片、高对比度深色模式。
   - 响应式自适应：PC 端支持宽屏侧边栏，手机端自动转换为苹果风格 Bottom TabBar 导航与 Bottom Sheet 底部抽屉表单。
2. **飞书多维表格双向直连**
   - 包含 Cloudflare Workers / Serverless API 网关，实时调用飞书 OpenAPI。
   - **原生公式列保留**：净利润与利润率直接映射飞书表格的原生公式列输出，Web 端只读展示，不破坏表格公式。
   - **内置 Mock 数据演示模式**：在未配置飞书 API 密钥时可无缝演示体验，配置密钥后自动直连真实飞书表格。
3. **全功能交易管理大表**
   - 支持按状态、日期区间、商品关键词高级筛选与多列升降序排列。
   - 支持批量更新交易状态与批量删除记录。
   - 支持一键导出当前筛选/全量数据为 **Excel (.xlsx) / CSV** 文件。
4. **损益与投资回报分析**
   - 可视化仪表盘：总销售额、进货成本、实际净利润、综合利润率、月度趋势与交易状态饼图。
   - 盈利排行榜：自动展示最高净利润 Top 5 商品。
5. **系统诊断与鉴权**
   - 管理员账号密码登录与 JWT 状态保持。
   - 飞书 API 连通性与 Tenant Token 一键诊断面板。

---

## 🚀 本地开发与启动

```bash
# 1. 进入项目目录
cd /Users/xinyu/Desktop/闲鱼表格

# 2. 安装依赖 (已完成)
npm install

# 3. 启动本地开发服务器
npm run dev
# 浏览器访问: http://localhost:3000
```

> **默认登录凭证**:
> - **管理员账号**: `admin`
> - **访问密码**: `admin123456`

---

## ☁️ 部署至 Cloudflare Pages 与绑定域名 `20041115.xyz`

### 第一步：在 Cloudflare Dashboard 创建 Pages 项目
1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)。
2. 进入 `Workers & Pages` -> `Create application` -> `Pages` -> `Connect to Git` (或使用 Wrangler CLI 一键部署)。
3. 构建设置：
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`

### 第二步：配置 Cloudflare 环境变量
在 Cloudflare Pages 项目的 **Settings** -> **Environment variables** 中添加以下变量：

| 变量名 | 说明 | 示例值 |
|---|---|---|
| `FEISHU_APP_ID` | 飞书开放平台应用 App ID | `cli_a6xxxxxxxxxxxxxx` |
| `FEISHU_APP_SECRET` | 飞书开放平台应用 App Secret | `xxxxxxxxxxxxxxxxxxxxxxxx` |
| `FEISHU_BITABLE_APP_TOKEN` | 飞书多维表格 Base ID | `I8uhbjG29aOl9Rs9wcjcWVmYnvd` |
| `ADMIN_USERNAME` | 管理员登录用户名 | `admin` |
| `ADMIN_PASSWORD` | 管理员登录密码 | `your_custom_password` |

### 第三步：绑定自定义域名 `20041115.xyz`
1. 在 Pages 项目控制台中，点击 **Custom domains** (自定义域名) -> **Set up a custom domain**。
2. 输入 `20041115.xyz`。
3. Cloudflare 会自动配置 CNAME 记录并申请免费 SSL 证书。

---

## 📋 飞书开放平台三步配置说明

为了使 Cloudflare API 网关能正常读写你的飞书表格 `I8uhbjG29aOl9Rs9wcjcWVmYnvd`：

1. **创建自建应用**: 访问 [飞书开放平台](https://open.feishu.cn/) 创建“企业自建应用”，获取 `App ID` 和 `App Secret`。
2. **开启权限**: 在“权限管理”中开启 `查看、编辑多维表格` (`bitable:app`) 权限。
3. **添加应用为协同者**: 打开表格 `https://kcn1zihxx6ro.feishu.cn/base/I8uhbjG29aOl9Rs9wcjcWVmYnvd`，点击右上角“分享” -> “添加协同者”，搜索并添加你创建的自建应用，赋予“可编辑”权限。

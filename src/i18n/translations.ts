import type { Language } from '../preferences/browser-preferences';

export type TranslationKey =
  // 登录页
  | 'login.title'
  | 'login.username'
  | 'login.password'
  | 'login.showPassword'
  | 'login.hidePassword'
  | 'login.submit'
  | 'login.submitting'
  | 'login.invalidCredentials'
  | 'login.formLabel'
  // 语言切换
  | 'language.label'
  | 'language.zh'
  | 'language.en'
  // 侧边栏 / 顶栏
  | 'nav.brandLabel'
  | 'nav.main'
  | 'nav.transactions'
  | 'nav.pendingReceipt'
  | 'nav.selfUse'
  | 'nav.listed'
  | 'nav.overview'
  | 'nav.analytics'
  | 'nav.settings'
  | 'nav.group.transactions'
  | 'nav.group.analytics'
  | 'nav.group.productStatus'
  | 'nav.mobileMain'
  | 'nav.openMobileMenu'
  | 'nav.closeMobileMenu'
  | 'topbar.switchToLight'
  | 'topbar.switchToDark'
  | 'topbar.logout'
  | 'topbar.accountLabel'
  | 'topbar.accountMenuLabel'
  // 设置页
  | 'settings.title'
  | 'settings.subtitle'
  | 'settings.accountGroupLabel'
  | 'settings.currentAccount'
  | 'settings.accountRole'
  | 'settings.feishuConnection'
  | 'settings.version'
  | 'settings.syncFailed'
  | 'settings.roleUser'
  | 'settings.checking'
  | 'settings.connected'
  | 'settings.disconnected'
  | 'settings.preferencesTitle'
  | 'settings.preferencesSubtitle'
  | 'settings.preferencesGroupLabel'
  | 'settings.themeMode'
  | 'settings.themeLight'
  | 'settings.themeDark'
  | 'settings.themeSystem'
  | 'settings.language'
  | 'settings.languageHint';

type TranslationMap = Record<TranslationKey, string>;

export const translations: Record<Language, TranslationMap> = {
  zh: {
    'login.title': '登录你的交易管理系统',
    'login.username': '账号',
    'login.password': '密码',
    'login.showPassword': '显示密码',
    'login.hidePassword': '隐藏密码',
    'login.submit': '登录',
    'login.submitting': '登录中…',
    'login.invalidCredentials': '账号或密码错误',
    'login.formLabel': '登录你的交易管理系统',
    'language.label': '界面语言',
    'language.zh': '简体中文',
    'language.en': 'English',
    'nav.brandLabel': '交易管理控制台',
    'nav.main': '主导航',
    'nav.transactions': '交易',
    'nav.pendingReceipt': '待收货',
    'nav.selfUse': '自用中',
    'nav.listed': '在售中',
    'nav.overview': '概览',
    'nav.analytics': '分析',
    'nav.settings': '设置',
    'nav.group.transactions': '交易管理',
    'nav.group.analytics': '经营分析',
    'nav.group.productStatus': '产品状态',
    'nav.mobileMain': '移动端主导航',
    'nav.openMobileMenu': '打开导航菜单',
    'nav.closeMobileMenu': '关闭导航菜单',
    'topbar.switchToLight': '切换到浅色模式',
    'topbar.switchToDark': '切换到深色模式',
    'topbar.logout': '退出登录',
    'topbar.accountLabel': '当前账号 {username}',
    'topbar.accountMenuLabel': '账号菜单',
    'settings.title': '设置',
    'settings.subtitle': '账号与服务状态',
    'settings.accountGroupLabel': '账号与服务状态',
    'settings.currentAccount': '当前账号',
    'settings.accountRole': '账号权限',
    'settings.feishuConnection': '数据库连接状态',
    'settings.version': '版本',
    'settings.syncFailed': '同步失败',
    'settings.roleUser': '用户',
    'settings.checking': '检查中',
    'settings.connected': '正常',
    'settings.disconnected': '异常',
    'settings.preferencesTitle': '界面偏好',
    'settings.preferencesSubtitle': '个性化主题显示',
    'settings.preferencesGroupLabel': '界面偏好',
    'settings.themeMode': '主题模式',
    'settings.themeLight': '浅色',
    'settings.themeDark': '深色',
    'settings.themeSystem': '跟随系统',
    'settings.language': '语言',
    'settings.languageHint': '界面显示语言',
  },
  en: {
    'login.title': 'Sign in to your trading management system',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.showPassword': 'Show password',
    'login.hidePassword': 'Hide password',
    'login.submit': 'Sign in',
    'login.submitting': 'Signing in…',
    'login.invalidCredentials': 'Incorrect username or password',
    'login.formLabel': 'Sign in to your trading management system',
    'language.label': 'Language',
    'language.zh': '简体中文',
    'language.en': 'English',
    'nav.brandLabel': 'Trading Console',
    'nav.main': 'Main navigation',
    'nav.transactions': 'Transactions',
    'nav.pendingReceipt': 'Pending receipt',
    'nav.selfUse': 'Personal use',
    'nav.listed': 'Listed',
    'nav.overview': 'Overview',
    'nav.analytics': 'Analytics',
    'nav.settings': 'Settings',
    'nav.group.transactions': 'Transaction management',
    'nav.group.analytics': 'Business insights',
    'nav.group.productStatus': 'Product status',
    'nav.mobileMain': 'Mobile navigation',
    'nav.openMobileMenu': 'Open navigation menu',
    'nav.closeMobileMenu': 'Close navigation menu',
    'topbar.switchToLight': 'Switch to light mode',
    'topbar.switchToDark': 'Switch to dark mode',
    'topbar.logout': 'Sign out',
    'topbar.accountLabel': 'Current account {username}',
    'topbar.accountMenuLabel': 'Account menu',
    'settings.title': 'Settings',
    'settings.subtitle': 'Account & service status',
    'settings.accountGroupLabel': 'Account & service status',
    'settings.currentAccount': 'Current account',
    'settings.accountRole': 'Account role',
    'settings.feishuConnection': 'Database connection status',
    'settings.version': 'Version',
    'settings.syncFailed': 'Sync failed',
    'settings.roleUser': 'User',
    'settings.checking': 'Checking',
    'settings.connected': 'Connected',
    'settings.disconnected': 'Disconnected',
    'settings.preferencesTitle': 'Interface preferences',
    'settings.preferencesSubtitle': 'Personalize theme',
    'settings.preferencesGroupLabel': 'Interface preferences',
    'settings.themeMode': 'Theme mode',
    'settings.themeLight': 'Light',
    'settings.themeDark': 'Dark',
    'settings.themeSystem': 'System',
    'settings.language': 'Language',
    'settings.languageHint': 'Display language',
  },
};

/** 简单插值：'当前账号 {username}' + { username: 'xinyu' } */
export function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}

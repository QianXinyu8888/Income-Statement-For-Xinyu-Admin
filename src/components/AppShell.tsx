import { BarChart3, Globe, List, LogOut, Moon, Settings, Sun, UserRound, WalletCards } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { apiClient, type User } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../i18n';
import { useState } from 'react';
import type { TranslationKey } from '../i18n/translations';

const navigation: { to: string; labelKey: TranslationKey; icon: typeof List }[] = [
  { to: '/transactions', labelKey: 'nav.transactions', icon: List },
  { to: '/overview', labelKey: 'nav.overview', icon: WalletCards },
  { to: '/analytics', labelKey: 'nav.analytics', icon: BarChart3 },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
];

export function AppShell({
  user,
  theme,
  onTheme,
}: {
  user: User;
  theme: 'light' | 'dark';
  onTheme: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, language, setLanguage } = useLanguage();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const logout = async () => {
    setUserMenuOpen(false);
    await apiClient.logout();
    queryClient.clear();
    navigate('/login', { replace: true });
  };
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label={t('nav.main')}>
        <div className="brand" aria-label={t('nav.brandLabel')}>
          X
        </div>
        <nav className="sidebar-nav">
          {navigation.map(({ to, labelKey, icon: Icon }) => (
            <NavLink key={to} to={to} title={t(labelKey)}>
              <Icon size={18} />
              <span>{t(labelKey)}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button topbar-theme"
            onClick={onTheme}
            aria-label={theme === 'dark' ? t('topbar.switchToLight') : t('topbar.switchToDark')}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <div className="topbar-lang">
            <button
              type="button"
              className="icon-button topbar-lang-button"
              onClick={() => setLangMenuOpen((open) => !open)}
              aria-label={t('language.label')}
              aria-haspopup="menu"
              aria-expanded={langMenuOpen}
            >
              <Globe size={17} />
            </button>
            {langMenuOpen && (
              <>
                <div className="user-menu-backdrop" onClick={() => setLangMenuOpen(false)} />
                <div className="user-menu lang-menu" role="menu" aria-label={t('language.label')}>
                  <button
                    type="button"
                    role="menuitem"
                    className={`user-menu-item${language === 'zh' ? ' is-active' : ''}`}
                    onClick={() => {
                      setLanguage('zh');
                      setLangMenuOpen(false);
                    }}
                  >
                    {t('language.zh')}
                    {language === 'zh' && <span className="user-menu-check">✓</span>}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={`user-menu-item${language === 'en' ? ' is-active' : ''}`}
                    onClick={() => {
                      setLanguage('en');
                      setLangMenuOpen(false);
                    }}
                  >
                    {t('language.en')}
                    {language === 'en' && <span className="user-menu-check">✓</span>}
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="topbar-user">
            <button
              type="button"
              className="topbar-user-button"
              onClick={() => setUserMenuOpen((open) => !open)}
              aria-label={t('topbar.accountLabel', { username: user.username })}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
            >
              <span className="topbar-avatar">
                <UserRound size={15} />
              </span>
              <span className="topbar-username">{user.username}</span>
            </button>
            {userMenuOpen && (
              <>
                <div className="user-menu-backdrop" onClick={() => setUserMenuOpen(false)} />
                <div className="user-menu" role="menu" aria-label={t('topbar.accountMenuLabel')}>
                  <button type="button" role="menuitem" className="user-menu-item" onClick={logout}>
                    <LogOut size={15} />
                    {t('topbar.logout')}
                  </button>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
      <nav className="bottom-nav" aria-label={t('nav.mobileMain')}>
        {navigation.map(({ to, labelKey, icon: Icon }) => (
          <NavLink key={to} to={to}>
            <Icon size={19} />
            <span>{t(labelKey)}</span>
          </NavLink>
        ))}
        <button type="button" className="bottom-nav-logout" onClick={logout}>
          <LogOut size={19} />
          <span>{t('topbar.logout')}</span>
        </button>
      </nav>
    </div>
  );
}

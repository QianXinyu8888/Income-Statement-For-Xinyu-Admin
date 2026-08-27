import {
  BarChart3,
  Globe,
  List,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Settings,
  Sun,
  Tag,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { apiClient, type User } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import type { TranslationKey } from '../i18n/translations';

const navigation: { to: string; labelKey: TranslationKey; icon: typeof List }[] = [
  { to: '/transactions', labelKey: 'nav.transactions', icon: List },
  { to: '/listed', labelKey: 'nav.listed', icon: Tag },
  { to: '/self-use', labelKey: 'nav.selfUse', icon: Monitor },
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
  const location = useLocation();
  const queryClient = useQueryClient();
  const { t, language, setLanguage } = useLanguage();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileSidebarRef = useRef<HTMLElement>(null);
  const restoreMobileMenuFocus = useRef(false);
  const activeNavigation = navigation.find(({ to }) => to === location.pathname) ?? navigation[0];
  const closeMobileMenu = (restoreFocus = true) => {
    restoreMobileMenuFocus.current = restoreFocus;
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMobileMenu();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        mobileSidebarRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled])',
        ) ?? [],
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (mobileMenuOpen || !restoreMobileMenuFocus.current) return;
    restoreMobileMenuFocus.current = false;
    mobileMenuTriggerRef.current?.focus();
  }, [mobileMenuOpen]);

  const logout = async () => {
    setUserMenuOpen(false);
    closeMobileMenu(false);
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
        <header className="mobile-app-bar">
          <button
            type="button"
            className="icon-button"
            ref={mobileMenuTriggerRef}
            aria-label="打开导航菜单"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={20} />
          </button>
          <span>{t(activeNavigation.labelKey)}</span>
        </header>
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
      {mobileMenuOpen && (
        <div className="mobile-sidebar-layer">
          <button
            type="button"
            className="mobile-sidebar-backdrop"
            aria-label="关闭导航菜单"
            tabIndex={-1}
            onClick={() => closeMobileMenu()}
          />
          <aside
            ref={mobileSidebarRef}
            className="mobile-sidebar"
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.main')}
          >
            <header className="mobile-sidebar__header">
              <div className="brand" aria-label={t('nav.brandLabel')}>
                X
              </div>
              <button
                type="button"
                className="icon-button"
                autoFocus
                aria-label="关闭导航菜单"
                onClick={() => closeMobileMenu()}
              >
                <X size={20} />
              </button>
            </header>
            <nav className="mobile-sidebar__nav" aria-label={t('nav.main')}>
              {navigation.map(({ to, labelKey, icon: Icon }) => (
                <NavLink key={to} to={to} onClick={() => closeMobileMenu(false)}>
                  <Icon size={18} />
                  <span>{t(labelKey)}</span>
                </NavLink>
              ))}
            </nav>
            <footer className="mobile-sidebar__footer">
              <button type="button" className="mobile-sidebar__action" onClick={onTheme}>
                {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                {theme === 'dark' ? t('topbar.switchToLight') : t('topbar.switchToDark')}
              </button>
              <div className="mobile-sidebar__language" aria-label={t('language.label')}>
                <button
                  type="button"
                  className={language === 'zh' ? 'is-active' : ''}
                  onClick={() => setLanguage('zh')}
                >
                  {t('language.zh')}
                </button>
                <button
                  type="button"
                  className={language === 'en' ? 'is-active' : ''}
                  onClick={() => setLanguage('en')}
                >
                  {t('language.en')}
                </button>
              </div>
              <button type="button" className="mobile-sidebar__action" onClick={logout}>
                <LogOut size={17} />
                {t('topbar.logout')}
              </button>
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
}

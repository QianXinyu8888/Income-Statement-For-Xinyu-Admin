import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useLanguage } from '../i18n';
import { useBrowserPreferences } from '../preferences/BrowserPreferencesContext';
import { formatVersionUpdatedAt, VERSION_UPDATED_AT } from '../version';
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function SettingsPage() {
  const session = useQuery({
    queryKey: ['session'],
    queryFn: apiClient.session,
    retry: false,
    refetchOnMount: 'always',
  });
  const health = useQuery({ queryKey: ['health'], queryFn: apiClient.health, retry: false });
  const { language, setLanguage, t } = useLanguage();
  const {
    preferences: { themeMode },
    setThemeMode,
  } = useBrowserPreferences();

  return (
    <section className="page page--narrow">
      <header className="page-header">
        <div>
          <h1>{t('settings.title')}</h1>
          <p>{t('settings.subtitle')}</p>
        </div>
      </header>
      <dl className="settings-list" role="group" aria-label={t('settings.accountGroupLabel')}>
        <div>
          <dt>{t('settings.currentAccount')}</dt>
          <dd>
            <strong>{session.data?.user.username ?? '—'}</strong>
          </dd>
        </div>
        <div>
          <dt>{t('settings.accountRole')}</dt>
          <dd>
            <strong>
              {session.isFetching ? (
                <LoadingSpinner />
              ) : session.isError ? (
                t('settings.syncFailed')
              ) : (
                (session.data?.user.role ?? t('settings.roleUser'))
              )}
            </strong>
          </dd>
        </div>
        <div>
          <dt>{t('settings.feishuConnection')}</dt>
          <dd>
            <strong className={health.data?.connected ? 'connected' : 'disconnected'}>
              {health.isLoading
                ? t('settings.checking')
                : health.data?.connected
                  ? t('settings.connected')
                  : t('settings.disconnected')}
            </strong>
          </dd>
        </div>
        <div>
          <dt>{t('settings.version')}</dt>
          <dd>
            <strong>{formatVersionUpdatedAt(VERSION_UPDATED_AT)}</strong>
          </dd>
        </div>
      </dl>

      <header className="page-header" style={{ marginTop: '24px' }}>
        <div>
          <h2>{t('settings.preferencesTitle')}</h2>
          <p>{t('settings.preferencesSubtitle')}</p>
        </div>
      </header>
      <dl className="settings-list" role="group" aria-label={t('settings.preferencesGroupLabel')}>
        <div>
          <dt>{t('settings.themeMode')}</dt>
          <dd>
            <fieldset className="theme-segmented" role="radiogroup" aria-label={t('settings.themeMode')}>
              {(
                [
                  ['light', t('settings.themeLight')],
                  ['dark', t('settings.themeDark')],
                  ['system', t('settings.themeSystem')],
                ] as const
              ).map(([value, label]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="themeMode"
                    value={value}
                    checked={themeMode === value}
                    onChange={() => setThemeMode(value)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
          </dd>
        </div>
        <div>
          <dt>{t('settings.language')}</dt>
          <dd>
            <fieldset className="theme-segmented" role="radiogroup" aria-label={t('settings.language')}>
              {(
                [
                  ['zh', '简体中文'],
                  ['en', 'English'],
                ] as const
              ).map(([value, label]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="language"
                    value={value}
                    checked={language === value}
                    onChange={() => setLanguage(value)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
          </dd>
        </div>
      </dl>
    </section>
  );
}

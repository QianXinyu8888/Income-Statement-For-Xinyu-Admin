import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useBrowserPreferences } from '../preferences/BrowserPreferencesContext';

export default function SettingsPage() {
  const session = useQuery({
    queryKey: ['session'],
    queryFn: apiClient.session,
    retry: false,
    refetchOnMount: 'always',
  });
  const health = useQuery({ queryKey: ['health'], queryFn: apiClient.health, retry: false });
  const {
    preferences: { themeMode },
    setThemeMode,
  } = useBrowserPreferences();

  return (
    <section className="page page--narrow">
      <header className="page-header">
        <div>
          <h1>设置</h1>
          <p>账号与服务状态</p>
        </div>
      </header>
      <dl className="settings-list" role="group" aria-label="账号与服务状态">
        <div>
          <dt>当前账号</dt>
          <dd>
            <strong>{session.data?.user.username ?? '—'}</strong>
          </dd>
        </div>
        <div>
          <dt>账号权限</dt>
          <dd>
            <strong>
              {session.isFetching
                ? '同步中'
                : session.isError
                  ? '同步失败'
                  : (session.data?.user.role ?? '用户')}
            </strong>
          </dd>
        </div>
        <div>
          <dt>飞书连接</dt>
          <dd>
            <strong className={health.data?.connected ? 'connected' : 'disconnected'}>
              {health.isLoading ? '检查中' : health.data?.connected ? '正常' : '异常'}
            </strong>
          </dd>
        </div>
        <div>
          <dt>版本</dt>
          <dd>
            <strong>2.0.0</strong>
          </dd>
        </div>
      </dl>

      <header className="page-header" style={{ marginTop: '24px' }}>
        <div>
          <h2>界面偏好</h2>
          <p>个性化主题显示</p>
        </div>
      </header>
      <dl className="settings-list" role="group" aria-label="界面偏好">
        <div>
          <dt>主题模式</dt>
          <dd>
            <fieldset className="theme-segmented" role="radiogroup" aria-label="主题模式">
              {(
                [
                  ['system', '跟随系统'],
                  ['light', '浅色'],
                  ['dark', '深色'],
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
      </dl>
    </section>
  );
}

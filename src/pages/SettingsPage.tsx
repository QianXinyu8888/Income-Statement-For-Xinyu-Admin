import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export default function SettingsPage() {
  const session = useQuery({
    queryKey: ['session'],
    queryFn: apiClient.session,
    retry: false,
    refetchOnMount: 'always',
  });
  const health = useQuery({ queryKey: ['health'], queryFn: apiClient.health, retry: false });
  const [reduceMotion, setReduceMotion] = useState<boolean>(() => {
    return localStorage.getItem('reduce-motion') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('reduce-motion', String(reduceMotion));
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

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
          <h2>界面与动画偏好</h2>
          <p>个性化显示与界面交互支持</p>
        </div>
      </header>
      <dl className="settings-list" role="group" aria-label="界面与动画偏好">
        <div>
          <dt>
            <label htmlFor="reduce-motion-toggle" style={{ cursor: 'pointer' }}>
              缩减界面动画 (Reduced Motion)
            </label>
          </dt>
          <dd>
            <input
              id="reduce-motion-toggle"
              name="reduceMotion"
              type="checkbox"
              checked={reduceMotion}
              onChange={(e) => setReduceMotion(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
          </dd>
        </div>
      </dl>

    </section>
  );
}

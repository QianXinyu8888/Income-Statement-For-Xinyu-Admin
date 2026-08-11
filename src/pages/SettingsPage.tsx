import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export default function SettingsPage() {
  const session = useQuery({ queryKey: ['session'], queryFn: apiClient.session, retry: false });
  const health = useQuery({ queryKey: ['health'], queryFn: apiClient.health, retry: false });
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
          <dd><strong>{session.data?.user.username ?? '—'}</strong></dd>
        </div>
        <div>
          <dt>账号权限</dt>
          <dd><strong>{session.data?.user.role ?? '用户'}</strong></dd>
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
          <dd><strong>2.0.0</strong></dd>
        </div>
      </dl>
      <div className="security-note">
        <strong>安全提示</strong>
        <p>
          账号由飞书用户表管理。当前仍按既定要求使用明文密码，请严格限制用户表和飞书应用的访问权限。
        </p>
      </div>
    </section>
  );
}

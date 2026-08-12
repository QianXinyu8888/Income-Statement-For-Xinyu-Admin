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
      <section className="settings-list">
        <div>
          <span>当前账号</span>
          <strong>{session.data?.user.username ?? '—'}</strong>
        </div>
        <div>
          <span>账号权限</span>
          <strong>{session.data?.user.role ?? '用户'}</strong>
        </div>
        <div>
          <span>飞书连接</span>
          <strong className={health.data?.connected ? 'connected' : 'disconnected'}>
            {health.isLoading ? '检查中' : health.data?.connected ? '正常' : '异常'}
          </strong>
        </div>
        <div>
          <span>版本</span>
          <strong>2.0.0</strong>
        </div>
      </section>
      <div className="security-note">
        <strong>安全提示</strong>
        <p>
          账号由飞书用户表管理。当前仍按既定要求使用明文密码，请严格限制用户表和飞书应用的访问权限。
        </p>
      </div>
    </section>
  );
}

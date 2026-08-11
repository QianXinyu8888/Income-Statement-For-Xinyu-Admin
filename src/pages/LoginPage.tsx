import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const session = await apiClient.login(username, password);
      queryClient.setQueryData(['session'], session);
      navigate('/transactions', { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="login-page">
      <form className="login-panel" aria-label="登录闲鱼损益" aria-busy={loading} onSubmit={submit}>
        <div className="login-mark">X</div>
        <h1>闲鱼损益</h1>
        <p>登录后管理交易与利润</p>
        <label htmlFor="username">账号</label>
        <input
          id="username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
        <label htmlFor="password">密码</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <button className="button button--primary button--full" disabled={loading}>
          {loading ? '正在登录…' : '登录'}
        </button>
      </form>
    </main>
  );
}

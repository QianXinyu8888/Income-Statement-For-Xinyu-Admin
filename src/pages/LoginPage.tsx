import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, EyeClosed, Moon, Sun } from 'lucide-react';
import { apiClient } from '../api/client';
import { useLanguage } from '../i18n';
import { useBrowserPreferences } from '../preferences/BrowserPreferencesContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeField, setActiveField] = useState<'username' | 'password' | null>(null);
  const [completedField, setCompletedField] = useState<'username' | 'password' | null>(null);
  const [passwordPulse, setPasswordPulse] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language, setLanguage, t } = useLanguage();
  const { effectiveTheme, toggleTheme } = useBrowserPreferences();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const session = await apiClient.login(username, password);
      queryClient.setQueryData(['session'], session);
      navigate('/transactions', { replace: true });
    } catch {
      setError(t('login.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-actions">
        <button
          type="button"
          className="icon-button topbar-theme"
          onClick={toggleTheme}
          aria-label={effectiveTheme === 'dark' ? t('topbar.switchToLight') : t('topbar.switchToDark')}
        >
          {effectiveTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <label className="sr-only" htmlFor="login-language-select">
          {t('language.label')}
        </label>
        <select
          id="login-language-select"
          className="login-language-select"
          value={language}
          onChange={(event) => setLanguage(event.target.value as 'zh' | 'en')}
          aria-label={t('language.label')}
        >
          <option value="zh">🇨🇳 简体中文</option>
          <option value="en">🇺🇸 English</option>
        </select>
      </div>
      <form
        className={`login-panel${error ? ' has-error' : ''}`}
        aria-label={t('login.formLabel')}
        aria-busy={loading}
        onSubmit={submit}
      >
        <h1>{t('login.title')}</h1>
        <label htmlFor="username">{t('login.username')}</label>
        <input
          id="username"
          className={`login-input${activeField === 'username' ? ' is-active' : ''}${completedField === 'username' ? ' is-completed' : ''}`}
          autoComplete="username"
          value={username}
          onFocus={() => {
            setActiveField('username');
            setCompletedField(null);
          }}
          onBlur={() => {
            setActiveField(null);
            if (username.trim()) setCompletedField('username');
          }}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
        <label htmlFor="password">{t('login.password')}</label>
        <div
          className={`login-password-field${activeField === 'password' ? ' is-active' : ''}${completedField === 'password' ? ' is-completed' : ''}${passwordPulse ? ' is-pulsing' : ''}`}
        >
          <input
            id="password"
            className="login-input"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onFocus={() => {
              setActiveField('password');
              setCompletedField(null);
            }}
            onBlur={() => {
              setActiveField(null);
              if (password) setCompletedField('password');
            }}
            onChange={(event) => {
              setPassword(event.target.value);
              setPasswordPulse(true);
              window.setTimeout(() => setPasswordPulse(false), 180);
            }}
            required
          />
          <button
            type="button"
            className={`login-password-toggle${showPassword ? ' is-visible' : ''}`}
            aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
            onClick={() => setShowPassword((visible) => !visible)}
          >
            {showPassword ? <Eye size={17} aria-hidden="true" /> : <EyeClosed size={17} aria-hidden="true" />}
          </button>
        </div>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <button className="button button--login-primary button--full" disabled={loading}>
          {loading ? t('login.submitting') : t('login.submit')}
        </button>
      </form>
    </main>
  );
}

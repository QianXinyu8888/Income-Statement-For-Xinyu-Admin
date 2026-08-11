import React, { useState } from 'react';
import { ArrowRight, AlertCircle, BarChart2, Eye, EyeOff, Lock, User } from 'lucide-react';
import { authService } from '../services/api';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await authService.login(username, password);
      if (res.success) onLoginSuccess(res.user);
    } catch (err) {
      setErrorMsg(err.message || '账号或密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg-app)' }}
    >
      {/* Dynamic Ambient Glows */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(250, 204, 21, 0.14) 0%, rgba(234, 179, 8, 0.04) 45%, transparent 70%)',
          pointerEvents: 'none',
          filter: 'blur(50px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '15%',
          width: '450px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(234, 179, 8, 0.08) 0%, transparent 65%)',
          pointerEvents: 'none',
          filter: 'blur(60px)',
        }}
      />

      <div
        className="w-full max-w-sm relative z-10"
        style={{ animation: 'fadeSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both' }}
      >
        {/* Glassmorphic Main Card */}
        <div
          style={{
            background: 'var(--bg-surface)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-lg)',
            padding: '32px 28px',
            position: 'relative',
          }}
        >
          {/* Top Brand & Header */}
          <div className="text-center mb-7">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3.5 transition-transform hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #facc15 0%, #ca8a04 100%)',
                boxShadow: '0 6px 20px rgba(234, 179, 8, 0.35)',
                color: '#0a0a0a'
              }}
            >
              <BarChart2 size={24} strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '4px' }}>
              交易经营控制台
            </h1>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              连接飞书多维表格 · 管理卖家资产明细
            </p>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div
              className="flex items-start gap-2.5 mb-5 p-3.5 rounded-xl animate-in fade-in duration-200"
              style={{
                background: 'var(--danger-subtle)',
                border: '1px solid rgba(244,63,94,0.25)',
                fontSize: '12.5px',
                color: 'var(--danger)',
                fontWeight: 500,
              }}
            >
              <AlertCircle size={15} style={{ marginTop: '1.5px', flexShrink: 0 }} />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Username Input */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                管理员账号
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                  className="input"
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="请输入账号"
                  style={{ paddingLeft: '36px', height: '40px', fontSize: '13px' }}
                />
              </div>
            </div>

            {/* Password Input + Eye Switch */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                密码
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  style={{ paddingLeft: '36px', paddingRight: '40px', height: '40px', fontSize: '13px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'color 0.15s ease',
                  }}
                  title={showPassword ? '隐藏密码' : '显示密码'}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              className="btn-primary"
              type="submit"
              disabled={loading}
              style={{
                marginTop: '6px',
                height: '42px',
                fontSize: '14px',
                borderRadius: 'var(--radius-md)',
                width: '100%',
                fontWeight: 700,
                letterSpacing: '-0.01em',
              }}
            >
              {loading ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.7s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  身份验证中…
                </>
              ) : (
                <>
                  进入控制台
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

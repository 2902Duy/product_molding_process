import { useState } from 'react';
import { AlertCircle, Factory, Loader2, Lock, LogIn, User, UserPlus } from 'lucide-react';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

export default function LoginPage({ onLoginSuccess }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isRegisterMode = mode === 'register';

  const handleAuthSuccess = (user) => {
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('username', user?.username || username.trim());
    onLoginSuccess(user);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedUsername = username.trim();

    if (isRegisterMode && password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/${isRegisterMode ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername, password }),
      });

      const data = await response.json();

      if (data.success) {
        handleAuthSuccess(data.user || { username: trimmedUsername });
      } else {
        setError(data.message || (isRegisterMode ? 'Đăng ký thất bại' : 'Đăng nhập thất bại'));
      }
    } catch {
      setError('Không thể kết nối server. Vui lòng kiểm tra backend.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setConfirmPassword('');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, var(--color-app-bg) 0%, var(--color-primary-soft) 100%)' }}
    >
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'var(--color-primary)', boxShadow: '0 8px 24px rgba(59,130,246,0.3)' }}
          >
            <Factory size={26} color="white" />
          </div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            Quản Lý Sản Xuất Gỗ
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {isRegisterMode ? 'Tạo tài khoản để sử dụng hệ thống' : 'Đăng nhập để tiếp tục'}
          </p>
        </div>

        <div
          className="rounded-2xl p-7"
          style={{
            background: 'white',
            border: '1px solid var(--color-border)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div className="grid grid-cols-2 gap-2 mb-5 rounded-lg p-1" style={{ background: 'var(--color-app-bg)' }}>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="h-9 rounded-md text-[13px] font-semibold transition-colors"
              style={{
                background: !isRegisterMode ? 'white' : 'transparent',
                color: !isRegisterMode ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                boxShadow: !isRegisterMode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className="h-9 rounded-md text-[13px] font-semibold transition-colors"
              style={{
                background: isRegisterMode ? 'white' : 'transparent',
                color: isRegisterMode ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                boxShadow: isRegisterMode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              Đăng ký
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[13px] font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                Tên đăng nhập
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  size={16}
                  style={{ color: 'var(--color-text-muted)' }}
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-[14px] transition-all outline-none"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  placeholder="Nhập tên đăng nhập"
                  required
                  minLength={isRegisterMode ? 3 : 1}
                  disabled={loading}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-soft)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                Mật khẩu
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  size={16}
                  style={{ color: 'var(--color-text-muted)' }}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-[14px] transition-all outline-none"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  placeholder="Nhập mật khẩu"
                  required
                  minLength={isRegisterMode ? 6 : 1}
                  disabled={loading}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-soft)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {isRegisterMode && (
              <div>
                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    size={16}
                    style={{ color: 'var(--color-text-muted)' }}
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg text-[14px] transition-all outline-none"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                    placeholder="Nhập lại mật khẩu"
                    required
                    minLength={6}
                    disabled={loading}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-primary)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-soft)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div
                className="flex items-center gap-2.5 p-3 rounded-lg text-[13px]"
                style={{
                  background: 'var(--color-danger-soft)',
                  border: '1px solid var(--color-danger-border)',
                  color: 'var(--color-danger)',
                }}
              >
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 font-semibold rounded-lg text-[14px] text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'var(--color-primary)', boxShadow: '0 2px 8px rgba(59,130,246,0.25)' }}
              onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.background = 'var(--color-primary-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-primary)')}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {isRegisterMode ? 'Đang đăng ký...' : 'Đang đăng nhập...'}
                </>
              ) : isRegisterMode ? (
                <>
                  <UserPlus size={16} />
                  Đăng ký
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Đăng nhập
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 text-center" style={{ borderTop: '1px solid var(--color-border-light)' }}>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              Phiên bản 1.0.5
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

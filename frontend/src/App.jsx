import { BrowserRouter } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import { LogOut } from 'lucide-react';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLoginSuccess = (user) => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="relative">
      <BrowserRouter>
        <AppLayout onLogout={handleLogout} />
      </BrowserRouter>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-md hover:bg-slate-50 transition-colors"
        title="Đăng xuất"
      >
        <LogOut size={16} className="text-slate-600" />
        <span className="text-sm font-medium text-slate-600">
          {localStorage.getItem('username') || 'Đăng xuất'}
        </span>
      </button>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Xác nhận đăng xuất</h3>
            <p className="text-slate-600 mb-6">Bạn có chắc chắn muốn đăng xuất không?</p>
            <div className="flex gap-3">
              <button
                onClick={cancelLogout}
                className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

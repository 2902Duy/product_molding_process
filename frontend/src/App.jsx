import { BrowserRouter } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import { useState, useEffect, useRef } from 'react';
import LoginPage from './pages/LoginPage';
import { db } from './services/db';

const MCP_SYNC_INTERVAL_MS = 5 * 60 * 1000;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('isLoggedIn') === 'true';
  });
  const syncTimerRef = useRef(null);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('username');
    setIsLoggedIn(false);
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    // Load initial database cache from Supabase
    Promise.all([
      db.getLotsAsync(),
      db.getOrdersAsync(),
      db.getInventoryAsync(),
      db.getCustomRequestsAsync(),
    ])
      .then(() => console.log('[Database Initial Cache] Loaded successfully from Supabase'))
      .catch((err) => console.warn('[Database Initial Cache] Load error:', err));
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <BrowserRouter>
      <AppLayout onLogout={handleLogout} />
    </BrowserRouter>
  );
}

export default App;

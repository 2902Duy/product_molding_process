import { BrowserRouter } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import { useState, useEffect, useRef } from 'react';
import LoginPage from './pages/LoginPage';
import { db } from './services/db';

const MCP_SYNC_INTERVAL_MS = 5 * 60 * 1000;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const syncTimerRef = useRef(null);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    const runSync = () => {
      db.syncFromMcp({ force: true })
        .then(() => console.log('[MCP Sync] Completed at', new Date().toISOString()))
        .catch((err) => console.warn('[MCP Sync] Error:', err));
    };

    runSync();
    syncTimerRef.current = setInterval(runSync, MCP_SYNC_INTERVAL_MS);

    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
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

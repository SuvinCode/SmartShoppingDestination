import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';

const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
export const API_URL = `http://${host}:5100/api`;

function App() {
  const [view, setView] = useState('landing'); // 'landing' | 'login' | 'signup' | 'dashboard'
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('docket_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('docket_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('docket_theme', theme);
  }, [theme]);

  const navigate = (newView) => {
    if (newView === 'dashboard' && !user) {
      setView('login');
    } else {
      setView(newView);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('docket_user', JSON.stringify(userData));
    setView('dashboard');
  };

  const handleLogout = () => {
    if (user && user.username.toLowerCase() === 'demo') {
      localStorage.removeItem(`docket_home_address_${user.userId}`);
      localStorage.removeItem(`docket_region_${user.userId}`);
      fetch(`${API_URL}/dashboard/reset-account?userId=${user.userId}`, { method: 'POST' })
        .catch(err => console.error("Error resetting demo account on logout:", err));
    }
    setUser(null);
    localStorage.removeItem('docket_user');
    setView('landing');
  };

  const handleDemoLogin = () => {
    fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'demo', password: 'password' })
    })
    .then(res => {
      if (!res.ok) throw new Error();
      return res.json();
    })
    .then(data => {
      handleLogin(data);
    })
    .catch(err => {
      console.warn("Using offline demo account:", err.message);
      handleLogin({ userId: 1, username: 'demo' });
    });
  };

  return (
    <div className="app-root">
      <div className="bg-gradient-shapes"></div>
      
      {view === 'landing' && (
        <LandingPage 
          user={user} 
          onNavigate={navigate} 
          onLogout={handleLogout} 
          onDemoLogin={handleDemoLogin}
          theme={theme}
          setTheme={setTheme}
        />
      )}
      
      {(view === 'login' || view === 'signup') && (
        <AuthPage 
          isLogin={view === 'login'} 
          onNavigate={navigate} 
          onLoginSuccess={handleLogin} 
          theme={theme}
          setTheme={setTheme}
        />
      )}
      
      {view === 'dashboard' && user && (
        <DashboardPage 
          user={user} 
          onLogout={handleLogout} 
          onNavigate={navigate}
          theme={theme}
          setTheme={setTheme}
        />
      )}
    </div>
  );
}

export default App;

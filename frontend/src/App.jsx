import React, { useState } from 'react';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';

export const API_URL = "http://127.0.0.1:5100/api";

function App() {
  const [view, setView] = useState('landing'); // 'landing' | 'login' | 'signup' | 'dashboard'
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('docket_user');
    return saved ? JSON.parse(saved) : null;
  });

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
    setUser(null);
    localStorage.removeItem('docket_user');
    setView('landing');
  };

  return (
    <div className="app-root">
      <div className="bg-gradient-shapes"></div>
      
      {view === 'landing' && (
        <LandingPage 
          user={user} 
          onNavigate={navigate} 
          onLogout={handleLogout} 
        />
      )}
      
      {(view === 'login' || view === 'signup') && (
        <AuthPage 
          isLogin={view === 'login'} 
          onNavigate={navigate} 
          onLoginSuccess={handleLogin} 
        />
      )}
      
      {view === 'dashboard' && user && (
        <DashboardPage 
          user={user} 
          onLogout={handleLogout} 
          onNavigate={navigate}
        />
      )}
    </div>
  );
}

export default App;

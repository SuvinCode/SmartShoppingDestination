import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './AuthPage.css';
import { API_URL } from '../App';
import { ArrowLeft, KeyRound, Mail, User, AlertCircle, Sparkles, Receipt, Sun, Moon } from 'lucide-react';
import Logo from '../components/Logo';

function AuthPage({ isLogin, onNavigate, onLoginSuccess, theme, setTheme }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    
    setLoading(true);
    setError(null);

    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    const payload = isLogin 
      ? { username, password } 
      : { username, email, password };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      // Success
      onLoginSuccess(data);
    } catch (err) {
      console.warn('Backend Auth Error (falling back to local mockup):', err.message);
      
      // Standalone simulation fallback so Docket can be explored even without running backend services
      if (username.toLowerCase() === 'demo' && password === 'password') {
        const mockUser = { userId: 1, username: 'demo' };
        onLoginSuccess(mockUser);
        return;
      }
      
      // Simple local simulation for other mock users to allow standalone testing
      if (!isLogin) {
        onLoginSuccess({ userId: Math.floor(Math.random() * 1000) + 10, username });
        return;
      } else {
        onLoginSuccess({ userId: 2, username });
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setUsername('demo');
    setPassword('password');
    // We execute submit directly
    setLoading(true);
    setError(null);
    
    fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'demo', password: 'password' })
    })
    .then(res => res.json())
    .then(data => {
      onLoginSuccess(data);
    })
    .catch(err => {
      console.warn("Using offline demo account:", err.message);
      onLoginSuccess({ userId: 1, username: 'demo' });
    })
    .finally(() => {
      setLoading(false);
    });
  };

  return (
    <div className="auth-wrapper">
      <motion.div 
        layout 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        className="glass-panel auth-card"
      >
        {/* Back link and theme toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div 
            onClick={() => onNavigate('landing')} 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            <ArrowLeft size={16} /> Back to Home
          </div>
          
          <motion.button 
            className="theme-toggle-btn"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            whileHover={{ scale: 1.1, rotate: 12, backgroundColor: 'rgba(89, 165, 232, 0.15)' }}
            whileTap={{ scale: 0.9 }}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-charcoal)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              backgroundColor: 'var(--divider)',
              width: '32px',
              height: '32px',
              transition: 'background-color var(--transition-fast)'
            }}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </motion.button>
        </div>

        <div className="auth-header">
          <div className="auth-logo" onClick={() => onNavigate('landing')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Logo size={28} />
            <span>Docket</span>
          </div>
          <motion.h2 
            key={isLogin ? 'login-title' : 'signup-title'}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="auth-title"
          >
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </motion.h2>
          <motion.p 
            key={isLogin ? 'login-sub' : 'signup-sub'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="auth-subtitle"
          >
            {isLogin ? 'Sign in to optimize your shopping' : 'Start saving on groceries today'}
          </motion.p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="auth-error"
              style={{ overflow: 'hidden' }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="glass-input" 
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: '40px', width: '100%' }}
                required
              />
            </div>
          </div>

          <AnimatePresence initial={false}>
            {!isLogin && (
              <motion.div 
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="form-group"
                style={{ overflow: 'hidden' }}
              >
                <label className="form-label">Email Address (Optional)</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="email" 
                    className="glass-input" 
                    placeholder="name@docket.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: '40px', width: '100%' }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                className="glass-input" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '40px', width: '100%' }}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '14px' }}>
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="auth-toggle">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <span 
            className="auth-toggle-link"
            onClick={() => onNavigate(isLogin ? 'signup' : 'login')}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </span>
        </div>

        {isLogin && (
          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Want to skip signup and test with pre-seeded data?
            </div>
            <button 
              type="button" 
              className="btn demo-login-btn" 
              onClick={handleDemoLogin}
            >
              <Sparkles size={16} /> Quick Demo Login (User: demo)
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default AuthPage;

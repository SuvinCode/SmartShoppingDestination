import React, { useState } from 'react';
import { LogOut, User as UserIcon, Sun, Moon, Menu, X } from 'lucide-react';
import { motion } from 'framer-motion';
import Logo from './Logo';

export default function Header({
  user,
  onLogout,
  setActiveTab,
  theme,
  setTheme,
  mobileMenuOpen,
  setMobileMenuOpen
}) {
  const [showUserPopover, setShowUserPopover] = useState(false);

  return (
    <header className="dash-header">
      <div className="dash-logo" onClick={() => setActiveTab('compare')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Hamburger Menu Toggle on Mobile */}
        <button 
          className="mobile-menu-toggle"
          onClick={(e) => {
            e.stopPropagation();
            setMobileMenuOpen(!mobileMenuOpen);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-charcoal)',
            cursor: 'pointer',
            padding: '4px',
            marginRight: '4px',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Logo size={28} />
        <span>Docket</span>
      </div>
      
      <div className="dash-user-section">
        {/* Theme Toggle */}
        <motion.button
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
            width: '34px',
            height: '34px',
            marginRight: '8px',
            transition: 'background-color var(--transition-fast)'
          }}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </motion.button>

        {/* User badge */}
        <div 
          className="user-profile-badge" 
          onClick={() => setShowUserPopover(!showUserPopover)}
          style={{ position: 'relative', cursor: 'pointer' }}
        >
          <UserIcon size={16} />
          <span className="user-profile-name" style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user.username}</span>

          {showUserPopover && (
            <div className="user-popover animate-fade-in">
              <span className="popover-text">Signed in as:</span>
              <strong className="popover-username">{user.username}</strong>
            </div>
          )}
        </div>

        <button className="btn btn-secondary dash-logout-btn" onClick={onLogout} style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
          <LogOut size={14} /> <span>Logout</span>
        </button>
      </div>
    </header>
  );
}

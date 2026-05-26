import React from 'react';
import { Bell, LogOut, User as UserIcon } from 'lucide-react';
import Logo from './Logo';

export default function Header({
  user,
  onLogout,
  setActiveTab,
  showNotifications,
  setShowNotifications,
  unreadCount,
  notifications,
  handleMarkNotificationsRead
}) {
  return (
    <header className="dash-header">
      <div className="dash-logo" onClick={() => setActiveTab('compare')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Logo size={28} />
        <span>Docket</span>
      </div>
      
      <div className="dash-user-section">
        {/* Notifications Bell */}
        <div style={{ position: 'relative' }}>
          <Bell 
            className="notifications-bell" 
            size={20} 
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) handleMarkNotificationsRead();
            }}
          />
          {unreadCount > 0 && <span className="bell-badge"></span>}
          
          {showNotifications && (
            <div className="glass-panel notification-drawer animate-fade-in">
              <div className="drawer-header">
                <h4 style={{ fontSize: '0.95rem' }}>Weekly Notifications</h4>
                <span 
                  style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer' }}
                  onClick={() => setShowNotifications(false)}
                >
                  Close
                </span>
              </div>
              <div className="drawer-items">
                {notifications.map(n => (
                  <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`}>
                    <span className="notif-title">{n.title}</span>
                    <span className="notif-msg">{n.message}</span>
                    <span className="notif-time">{n.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User badge */}
        <div className="user-profile-badge">
          <UserIcon size={16} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user.username}</span>
        </div>

        <button className="btn btn-secondary" onClick={onLogout} style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
          <LogOut size={14} /> Logout
        </button>
      </div>
    </header>
  );
}

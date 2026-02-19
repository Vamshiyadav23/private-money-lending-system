import React from 'react';

const Navigation = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'borrowers', label: 'Borrowers', icon: '👥' }, 
    // { id: 'repayments', label: 'Repayments', icon: '📝' },
    { id: 'reports', label: 'Reports', icon: '📈' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' }
  ];

  return (
    <nav className="navigation">
      <div className="nav-header">
        <h1>NSK Finance</h1>
      </div>
      <ul className="nav-menu">
        {menuItems.map(item => (
          <li key={item.id} className="nav-item">
            <div
              className={`nav-link ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navigation;
import React, { useState } from 'react';

const Notifications = ({ loans, borrowers, repayments }) => {
  const [notificationType, setNotificationType] = useState('all');
  const [selectedBorrowers, setSelectedBorrowers] = useState([]);
  const [message, setMessage] = useState('');

  const pendingRepayments = repayments.filter(r => r.status === 'pending');
  const overdueRepayments = repayments.filter(r => r.status === 'overdue');

  const notifications = [
    // {
    //   id: 1,
    //   type: 'reminder',
    //   title: 'Payment Due Reminder',
    //   message: 'Payment of $500 is due tomorrow for John Smith',
    //   date: '2024-02-14',
    //   status: 'pending'
    // },
    // {
    //   id: 2,
    //   type: 'alert',
    //   title: 'Overdue Payment',
    //   message: 'Sarah Johnson has an overdue payment of $250',
    //   date: '2024-02-13',
    //   status: 'unread'
    // },
    // {
    //   id: 3,
    //   type: 'info',
    //   title: 'New Loan Application',
    //   message: 'Michael Brown has applied for a new loan',
    //   date: '2024-02-12',
    //   status: 'read'
    // }
  ];

  const filteredNotifications = notifications.filter(notification => {
    return notificationType === 'all' || notification.type === notificationType;
  });

  const sendBulkNotifications = () => {
    if (selectedBorrowers.length === 0 || !message.trim()) {
      alert('Please select borrowers and enter a message.');
      return;
    }

    alert(`Notification sent to ${selectedBorrowers.length} borrowers: ${message}`);
    setMessage('');
    setSelectedBorrowers([]);
  };

  const toggleBorrowerSelection = (borrowerId) => {
    setSelectedBorrowers(prev => 
      prev.includes(borrowerId)
        ? prev.filter(id => id !== borrowerId)
        : [...prev, borrowerId]
    );
  };

  const selectAllBorrowers = () => {
    setSelectedBorrowers(borrowers.map(b => b.id));
  };

  const clearSelection = () => {
    setSelectedBorrowers([]);
  };

  return (
    <div className="notifications-page">
      <div className="page-header">
        <h1 className="page-title">Notifications & Alerts</h1>
      </div>

      <div className="card-grid">
        {/* Notification Statistics */}
        <div className="card">
          <h3 className="card-title">Quick Overview</h3>
          <div className="stats-overview">
            <div className="stat-item">
              <span className="stat-number">{pendingRepayments.length}</span>
              <span className="stat-label">Pending Repayments</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{overdueRepayments.length}</span>
              <span className="stat-label">Overdue Repayments</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{notifications.filter(n => n.status === 'unread').length}</span>
              <span className="stat-label">Unread Notifications</span>
            </div>
          </div>
        </div>

        {/* Send Notifications */}
        <div className="card">
          <h3 className="card-title">Send Notifications</h3>
          <div className="form-group">
            <label className="form-label">Select Borrowers</label>
            <div className="action-buttons" style={{ marginBottom: '10px' }}>
              <button className="btn btn-secondary btn-sm" onClick={selectAllBorrowers}>
                Select All
              </button>
              <button className="btn btn-secondary btn-sm" onClick={clearSelection}>
                Clear All
              </button>
            </div>
            <div className="borrower-selection" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {borrowers.map(borrower => (
                <div key={borrower.id} className="checkbox-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedBorrowers.includes(borrower.id)}
                      onChange={() => toggleBorrowerSelection(borrower.id)}
                    />
                    {borrower.name} ({borrower.phone})
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Message</label>
            <textarea
              className="form-textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your notification message here..."
              rows="4"
            />
          </div>

          <div className="action-buttons">
            <button className="btn btn-primary" onClick={sendBulkNotifications}>
              Send SMS
            </button>
            <button className="btn btn-success" onClick={sendBulkNotifications}>
              Send Email
            </button>
            <button className="btn btn-secondary" onClick={sendBulkNotifications}>
              Send WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Notifications</h3>
          <select 
            className="form-select"
            style={{ width: 'auto' }}
            value={notificationType}
            onChange={(e) => setNotificationType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="reminder">Reminders</option>
            <option value="alert">Alerts</option>
            <option value="info">Information</option>
          </select>
        </div>

        <div className="notifications-list">
          {filteredNotifications.map(notification => (
            <div key={notification.id} className={`notification-item ${notification.status}`}>
              <div className="notification-icon">
                {notification.type === 'reminder' && '⏰'}
                {notification.type === 'alert' && '⚠️'}
                {notification.type === 'info' && 'ℹ️'}
              </div>
              <div className="notification-content">
                <div className="notification-title">{notification.title}</div>
                <div className="notification-message">{notification.message}</div>
                <div className="notification-date">{notification.date}</div>
              </div>
              <div className="notification-actions">
                <button className="btn btn-secondary btn-sm">Mark Read</button>
                <button className="btn btn-primary btn-sm">Resend</button>
              </div>
            </div>
          ))}
        </div>

        {filteredNotifications.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <h3>No notifications found</h3>
            <p>All caught up! No notifications match your filter.</p>
          </div>
        )}
      </div>

      {/* Automated Alerts Settings */}
      <div className="card">
        <h3 className="card-title">Automated Alert Settings</h3>
        <div className="alert-settings">
          <div className="setting-item">
            <label>
              <input type="checkbox" defaultChecked />
              Send payment reminders 3 days before due date
            </label>
          </div>
          <div className="setting-item">
            <label>
              <input type="checkbox" defaultChecked />
              Send overdue alerts daily
            </label>
          </div>
          <div className="setting-item">
            <label>
              <input type="checkbox" defaultChecked />
              Send weekly summary reports
            </label>
          </div>
          <div className="setting-item">
            <label>
              <input type="checkbox" />
              Send monthly performance reports
            </label>
          </div>
        </div>
        <div className="action-buttons" style={{ marginTop: '20px' }}>
          <button className="btn btn-primary">Save Settings</button>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
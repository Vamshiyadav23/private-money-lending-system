import React from 'react';

const Dashboard = ({ borrowers = [], loans = [], repayments = [], refreshData }) => {
  // Safe data extraction with fallbacks
  const safeBorrowers = Array.isArray(borrowers) ? borrowers : [];
  const safeLoans = Array.isArray(loans) ? loans : [];
  const safeRepayments = Array.isArray(repayments) ? repayments : [];

  // Calculate dashboard statistics with safe property access
  const totalBorrowers = safeBorrowers.length;
  const totalLoans = safeLoans.length;
  
  // Safe calculation of total loan amount
  const totalLoanAmount = safeLoans.reduce((sum, loan) => {
    const principal = loan?.principal || 0;
    return sum + principal;
  }, 0);
  
  // Safe calculation of total repayments count
  const totalRepaymentsCount = safeRepayments.filter(r => {
    const status = r?.status || '';
    return status === 'paid';
  }).length;
  
  const pendingRepayments = safeRepayments.filter(r => {
    const status = r?.status || '';
    return status === 'pending';
  }).length;
  
  const overdueRepayments = safeRepayments.filter(r => {
    const status = r?.status || '';
    return status === 'overdue';
  }).length;
  
  // Safe calculation of active loans
  const activeLoans = safeLoans.filter(loan => {
    const status = loan?.status || '';
    return status === 'active';
  }).length;
  
  // Safe calculation of total revenue
  const totalRevenue = safeLoans.reduce((sum, loan) => {
    const totalDue = loan?.totalDue || 0;
    const principal = loan?.principal || 0;
    return sum + (totalDue - principal);
  }, 0);

  // Generate real recent activity from actual data
  const getRecentActivities = () => {
    const activities = [];

    // Recent loans (last 5)
    const recentLoans = [...safeLoans]
      .sort((a, b) => new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate))
      .slice(0, 3);

    recentLoans.forEach(loan => {
      activities.push({
        id: loan._id || loan.id,
        type: 'loan',
        message: `New loan approved for ${loan.borrowerName}`,
        time: getTimeAgo(loan.createdAt || loan.startDate),
        amount: `₹${loan.principal?.toLocaleString()}`,
        icon: '💰'
      });
    });

    // Recent repayments (last 5)
    const recentRepayments = [...safeRepayments]
      .filter(r => r.status === 'paid')
      .sort((a, b) => new Date(b.date || b.paymentDate) - new Date(a.date || a.paymentDate))
      .slice(0, 3);

    recentRepayments.forEach(repayment => {
      activities.push({
        id: repayment._id || repayment.id,
        type: 'repayment',
        message: `${repayment.borrowerName} made a repayment`,
        time: getTimeAgo(repayment.date || repayment.paymentDate),
        amount: `₹${repayment.amount?.toLocaleString()}`,
        icon: '💳'
      });
    });

    // Recent borrowers (last 3)
    const recentBorrowers = [...safeBorrowers]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 2);

    recentBorrowers.forEach(borrower => {
      activities.push({
        id: borrower._id || borrower.id,
        type: 'borrower',
        message: `New borrower registered: ${borrower.name}`,
        time: getTimeAgo(borrower.createdAt),
        amount: '',
        icon: '👤'
      });
    });

    // Sort all activities by time and take latest 5
    return activities
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 5);
  };

  // Helper function to get time ago
  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Recently';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const stats = [
    { label: 'Total Borrowers', value: totalBorrowers, icon: '👥', color: '#3498db' },
    { label: 'Active Loans', value: activeLoans, icon: '💰', color: '#2ecc71' },
    { label: 'Total Loan Amount', value: `₹${totalLoanAmount.toLocaleString()}`, icon: '💵', color: '#9b59b6' },
    { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: '📈', color: '#f39c12' },
    { label: 'Pending Repayments', value: pendingRepayments, icon: '⏳', color: '#e67e22' },
    { label: 'Overdue Repayments', value: overdueRepayments, icon: '⚠️', color: '#e74c3c' }
  ];

  const recentActivities = getRecentActivities();

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <div className="action-buttons">
          <button className="btn btn-primary" onClick={refreshData}>
            Refresh Data
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="dashboard">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon" style={{ color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Charts and Recent Activity */}
      <div className="charts-section">
        {/* <div className="chart-container">
          <h3 className="chart-title">Loan Distribution</h3>
          <div className="chart-placeholder">
            <p style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
              Loan distribution chart would be displayed here
            </p>
          </div>
        </div> */}
        
        <div className="recent-activity">
          <h3 className="activity-title">Recent Activity</h3>
          <div className="activity-list">
            {recentActivities.length > 0 ? (
              recentActivities.map(activity => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon">{activity.icon}</div>
                  <div className="activity-content">
                    <div className="activity-message">{activity.message}</div>
                    <div className="activity-details">
                      <span className="activity-amount">{activity.amount}</span>
                      <span className="activity-time">{activity.time}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-activity">
                <p>No recent activity</p>
                <small>Activities will appear here as you use the system</small>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
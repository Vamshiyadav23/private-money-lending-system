import React, { useState } from 'react';

const Reports = ({ borrowers, loans, repayments }) => {
  const [reportType, setReportType] = useState('overview');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  // Calculate report data
  const totalActiveLoans = loans.filter(loan => loan.status === 'active').length;
  const totalCompletedLoans = loans.filter(loan => loan.status === 'completed').length;
  const totalDefaultedLoans = loans.filter(loan => loan.status === 'defaulted').length;
  
  const totalLoanAmount = loans.reduce((sum, loan) => sum + loan.principal, 0);
  const totalRevenue = loans.reduce((sum, loan) => sum + (loan.totalDue - loan.principal), 0);
  
  const totalRepayments = repayments.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.amount, 0);
  const pendingRepayments = repayments.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);

  const overviewStats = [
    { label: 'Total Borrowers', value: borrowers.length },
    { label: 'Active Loans', value: totalActiveLoans },
    { label: 'Completed Loans', value: totalCompletedLoans },
    { label: 'Defaulted Loans', value: totalDefaultedLoans },
    { label: 'Total Loan Amount', value: `₹${totalLoanAmount.toLocaleString()}` },
    { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}` },
    { label: 'Total Repayments', value: `₹${totalRepayments.toLocaleString()}` },
    { label: 'Pending Repayments', value: `₹${pendingRepayments.toLocaleString()}` }
  ];

  const generatePDF = () => {
    alert('PDF generation would be implemented here. This would connect to a PDF generation service.');
  };

  const generateExcel = () => {
    alert('Excel export would be implemented here. This would generate and download an Excel file.');
  };

  const handleDateChange = (e) => {
    setDateRange({
      ...dateRange,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1 className="page-title">Reports & Analytics</h1>
        <div className="action-buttons">
          <button className="btn btn-primary" onClick={generatePDF}>
            Export PDF
          </button>
          <button className="btn btn-success" onClick={generateExcel}>
            Export Excel
          </button>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Report Type</h3>
        </div>
        <div className="filter-group">
          <select 
            className="form-select"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="overview">Overview</option>
            <option value="loans">Loans Report</option>
            <option value="repayments">Repayments Report</option>
            <option value="borrowers">Borrowers Report</option>
            <option value="profit">Profit Analysis</option>
          </select>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Date Range</h3>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input
              type="date"
              name="start"
              className="form-input"
              value={dateRange.start}
              onChange={handleDateChange}
            />
          </div>
          <div className="form-group">
            <label className="form-label">End Date</label>
            <input
              type="date"
              name="end"
              className="form-input"
              value={dateRange.end}
              onChange={handleDateChange}
            />
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {reportType === 'overview' && 'Business Overview'}
            {reportType === 'loans' && 'Loans Report'}
            {reportType === 'repayments' && 'Repayments Report'}
            {reportType === 'borrowers' && 'Borrowers Report'}
            {reportType === 'profit' && 'Profit Analysis'}
          </h3>
        </div>

        {reportType === 'overview' && (
          <div className="overview-report">
            <div className="dashboard">
              {overviewStats.map((stat, index) => (
                <div key={index} className="stat-card">
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* <div className="charts-section">
              <div className="chart-container">
                <h4 className="chart-title">Loan Distribution</h4>
                <div className="chart-placeholder">
                  <p style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                    Loan distribution chart would be displayed here
                  </p>
                </div>
              </div>
              
              <div className="chart-container">
                <h4 className="chart-title">Revenue Trends</h4>
                <div className="chart-placeholder">
                  <p style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                    Revenue trends chart would be displayed here
                  </p>
                </div>
              </div>
            </div> */}
          </div>
        )}

        {reportType === 'loans' && (
          <div className="loans-report">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>Borrower</th>
                  <th>Principal</th>
                  <th>Interest Rate</th>
                  <th>Total Due</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                </tr>
              </thead>
              <tbody>
                {loans.map(loan => (
                  <tr key={loan.id}>
                    <td>#{loan.id}</td>
                    <td>{loan.borrowerName}</td>
                    <td>₹{loan.principal.toLocaleString()}</td>
                    <td>{loan.interestRate}%</td>
                    <td>₹{loan.totalDue.toLocaleString()}</td>
                    <td>
                      <span className={`status-badge status-${loan.status}`}>
                        {loan.status}
                      </span>
                    </td>
                    <td>{loan.startDate}</td>
                    <td>{loan.endDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'repayments' && (
          <div className="repayments-report">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Repayment ID</th>
                  <th>Borrower</th>
                  <th>Loan ID</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Payment Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {repayments.map(repayment => (
                  <tr key={repayment.id}>
                    <td>#{repayment.id}</td>
                    <td>{repayment.borrowerName}</td>
                    <td>#{repayment.loanId}</td>
                    <td>₹{repayment.amount.toLocaleString()}</td>
                    <td>{repayment.dueDate}</td>
                    <td>{repayment.date || '-'}</td>
                    <td>
                      <span className={`status-badge status-${repayment.status}`}>
                        {repayment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'borrowers' && (
          <div className="borrowers-report">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Borrower ID</th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Risk Rating</th>
                  <th>Active Loans</th>
                  <th>Total Borrowed</th>
                  <th>Join Date</th>
                </tr>
              </thead>
              <tbody>
                {borrowers.map(borrower => {
                  const borrowerLoans = loans.filter(loan => loan.borrowerId === borrower.id);
                  const totalBorrowed = borrowerLoans.reduce((sum, loan) => sum + loan.principal, 0);
                  
                  return (
                    <tr key={borrower.id}>
                      <td>#{borrower.id}</td>
                      <td>{borrower.name}</td>
                      <td>{borrower.phone}</td>
                      <td>
                        <span className={`status-badge risk-${borrower.riskRating.toLowerCase()}`}>
                          {borrower.riskRating}
                        </span>
                      </td>
                      <td>{borrowerLoans.length}</td>
                      <td>₹{totalBorrowed.toLocaleString()}</td>
                      <td>{borrower.createdAt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'profit' && (
          <div className="profit-report">
            <div className="dashboard">
              <div className="stat-card">
                <div className="stat-value">₹{totalRevenue.toLocaleString()}</div>
                <div className="stat-label">Total Revenue</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">₹{totalLoanAmount.toLocaleString()}</div>
                <div className="stat-label">Total Principal</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{((totalRevenue / totalLoanAmount) * 100).toFixed(1)}%</div>
                <div className="stat-label">Return on Investment</div>
              </div>
            </div>

            {/* <div className="chart-container">
              <h4 className="chart-title">Monthly Profit Trend</h4>
              <div className="chart-placeholder">
                <p style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                  Monthly profit trend chart would be displayed here
                </p>
              </div>
            </div> */}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
import React, { useState, useEffect } from 'react';
import { loanAPI, repaymentAPI } from '../services/api';

const BorrowerProfile = ({ borrower, loans, repayments, onClose, refreshData }) => {
  const [borrowerLoans, setBorrowerLoans] = useState([]);
  const [borrowerRepayments, setBorrowerRepayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [repaymentLoading, setRepaymentLoading] = useState(null);

  useEffect(() => {
    loadBorrowerData();
  }, [borrower, loans, repayments]);

  const loadBorrowerData = () => {
    if (!borrower) return;

    const borrowerId = borrower._id || borrower.id;
    
    const safeLoans = Array.isArray(loans) ? loans : [];
    const safeRepayments = Array.isArray(repayments) ? repayments : [];
    
    // Filter loans for this borrower
    const borrowerLoans = safeLoans.filter(loan => {
      const loanBorrowerId = loan.borrowerId?._id || loan.borrowerId;
      return loanBorrowerId === borrowerId;
    });
    
    // Filter repayments for this borrower's loans
    const loanIds = borrowerLoans.map(loan => loan._id || loan.id);
    const borrowerRepayments = safeRepayments.filter(repayment => {
      const repaymentLoanId = repayment.loanId?._id || repayment.loanId;
      return loanIds.includes(repaymentLoanId);
    });

    setBorrowerLoans(borrowerLoans);
    setBorrowerRepayments(borrowerRepayments);
    setLoading(false);
  };

  // CORRECTED: Enhanced loan progress calculation (capped at 100%)
  const calculateLoanProgress = (loan, repayments = []) => {
    const totalDue = calculateTotalDue(loan);
    let totalPaid = 0;

    if (loan.paidAmount !== undefined) {
      totalPaid = loan.paidAmount;
    } else {
      const safeRepayments = Array.isArray(repayments) ? repayments : [];
      totalPaid = safeRepayments
        .filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + (r.amount || 0), 0);
    }
    
    return totalDue > 0 ? Math.min(100, (totalPaid / totalDue) * 100) : 0;
  };

  // CORRECTED: Calculate total due including interest
  const calculateTotalDue = (loan) => {
    const principal = loan.principal || 0;
    const interestRate = loan.interestRate || 0;
    const loanTerm = loan.loanTerm || 6;
    
    // Simple interest calculation
    const interest = principal * (interestRate / 100) * (loanTerm / 12);
    return principal + interest;
  };

  // CORRECTED: Enhanced loan status detection with proper completion logic
  const getEnhancedLoanStatus = (loan, repayments = []) => {
    // If loan already has a valid status, use it
    if (loan.status && ['active', 'completed', 'defaulted'].includes(loan.status)) {
      return loan.status;
    }
    
    const totalDue = calculateTotalDue(loan);
    let totalPaid = 0;

    if (loan.paidAmount !== undefined) {
      totalPaid = loan.paidAmount;
    } else {
      const safeRepayments = Array.isArray(repayments) ? repayments : [];
      totalPaid = safeRepayments
        .filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + (r.amount || 0), 0);
    }
    
    // CORRECTED: Mark as completed when paid amount >= total due
    if (totalPaid >= totalDue) {
      return 'completed';
    }
    
    // Check if loan is defaulted (past end date with pending payments)
    if (loan.endDate && new Date(loan.endDate) < new Date()) {
      return 'defaulted';
    }
    
    return 'active';
  };

  // CORRECTED: Calculate remaining balance properly
  const calculateRemainingBalance = (loan, repayments = []) => {
    const totalDue = calculateTotalDue(loan);
    let totalPaid = 0;

    if (loan.paidAmount !== undefined) {
      totalPaid = loan.paidAmount;
    } else {
      const safeRepayments = Array.isArray(repayments) ? repayments : [];
      totalPaid = safeRepayments
        .filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + (r.amount || 0), 0);
    }
    
    return Math.max(0, totalDue - totalPaid);
  };

  const getLoanRepayments = (loanId) => {
    const safeRepayments = Array.isArray(borrowerRepayments) ? borrowerRepayments : [];
    return safeRepayments.filter(repayment => {
      const repaymentLoanId = repayment.loanId?._id || repayment.loanId;
      return repaymentLoanId === loanId;
    });
  };

  // CORRECTED: Mark repayment as paid with proper validation
  const markRepaymentAsPaid = async (repaymentId) => {
    setRepaymentLoading(repaymentId);
    try {
      await repaymentAPI.markAsPaid(repaymentId);
      
      if (refreshData) {
        refreshData();
      }
      
      // Reload local data
      loadBorrowerData();
      
      alert('Repayment marked as paid successfully!');
    } catch (error) {
      console.error('Failed to mark repayment as paid:', error);
      alert(`Error: ${error.message || 'Failed to mark repayment as paid'}`);
    } finally {
      setRepaymentLoading(null);
    }
  };

  // CORRECTED: Auto-complete loan when fully paid
  const autoCompleteLoanIfPaid = async (loanId) => {
    try {
      const loan = borrowerLoans.find(l => (l._id || l.id) === loanId);
      if (!loan) return;

      const loanRepayments = getLoanRepayments(loanId);
      const status = getEnhancedLoanStatus(loan, loanRepayments);
      
      if (status === 'completed' && loan.status !== 'completed') {
        // Update loan status to completed in backend
        await loanAPI.updateStatus(loanId, 'completed');
        if (refreshData) refreshData();
      }
    } catch (error) {
      console.error('Error auto-completing loan:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      active: 'status-active',
      completed: 'status-paid',
      defaulted: 'status-overdue',
      paid: 'status-paid',
      pending: 'status-pending',
      overdue: 'status-overdue'
    };
    return `status-badge ${statusClasses[status] || 'status-pending'}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount) => {
    return `₹${(amount || 0).toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading borrower profile...</p>
          </div>
        </div>
      </div>
    );
  }

  const safeBorrowerLoans = Array.isArray(borrowerLoans) ? borrowerLoans : [];
  const safeBorrowerRepayments = Array.isArray(borrowerRepayments) ? borrowerRepayments : [];
  
  // CORRECTED: Proper loan categorization
  const activeLoans = safeBorrowerLoans.filter(loan => {
    const status = getEnhancedLoanStatus(loan, getLoanRepayments(loan._id || loan.id));
    return status === 'active';
  });
  
  const completedLoans = safeBorrowerLoans.filter(loan => {
    const status = getEnhancedLoanStatus(loan, getLoanRepayments(loan._id || loan.id));
    return status === 'completed';
  });
  
  const defaultedLoans = safeBorrowerLoans.filter(loan => {
    const status = getEnhancedLoanStatus(loan, getLoanRepayments(loan._id || loan.id));
    return status === 'defaulted';
  });

  // CORRECTED: Accurate financial calculations
  const totalBorrowed = safeBorrowerLoans.reduce((sum, loan) => sum + (loan.principal || 0), 0);
  
  const totalRepaid = safeBorrowerRepayments
    .filter(r => r.status === 'paid')
    .reduce((sum, r) => sum + (r.amount || 0), 0);
  
  // CORRECTED: Pending calculated from active/defaulted loans only
  const totalPending = [...activeLoans, ...defaultedLoans].reduce((sum, loan) => {
    const loanRepayments = getLoanRepayments(loan._id || loan.id);
    return sum + calculateRemainingBalance(loan, loanRepayments);
  }, 0);

  // Get today's repayments for this borrower
  const todaysRepayments = safeBorrowerRepayments.filter(repayment => {
    const today = new Date().toISOString().split('T')[0];
    return repayment.dueDate === today && repayment.status === 'pending';
  });

  // Get overdue repayments for this borrower
  const overdueRepayments = safeBorrowerRepayments.filter(repayment => {
    const today = new Date().toISOString().split('T')[0];
    return repayment.dueDate < today && repayment.status === 'pending';
  });

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '1000px', maxHeight: '90vh', width: '95%' }}>
        <div className="modal-header">
          <h2 className="modal-title">👤 Borrower Profile: {borrower.name}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Borrower Basic Info */}
        <div className="borrower-basic-info">
          <div className="info-grid">
            <div className="info-item">
              <label>Email:</label>
              <span>{borrower.email}</span>
            </div>
            <div className="info-item">
              <label>Phone:</label>
              <span>{borrower.phone}</span>
            </div>
            <div className="info-item">
              <label>Address:</label>
              <span>{borrower.address || 'Not provided'}</span>
            </div>
            <div className="info-item">
              <label>ID Proof:</label>
              <span>{borrower.idProof || 'Not provided'}</span>
            </div>
            <div className="info-item">
              <label>Total Loans:</label>
              <span>{safeBorrowerLoans.length}</span>
            </div>
            <div className="info-item">
              <label>Total Borrowed:</label>
              <span>{formatCurrency(totalBorrowed)}</span>
            </div>
          </div>
        </div>

        {/* CORRECTED: Quick Repayment Stats with accurate data */}
        <div className="quick-stats">
          <div className="stat-card mini">
            <div className="stat-value">{formatCurrency(totalRepaid)}</div>
            <div className="stat-label">Total Repaid</div>
          </div>
          <div className="stat-card mini">
            <div className="stat-value">{formatCurrency(totalPending)}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card mini">
            <div className="stat-value">{todaysRepayments.length}</div>
            <div className="stat-label">Due Today</div>
          </div>
          <div className="stat-card mini">
            <div className="stat-value">{overdueRepayments.length}</div>
            <div className="stat-label">Overdue</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active Loans ({activeLoans.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Loan History ({completedLoans.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'repayments' ? 'active' : ''}`}
            onClick={() => setActiveTab('repayments')}
          >
            All Repayments ({safeBorrowerRepayments.length})
          </button>
          {/* <button 
            className={`tab-btn ${activeTab === 'due' ? 'active' : ''}`}
            onClick={() => setActiveTab('due')}
          >
            Due Today ({todaysRepayments.length})
          </button> */}
        </div>

        {/* Tab Content */}
        <div className="tab-content" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="overview-stats">
                <div className="stat-card">
                  <div className="stat-value">{safeBorrowerLoans.length}</div>
                  <div className="stat-label">Total Loans</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{activeLoans.length}</div>
                  <div className="stat-label">Active Loans</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{completedLoans.length}</div>
                  <div className="stat-label">Completed</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{defaultedLoans.length}</div>
                  <div className="stat-label">Defaulted</div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="recent-activity-section">
                <h4>Recent Loan Activity</h4>
                {safeBorrowerLoans.slice(0, 3).map(loan => {
                  const loanRepayments = getLoanRepayments(loan._id || loan.id);
                  const status = getEnhancedLoanStatus(loan, loanRepayments);
                  const progress = calculateLoanProgress(loan, loanRepayments);
                  const totalDue = calculateTotalDue(loan);
                  
                  return (
                    <div key={loan._id || loan.id} className="activity-item">
                      <div className="activity-icon">
                        {status === 'active' ? '💰' : status === 'completed' ? '✅' : '⚠️'}
                      </div>
                      <div className="activity-content">
                        <div className="activity-message">
                          <strong>{status.charAt(0).toUpperCase() + status.slice(1)} Loan</strong>: {formatCurrency(loan.principal)}
                        </div>
                        <div className="activity-details">
                          <span className="activity-amount">
                            Progress: {progress.toFixed(1)}% ({formatCurrency(totalDue)} total)
                          </span>
                          <span className="activity-time">
                            {formatDate(loan.startDate)}
                          </span>
                        </div>
                        {loanRepayments.length > 0 && (
                          <div className="activity-repayments">
                            <small>
                              {loanRepayments.filter(r => r.status === 'paid').length} paid · 
                              {loanRepayments.filter(r => r.status === 'pending').length} pending
                            </small>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Loans Tab */}
          {activeTab === 'active' && (
            <div className="loans-tab">
              {activeLoans.length > 0 ? (
                activeLoans.map(loan => (
                  <LoanDetailCard 
                    key={loan._id || loan.id} 
                    loan={loan} 
                    repayments={getLoanRepayments(loan._id || loan.id)}
                    calculateLoanProgress={calculateLoanProgress}
                    getEnhancedLoanStatus={getEnhancedLoanStatus}
                    calculateTotalDue={calculateTotalDue}
                    calculateRemainingBalance={calculateRemainingBalance}
                    onMarkRepaymentPaid={markRepaymentAsPaid}
                    repaymentLoading={repaymentLoading}
                  />
                ))
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">✅</div>
                  <h3>No Active Loans</h3>
                  <p>This borrower has no currently active loans.</p>
                </div>
              )}
            </div>
          )}

          {/* CORRECTED: Loan History Tab - Only shows completed loans */}
          {activeTab === 'history' && (
            <div className="loans-tab">
              {completedLoans.length > 0 ? (
                completedLoans.map(loan => (
                  <LoanDetailCard 
                    key={loan._id || loan.id} 
                    loan={loan} 
                    repayments={getLoanRepayments(loan._id || loan.id)}
                    calculateLoanProgress={calculateLoanProgress}
                    getEnhancedLoanStatus={getEnhancedLoanStatus}
                    calculateTotalDue={calculateTotalDue}
                    calculateRemainingBalance={calculateRemainingBalance}
                  />
                ))
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📊</div>
                  <h3>No Loan History</h3>
                  <p>This borrower has no completed loans yet.</p>
                </div>
              )}
            </div>
          )}

          {/* All Repayments Tab */}
          {activeTab === 'repayments' && (
            <div className="repayments-tab">
              <h4>All Repayment History</h4>
              {safeBorrowerRepayments.length > 0 ? (
                <div className="table-container">
                  <table className="data-table small">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Due Date</th>
                        <th>Amount</th>
                        <th>Loan</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {safeBorrowerRepayments.map(repayment => {
                        const loan = safeBorrowerLoans.find(l => l._id === repayment.loanId || l.id === repayment.loanId);
                        return (
                          <tr key={repayment._id || repayment.id}>
                            <td>{formatDate(repayment.date || repayment.paymentDate)}</td>
                            <td>{formatDate(repayment.dueDate)}</td>
                            <td className="amount">{formatCurrency(repayment.amount)}</td>
                            <td>{loan ? `Loan #${(loan._id || loan.id).substring(0, 8)}` : 'N/A'}</td>
                            <td>
                              <span className={`repayment-type-badge type-${repayment.type}`}>
                                {repayment.type || 'regular'}
                              </span>
                            </td>
                            <td>
                              <span className={getStatusBadge(repayment.status)}>
                                {repayment.status}
                              </span>
                            </td>
                            <td>
                              {repayment.status === 'pending' && (
                                <button 
                                  className="btn btn-success btn-sm"
                                  onClick={() => markRepaymentAsPaid(repayment._id || repayment.id)}
                                  disabled={repaymentLoading === (repayment._id || repayment.id)}
                                >
                                  {repaymentLoading === (repayment._id || repayment.id) ? '...' : 'Mark Paid'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">💰</div>
                  <h3>No Repayments</h3>
                  <p>No repayment history found for this borrower.</p>
                </div>
              )}
            </div>
          )}

          {/* Due Today Tab */}
          {/* {activeTab === 'due' && (
            <div className="due-tab">
              <h4>Repayments Due Today</h4>
              {todaysRepayments.length > 0 ? (
                <div className="table-container">
                  <table className="data-table small">
                    <thead>
                      <tr>
                        <th>Due Date</th>
                        <th>Amount</th>
                        <th>Loan</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todaysRepayments.map(repayment => {
                        const loan = safeBorrowerLoans.find(l => l._id === repayment.loanId || l.id === repayment.loanId);
                        return (
                          <tr key={repayment._id || repayment.id} className="row-today">
                            <td>
                              <strong>{formatDate(repayment.dueDate)}</strong>
                              <div className="today-badge">TODAY</div>
                            </td>
                            <td className="amount">
                              <strong>{formatCurrency(repayment.amount)}</strong>
                            </td>
                            <td>{loan ? `Loan #${(loan._id || loan.id).substring(0, 8)}` : 'N/A'}</td>
                            <td>
                              <span className={`repayment-type-badge type-${repayment.type}`}>
                                {repayment.type || 'regular'}
                              </span>
                            </td>
                            <td>
                              <span className={getStatusBadge(repayment.status)}>
                                {repayment.status}
                              </span>
                            </td>
                            <td>
                              <button 
                                className="btn btn-success btn-sm"
                                onClick={() => markRepaymentAsPaid(repayment._id || repayment.id)}
                                disabled={repaymentLoading === (repayment._id || repayment.id)}
                              >
                                {repaymentLoading === (repayment._id || repayment.id) ? '...' : 'Mark Paid'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">✅</div>
                  <h3>No Repayments Due Today</h3>
                  <p>All repayments are up to date for today.</p>
                </div>
              )}
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
};

// CORRECTED: Enhanced Loan Detail Card Component with accurate calculations
const LoanDetailCard = ({ 
  loan, 
  repayments, 
  calculateLoanProgress, 
  getEnhancedLoanStatus, 
  calculateTotalDue,
  calculateRemainingBalance,
  onMarkRepaymentPaid, 
  repaymentLoading 
}) => {
  const [showRepayments, setShowRepayments] = useState(false);

  const safeRepayments = Array.isArray(repayments) ? repayments : [];
  const progress = calculateLoanProgress(loan, safeRepayments);
  const enhancedStatus = getEnhancedLoanStatus(loan, safeRepayments);
  const totalDue = calculateTotalDue(loan);
  const remainingBalance = calculateRemainingBalance(loan, safeRepayments);
  
  const paidRepayments = safeRepayments.filter(r => r.status === 'paid');
  const pendingRepayments = safeRepayments.filter(r => r.status === 'pending');
  
  const totalPaid = paidRepayments.reduce((sum, r) => sum + (r.amount || 0), 0);
  const principal = loan.principal || 0;
  const interestRate = loan.interestRate || 0;

  const getStatusBadge = (status) => {
    const statusClasses = {
      active: 'status-active',
      completed: 'status-paid',
      defaulted: 'status-overdue',
      pending: 'status-pending'
    };
    return `status-badge ${statusClasses[status] || 'status-pending'}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount) => {
    return `₹${(amount || 0).toLocaleString()}`;
  };

  return (
    <div className="loan-card">
      <div className="loan-header">
        <div className="loan-basic-info">
          <h4>Loan #{loan._id ? loan._id.substring(0, 8) : (loan.id ? loan.id.substring(0, 8) : 'N/A')}</h4>
          <span className={getStatusBadge(enhancedStatus)}>
            {enhancedStatus.charAt(0).toUpperCase() + enhancedStatus.slice(1)}
          </span>
        </div>
        <div className="loan-amount">{formatCurrency(principal)}</div>
      </div>

      <div className="loan-details">
        <div className="detail-row">
          <span>Interest Rate:</span>
          <span>{interestRate}%</span>
        </div>
        <div className="detail-row">
          <span>Start Date:</span>
          <span>{formatDate(loan.startDate)}</span>
        </div>
        <div className="detail-row">
          <span>End Date:</span>
          <span>{formatDate(loan.endDate)}</span>
        </div>
        <div className="detail-row">
          <span>Loan Term:</span>
          <span>{loan.loanTerm || 6} months</span>
        </div>
        <div className="detail-row">
          <span>Repayment Schedule:</span>
          <span className={`repayment-type-badge type-${loan.repaymentSchedule}`}>
            {loan.repaymentSchedule || 'monthly'}
          </span>
        </div>
        {/* CORRECTED: Financial information */}
        <div className="detail-row">
          <span>Total Due:</span>
          <span>{formatCurrency(totalDue)}</span>
        </div>
        <div className="detail-row">
          <span>Total Paid:</span>
          <span>{formatCurrency(totalPaid)}</span>
        </div>
        <div className="detail-row">
          <span>Remaining:</span>
          <span>{formatCurrency(remainingBalance)}</span>
        </div>
        <div className="detail-row">
          <span>Repayments:</span>
          <span>{paidRepayments.length} paid, {pendingRepayments.length} pending</span>
        </div>
      </div>

      {/* CORRECTED: Progress Bar (capped at 100%) */}
      <div className="progress-section">
        <div className="progress-label">
          <span>Repayment Progress</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${Math.min(100, progress)}%` }}
          ></div>
        </div>
        {enhancedStatus === 'completed' && (
          <div className="completion-badge">Loan Fully Repaid</div>
        )}
      </div>

      {/* Repayments Section */}
      <div className="repayments-section">
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => setShowRepayments(!showRepayments)}
        >
          {showRepayments ? 'Hide' : 'Show'} Repayments ({safeRepayments.length})
        </button>

        {showRepayments && (
          <div className="repayments-list">
            <h5>Repayment History</h5>
            {safeRepayments.length > 0 ? (
              <div className="repayments-table-container">
                <table className="data-table small">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Due Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Type</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeRepayments.map(repayment => (
                      <tr key={repayment._id || repayment.id}>
                        <td>{formatDate(repayment.date || repayment.paymentDate)}</td>
                        <td>{formatDate(repayment.dueDate)}</td>
                        <td>{formatCurrency(repayment.amount)}</td>
                        <td>
                          <span className={getStatusBadge(repayment.status)}>
                            {repayment.status}
                          </span>
                        </td>
                        <td>
                          <span className={`repayment-type-badge type-${repayment.type}`}>
                            {repayment.type || 'regular'}
                          </span>
                        </td>
                        <td>
                          {repayment.status === 'pending' && onMarkRepaymentPaid && (
                            <button 
                              className="btn btn-success btn-sm"
                              onClick={() => onMarkRepaymentPaid(repayment._id || repayment.id)}
                              disabled={repaymentLoading === (repayment._id || repayment.id)}
                            >
                              {repaymentLoading === (repayment._id || repayment.id) ? '...' : 'Mark Paid'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-repayments-message">
                <p>No repayment records found for this loan.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BorrowerProfile;
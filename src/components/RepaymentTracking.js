import React, { useState, useEffect } from 'react';
import { repaymentAPI, loanAPI } from '../services/api';

const RepaymentTracking = ({ repayments = [], setRepayments, loans = [], borrowers = [], refreshData }) => {
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [repaymentTypeFilter, setRepaymentTypeFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [todayDate, setTodayDate] = useState('');
  const [showGenerateButton, setShowGenerateButton] = useState(false);

  const [formData, setFormData] = useState({
    loanId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    status: 'paid'
  });

  // Set today's date on component mount - FIXED DATE FORMAT
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setTodayDate(today);
    setFormData(prev => ({ ...prev, date: today }));
    console.log('📅 Today date set to:', today);
  }, []);

  // Check if we need to show generate button
  useEffect(() => {
    const hasActiveLoans = safeLoans.filter(loan => loan.status === 'active').length > 0;
    const hasTodaysRepayments = getTodaysPendingRepayments().length > 0;
    
    if (hasActiveLoans && !hasTodaysRepayments) {
      setShowGenerateButton(true);
    } else {
      setShowGenerateButton(false);
    }
  }, [loans, repayments]);

  // Safe arrays
  const safeRepayments = Array.isArray(repayments) ? repayments : [];
  const safeLoans = Array.isArray(loans) ? loans : [];
  const safeBorrowers = Array.isArray(borrowers) ? borrowers : [];

  // FIXED: Better borrower name and contact info
  const getBorrowerInfo = (repayment) => {
    // First try to get from repayment itself
    if (repayment.borrowerName && repayment.borrowerPhone) {
      return {
        name: repayment.borrowerName,
        phone: repayment.borrowerPhone
      };
    }
    
    // Find loan and then borrower
    const loan = safeLoans.find(l => 
      l._id === repayment.loanId || 
      l.id === repayment.loanId ||
      (repayment.loanId && repayment.loanId._id && l._id === repayment.loanId._id)
    );
    
    if (loan) {
      console.log('📋 Found loan for repayment:', loan);
      
      // Try to find borrower from loan data
      if (loan.borrowerName && loan.borrowerPhone) {
        return {
          name: loan.borrowerName,
          phone: loan.borrowerPhone,
          loanAmount: loan.principal
        };
      }
      
      // Find borrower from borrowers list
      if (loan.borrowerId) {
        const borrower = safeBorrowers.find(b => 
          b._id === loan.borrowerId || 
          b.id === loan.borrowerId ||
          (loan.borrowerId && loan.borrowerId._id && b._id === loan.borrowerId._id)
        );
        
        if (borrower) {
          console.log('👤 Found borrower:', borrower);
          return {
            name: borrower.name,
            phone: borrower.phone,
            loanAmount: loan.principal
          };
        }
      }
    }
    
    return {
      name: 'Unknown Borrower',
      phone: 'N/A',
      loanAmount: 0
    };
  };

  // FIXED: Better date comparison - handle different date formats
  const isToday = (dueDate) => {
    if (!dueDate) return false;
    
    const today = todayDate || new Date().toISOString().split('T')[0];
    
    // Handle different date formats
    let comparisonDate;
    if (typeof dueDate === 'string') {
      // If it's a full ISO string, extract just the date part
      if (dueDate.includes('T')) {
        comparisonDate = dueDate.split('T')[0];
      } else {
        comparisonDate = dueDate;
      }
    } else if (dueDate instanceof Date) {
      comparisonDate = dueDate.toISOString().split('T')[0];
    } else {
      return false;
    }
    
    console.log('📅 Date comparison:', { today, comparisonDate, dueDate });
    return comparisonDate === today;
  };

  // FIXED: Overdue detection
  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    
    const today = todayDate || new Date().toISOString().split('T')[0];
    
    let comparisonDate;
    if (typeof dueDate === 'string') {
      if (dueDate.includes('T')) {
        comparisonDate = dueDate.split('T')[0];
      } else {
        comparisonDate = dueDate;
      }
    } else if (dueDate instanceof Date) {
      comparisonDate = dueDate.toISOString().split('T')[0];
    } else {
      return false;
    }
    
    return comparisonDate < today;
  };

  // Filter repayments function
  const getFilteredRepayments = () => {
    let filtered = safeRepayments;

    console.log('🔍 Filtering repayments. Total:', filtered.length);
    console.log('📅 Today date for filtering:', todayDate);

    switch (activeTab) {
      case 'today':
        filtered = filtered.filter(repayment => {
          const isTodayRepayment = isToday(repayment.dueDate);
          const isPending = repayment.status === 'pending';
          console.log(`Repayment ${repayment._id}: dueDate=${repayment.dueDate}, isToday=${isTodayRepayment}, isPending=${isPending}`);
          return isTodayRepayment && isPending;
        });
        break;
      case 'paid':
        filtered = filtered.filter(repayment => repayment.status === 'paid');
        break;
      case 'overdue':
        filtered = filtered.filter(repayment => 
          isOverdue(repayment.dueDate) && 
          repayment.status === 'pending'
        );
        break;
      case 'all':
        break;
      default:
        filtered = filtered.filter(repayment => 
          isToday(repayment.dueDate) && 
          repayment.status === 'pending'
        );
    }

    if (repaymentTypeFilter !== 'all') {
      filtered = filtered.filter(repayment => repayment.type === repaymentTypeFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(repayment => {
        const borrowerInfo = getBorrowerInfo(repayment);
        return borrowerInfo.name.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    console.log('✅ Filtered repayments count:', filtered.length);
    return filtered;
  };

  const filteredRepayments = getFilteredRepayments();

  // FIXED: Generate repayments for all active loans
  const generateTodaysRepayments = async () => {
    setLoading(true);
    try {
      const activeLoans = safeLoans.filter(loan => loan.status === 'active');
      let allNewRepayments = [];
      
      console.log('🔄 Generating repayments for active loans:', activeLoans.length);
      
      for (const loan of activeLoans) {
        const borrower = safeBorrowers.find(b => 
          b._id === loan.borrowerId || 
          b.id === loan.borrowerId ||
          (loan.borrowerId && loan.borrowerId._id && b._id === loan.borrowerId._id)
        );
        
        if (borrower) {
          const repayments = await generateTodaysLoanRepayments(loan, borrower);
          allNewRepayments = [...allNewRepayments, ...repayments];
        }
      }
      
      // Batch update for better performance
      if (allNewRepayments.length > 0) {
        setRepayments(prev => {
          const updated = [...prev, ...allNewRepayments];
          console.log('✅ Updated repayments count:', updated.length);
          return updated;
        });
      }
      
      setShowGenerateButton(false);
      alert(`Successfully generated ${allNewRepayments.length} repayments due today for ${activeLoans.length} active loans!`);
      
      if (refreshData) {
        refreshData();
      }
    } catch (error) {
      console.error('Failed to generate repayments:', error);
      alert('Error generating repayments');
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Function to generate TODAY'S repayments for a single loan
  const generateTodaysLoanRepayments = async (loan, borrower) => {
    const repayments = [];
    const today = new Date().toISOString().split('T')[0];
    
    console.log('🔄 Generating repayment for loan:', loan._id, 'Borrower:', borrower.name);
    
    // Check if repayment already exists for today
    const existingRepayment = safeRepayments.find(repayment => {
      const repaymentLoanId = repayment.loanId?._id || repayment.loanId;
      const loanId = loan._id || loan.id;
      const isSameLoan = repaymentLoanId === loanId;
      const isTodayDue = isToday(repayment.dueDate);
      const isPending = repayment.status === 'pending';
      
      return isSameLoan && isTodayDue && isPending;
    });

    if (existingRepayment) {
      console.log('⚠️ Repayment already exists for today:', existingRepayment);
      return []; // Don't create duplicate
    }

    const principal = loan.principal || 0;
    const interestRate = loan.interestRate || 12;
    const loanTerm = loan.loanTerm || 6;
    const repaymentSchedule = loan.repaymentSchedule || 'monthly';
    
    console.log(`📊 Loan details: Principal=${principal}, Interest=${interestRate}, Term=${loanTerm}, Schedule=${repaymentSchedule}`);
    
    // Calculate payment amount based on schedule
    let paymentAmount;
    const totalAmount = principal + (principal * (interestRate / 100) * (loanTerm / 12));
    
    switch (repaymentSchedule) {
      case 'daily':
        paymentAmount = Math.round(totalAmount / (loanTerm * 30));
        break;
      case 'weekly':
        paymentAmount = Math.round(totalAmount / (loanTerm * 4));
        break;
      case 'monthly':
        paymentAmount = Math.round(totalAmount / loanTerm);
        break;
      default:
        paymentAmount = Math.round(totalAmount / loanTerm);
    }
    
    console.log(`💰 TODAY'S Payment: ₹${paymentAmount}`);
    
    const repaymentData = {
      loanId: loan._id || loan.id,
      borrowerId: borrower._id || borrower.id,
      borrowerName: borrower.name,
      borrowerPhone: borrower.phone,
      amount: paymentAmount,
      dueDate: today, // TODAY'S DATE in correct format
      status: 'pending',
      type: repaymentSchedule,
      installmentNumber: 1,
      totalInstallments: loanTerm,
      description: `${repaymentSchedule} installment due today`,
      createdAt: new Date().toISOString()
    };
    
    try {
      const repayment = await repaymentAPI.create(repaymentData);
      repayments.push(repayment);
      console.log(`✅ Created TODAY'S repayment: ${repayment._id} for ${today}`);
    } catch (error) {
      console.error('Failed to create repayment:', error);
    }
    
    return repayments;
  };

  // Handle manual repayment submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const loan = safeLoans.find(l => l._id === formData.loanId || l.id === formData.loanId);
    if (!loan) {
      alert('Please select a valid loan');
      return;
    }
    
    setLoading(true);
    try {
      const borrower = safeBorrowers.find(b => 
        b._id === loan.borrowerId || b.id === loan.borrowerId
      );
      
      const newRepayment = await repaymentAPI.create({
        loanId: loan._id || loan.id,
        borrowerId: borrower?._id || borrower?.id,
        borrowerName: borrower?.name || 'Unknown',
        borrowerPhone: borrower?.phone || 'N/A',
        amount: parseFloat(formData.amount),
        date: formData.date,
        dueDate: formData.date,
        status: formData.status,
        type: 'manual',
        description: 'Manual payment'
      });

      setRepayments(prev => [...prev, newRepayment]);
      handleCloseForm();
      
      if (refreshData) {
        refreshData();
      }
      
      alert('Repayment recorded successfully!');
    } catch (error) {
      console.error('Failed to record repayment:', error);
      alert(`Error: ${error.message || 'Failed to record repayment'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setFormData({
      loanId: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      status: 'paid'
    });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Mark repayment as paid
  const markAsPaid = async (repaymentId) => {
    setLoading(true);
    try {
      await repaymentAPI.markAsPaid(repaymentId);
      
      const updatedRepayments = safeRepayments.map(repayment => 
        (repayment._id === repaymentId || repayment.id === repaymentId) 
          ? { 
              ...repayment, 
              status: 'paid', 
              date: new Date().toISOString().split('T')[0],
              paymentDate: new Date().toISOString().split('T')[0]
            }
          : repayment
      );

      setRepayments(updatedRepayments);
      
      if (refreshData) {
        refreshData();
      }
      
      alert('Repayment marked as paid successfully!');
    } catch (error) {
      console.error('Failed to mark repayment as paid:', error);
      alert(`Error: ${error.message || 'Failed to mark repayment as paid'}`);
    } finally {
      setLoading(false);
    }
  };

  // Mark multiple repayments as paid
  const markMultipleAsPaid = async (repaymentIds) => {
    if (repaymentIds.length === 0) return;

    setLoading(true);
    try {
      await repaymentAPI.markMultipleAsPaid(repaymentIds);
      
      const updatedRepayments = safeRepayments.map(repayment => 
        repaymentIds.includes(repayment._id || repayment.id)
          ? { 
              ...repayment, 
              status: 'paid', 
              date: new Date().toISOString().split('T')[0],
              paymentDate: new Date().toISOString().split('T')[0]
            }
          : repayment
      );

      setRepayments(updatedRepayments);
      
      if (refreshData) {
        refreshData();
      }
      
      alert(`${repaymentIds.length} repayments marked as paid successfully!`);
    } catch (error) {
      console.error('Failed to mark repayments as paid:', error);
      alert(`Error: ${error.message || 'Failed to mark repayments as paid'}`);
    } finally {
      setLoading(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusClasses = {
      paid: 'status-paid',
      pending: 'status-pending',
      overdue: 'status-overdue'
    };
    
    return `status-badge ${statusClasses[status] || 'status-pending'}`;
  };

  // Get today's pending repayments
  const getTodaysPendingRepayments = () => {
    const todayRepayments = safeRepayments.filter(repayment => 
      repayment.status === 'pending' && 
      isToday(repayment.dueDate)
    );
    console.log('📅 Today\'s pending repayments:', todayRepayments.length);
    return todayRepayments;
  };

  // Get overdue repayments
  const getOverdueRepayments = () => {
    return safeRepayments.filter(repayment => 
      repayment.status === 'pending' && 
      isOverdue(repayment.dueDate)
    );
  };

  const todaysPending = getTodaysPendingRepayments();
  const overdueRepaymentsList = getOverdueRepayments();
  const paidRepayments = safeRepayments.filter(r => r.status === 'paid');

  // Calculate stats
  const totalTodaysAmount = todaysPending.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalOverdueAmount = overdueRepaymentsList.reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div className="repayments-page">
      <div className="page-header">
        <h1 className="page-title">Repayment Tracking</h1>
        <div className="header-actions">
          {showGenerateButton && (
            <button 
              className="btn btn-warning"
              onClick={generateTodaysRepayments}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Today\'s Repayments'}
            </button>
          )}
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Record Manual Repayment'}
          </button>
        </div>
      </div>

      {/* Current Date Display */}
      <div className="current-date-banner" style={{ 
        background: '#e3f2fd', 
        padding: '10px 15px', 
        marginBottom: '15px', 
        borderRadius: '4px', 
        borderLeft: '4px solid #2196f3'
      }}>
        <strong>📅 Today's Date:</strong> {new Date().toLocaleDateString('en-IN', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
        <span style={{marginLeft: '15px', color: '#666'}}>
          Displaying repayments due today only
        </span>
      </div>

      {/* Debug Info */}
      <div className="debug-info" style={{ 
        padding: '8px 12px', 
        background: '#f8f9fa', 
        marginBottom: '15px', 
        borderRadius: '4px', 
        fontSize: '0.8rem',
        border: '1px solid #e9ecef'
      }}>
        <strong>Debug Info:</strong> 
        <span style={{margin: '0 10px'}}>📅 Today: {todayDate}</span>
        <span style={{margin: '0 10px'}}>📊 Total repayments: {safeRepayments.length}</span>
        <span style={{margin: '0 10px'}}>🔍 Filtered: {filteredRepayments.length}</span>
        
        {safeRepayments.length > 0 && (
          <div style={{marginTop: '5px'}}>
            <small>Sample due dates: {safeRepayments.slice(0, 3).map(r => r.dueDate).join(', ')}</small>
          </div>
        )}
      </div>

      {/* Summary Info */}
      <div className="summary-info" style={{ 
        padding: '8px 12px', 
        background: '#fff3cd', 
        marginBottom: '15px', 
        borderRadius: '4px', 
        fontSize: '0.9rem',
        border: '1px solid #ffeaa7'
      }}>
        <strong>Summary:</strong> 
        <span style={{margin: '0 10px'}}>📅 <strong>{todaysPending.length}</strong> due today</span>
        <span style={{margin: '0 10px'}}>⚠️ <strong>{overdueRepaymentsList.length}</strong> overdue</span>
        <span style={{margin: '0 10px'}}>✅ <strong>{paidRepayments.length}</strong> paid</span>
        <span style={{margin: '0 10px'}}>📊 <strong>{safeRepayments.length}</strong> total</span>
        
        {showGenerateButton && (
          <span style={{color: '#dc3545', marginLeft: '15px'}}>
            ⚠️ No repayments generated for today
          </span>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          Today's Due ({todaysPending.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'overdue' ? 'active' : ''}`}
          onClick={() => setActiveTab('overdue')}
        >
          Overdue ({overdueRepaymentsList.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'paid' ? 'active' : ''}`}
          onClick={() => setActiveTab('paid')}
        >
          Paid Repayments ({paidRepayments.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Repayments ({safeRepayments.length})
        </button>
      </div>

      {/* Search and Filter */}
      <div className="search-filter">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by borrower name..."
            className="form-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="filter-group">
          <select 
            className="form-select"
            value={repaymentTypeFilter}
            onChange={(e) => setRepaymentTypeFilter(e.target.value)}
            disabled={loading}
          >
            <option value="all">All Types</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="manual">Manual</option>
          </select>
        </div>
      </div>

      {/* Repayments Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Borrower</th>
              <th>Contact</th>
              <th>Loan Amount</th>
              <th>Due Amount</th>
              <th>Due Date</th>
              <th>Schedule</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRepayments.map(repayment => {
              const overdue = isOverdue(repayment.dueDate);
              const isTodayDate = isToday(repayment.dueDate);
              const borrowerInfo = getBorrowerInfo(repayment);
              
              console.log('📋 Rendering repayment:', {
                id: repayment._id,
                dueDate: repayment.dueDate,
                isToday: isTodayDate,
                borrowerInfo
              });
              
              return (
                <tr key={repayment._id || repayment.id} className={overdue ? 'row-overdue' : isTodayDate ? 'row-today' : ''}>
                  <td>
                    <div className="borrower-info">
                      <strong>{borrowerInfo.name}</strong>
                    </div>
                  </td>
                  <td>
                    {borrowerInfo.phone}
                  </td>
                  <td className="amount">₹{borrowerInfo.loanAmount.toLocaleString()}</td>
                  <td className="amount">
                    <strong>₹{(repayment.amount || 0).toLocaleString()}</strong>
                  </td>
                  <td>
                    <span className={overdue ? 'date-overdue' : isTodayDate ? 'date-today' : ''}>
                      {repayment.dueDate ? new Date(repayment.dueDate).toLocaleDateString('en-IN') : 'Not set'}
                      {isTodayDate && <span className="today-badge">TODAY</span>}
                      {overdue && <span className="overdue-badge">OVERDUE</span>}
                    </span>
                  </td>
                  <td>
                    <span className={`repayment-type-badge type-${repayment.type}`}>
                      {repayment.type || 'monthly'}
                    </span>
                    {repayment.installmentNumber && (
                      <small style={{display: 'block', color: '#666', fontSize: '0.7rem'}}>
                        Installment {repayment.installmentNumber}/{repayment.totalInstallments}
                      </small>
                    )}
                  </td>
                  <td>
                    <span className={getStatusBadge(repayment.status)}>
                      {repayment.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {repayment.status === 'pending' && (
                        <button 
                          className="btn btn-success btn-sm"
                          onClick={() => markAsPaid(repayment._id || repayment.id)}
                          disabled={loading}
                        >
                          Mark Paid
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredRepayments.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">
              {activeTab === 'today' ? '📅' : 
               activeTab === 'paid' ? '✅' : 
               activeTab === 'overdue' ? '⚠️' : '📊'}
            </div>
            <h3>
              {activeTab === 'today' ? 'No repayments due today' : 
               activeTab === 'paid' ? 'No paid repayments' : 
               activeTab === 'overdue' ? 'No overdue repayments' : 'No repayments found'}
            </h3>
            <p>
              {activeTab === 'today' ? 'All caught up! No repayments are due today.' :
               activeTab === 'paid' ? 'No repayment history available yet.' :
               activeTab === 'overdue' ? 'Great! No repayments are overdue.' :
               'Try adjusting your search or filters.'}
            </p>
            {activeTab === 'today' && showGenerateButton && (
              <button 
                className="btn btn-primary"
                onClick={generateTodaysRepayments}
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate Today\'s Repayments'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Manual Repayment Form */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Record Manual Repayment</h2>
              <button className="close-btn" onClick={handleCloseForm} disabled={loading}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Select Loan</label>
                <select
                  name="loanId"
                  className="form-select"
                  value={formData.loanId}
                  onChange={handleChange}
                  required
                  disabled={loading}
                >
                  <option value="">Choose a loan...</option>
                  {safeLoans.filter(loan => loan.status === 'active').map(loan => {
                    const borrower = safeBorrowers.find(b => b._id === loan.borrowerId || b.id === loan.borrowerId);
                    return (
                      <option key={loan._id || loan.id} value={loan._id || loan.id}>
                        {borrower?.name || 'Unknown'} - ₹{loan.principal} ({loan.repaymentSchedule})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input
                    type="number"
                    name="amount"
                    className="form-input"
                    value={formData.amount}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Date</label>
                  <input
                    type="date"
                    name="date"
                    className="form-input"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  name="status"
                  className="form-select"
                  value={formData.status}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div className="action-buttons">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Recording...' : 'Record Repayment'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleCloseForm} disabled={loading}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepaymentTracking;
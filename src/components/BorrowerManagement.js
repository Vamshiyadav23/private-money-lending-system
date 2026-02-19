import React, { useState } from 'react';
import { borrowerAPI, loanAPI, repaymentAPI } from '../services/api';
import BorrowerProfile from './BorrowerProfile';

const BorrowerManagement = ({ 
  borrowers = [], 
  setBorrowers, 
  loans = [], 
  setLoans, 
  repayments = [],
  setRepayments,
  refreshData 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [selectedBorrower, setSelectedBorrower] = useState(null);
  const [activeTab, setActiveTab] = useState('borrowers');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    idProof: '',
    principal: '',
    interestRate: '12',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    repaymentSchedule: 'monthly',
    loanTerm: 6
  });

  const safeBorrowers = Array.isArray(borrowers) ? borrowers : [];
  const safeLoans = Array.isArray(loans) ? loans : [];
  const safeRepayments = Array.isArray(repayments) ? repayments : [];

  // Filter borrowers for search
  const filteredBorrowers = safeBorrowers.filter(borrower => {
    return borrower.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           borrower.email.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Get today's pending repayments
  const getTodaysPendingRepayments = () => {
    const today = new Date().toISOString().split('T')[0];
    return safeRepayments.filter(repayment => 
      repayment.status === 'pending' && 
      repayment.dueDate === today
    );
  };

  // Get overdue repayments
  const getOverdueRepayments = () => {
    const today = new Date().toISOString().split('T')[0];
    return safeRepayments.filter(repayment => 
      repayment.status === 'pending' && 
      repayment.dueDate < today
    );
  };

  const todaysPending = getTodaysPendingRepayments();
  const overdueRepayments = getOverdueRepayments();

  const calculateEndDate = (startDate, months) => {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + parseInt(months));
    return date.toISOString().split('T')[0];
  };

  const handleBorrowerSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.phone) {
      alert('Please fill in all required borrower details');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      endDate: calculateEndDate(prev.startDate, prev.loanTerm)
    }));
    
    setCurrentStep(2);
  };

  const handleLoanSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.principal || !formData.interestRate || !formData.endDate) {
      alert('Please fill in all required loan details');
      return;
    }

    setLoading(true);

    try {
      const newBorrower = await borrowerAPI.create({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        idProof: formData.idProof,
      });

      const newLoan = await loanAPI.create({
        borrowerId: newBorrower._id || newBorrower.id,
        borrowerName: formData.name,
        principal: parseFloat(formData.principal),
        interestRate: parseFloat(formData.interestRate),
        startDate: formData.startDate,
        loanTerm: parseInt(formData.loanTerm),
        repaymentSchedule: formData.repaymentSchedule,
        status: 'active'
      });

      setBorrowers(prev => [...prev, newBorrower]);
      setLoans(prev => [...prev, newLoan]);

      if (refreshData) {
        refreshData();
      }

      handleCloseForm();
      alert('Borrower and loan created successfully!');
      
    } catch (error) {
      console.error('Failed to create borrower/loan:', error);
      alert(`Error: ${error.message || 'Failed to create borrower and loan'}`);
    } finally {
      setLoading(false);
    }
  };

  // Generate today's repayments for all active loans
  const generateTodaysRepayments = async () => {
    setLoading(true);
    try {
      const activeLoans = safeLoans.filter(loan => loan.status === 'active');
      let totalGenerated = 0;
      
      for (const loan of activeLoans) {
        const borrower = safeBorrowers.find(b => 
          b._id === loan.borrowerId || b.id === loan.borrowerId
        );
        
        if (borrower) {
          const repayments = await generateTodaysLoanRepayments(loan, borrower);
          totalGenerated += repayments.length;
          
          setRepayments(prev => [...prev, ...repayments]);
        }
      }
      
      alert(`Successfully generated ${totalGenerated} repayments due today for ${activeLoans.length} active loans!`);
      
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

  // Function to generate TODAY'S repayments for a single loan
  const generateTodaysLoanRepayments = async (loan, borrower) => {
    const repayments = [];
    const today = new Date().toISOString().split('T')[0];
    
    // Check if repayment already exists for today
    const existingRepayment = safeRepayments.find(repayment => 
      repayment.loanId === (loan._id || loan.id) && 
      repayment.dueDate === today &&
      repayment.status === 'pending'
    );

    if (existingRepayment) {
      return [];
    }

    const principal = loan.principal || 0;
    const interestRate = loan.interestRate || 12;
    const loanTerm = loan.loanTerm || 6;
    const repaymentSchedule = loan.repaymentSchedule || 'monthly';
    
    // Calculate payment amount
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
    
    const repaymentData = {
      loanId: loan._id || loan.id,
      borrowerId: borrower._id || borrower.id,
      borrowerName: borrower.name,
      borrowerPhone: borrower.phone,
      amount: paymentAmount,
      dueDate: today,
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
    } catch (error) {
      console.error('Failed to create repayment:', error);
    }
    
    return repayments;
  };

  // Mark repayment as paid
  const markRepaymentAsPaid = async (repaymentId) => {
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

  const handleDeleteBorrower = async (borrowerId, borrowerName) => {
    const borrowerIdStr = borrowerId.toString();
    
    const borrowerActiveLoans = safeLoans.filter(loan => {
      const loanBorrowerId = loan.borrowerId?._id || loan.borrowerId;
      return (loanBorrowerId === borrowerIdStr || loanBorrowerId?.toString() === borrowerIdStr) && 
             loan.status === 'active';
    });

    if (borrowerActiveLoans.length > 0) {
      const loanCount = borrowerActiveLoans.length;
      const loanAmounts = borrowerActiveLoans.map(loan => `₹${loan.principal?.toLocaleString()}`).join(', ');
      
      if (!window.confirm(
        `Cannot delete borrower "${borrowerName}" because they have ${loanCount} active loan(s).\n\n` +
        `Active Loans: ${loanAmounts}\n\n` +
        `Please close or transfer all active loans before deleting this borrower.`
      )) {
        return;
      }
      
      alert(`Please close the ${loanCount} active loan(s) before deleting this borrower.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete borrower "${borrowerName}"? This action cannot be undone.`)) {
      return;
    }

    setDeleteLoading(borrowerId);

    try {
      await borrowerAPI.delete(borrowerId);
      
      setBorrowers(prev => prev.filter(borrower => 
        (borrower._id !== borrowerId && borrower.id !== borrowerId)
      ));

      setLoans(prev => prev.filter(loan => 
        (loan.borrowerId !== borrowerId && loan.borrowerId?._id !== borrowerId)
      ));

      alert('Borrower deleted successfully!');
      
      if (refreshData) {
        refreshData();
      }
    } catch (error) {
      console.error('Failed to delete borrower:', error);
      
      if (error.message.includes('active loans')) {
        alert(`Cannot delete borrower: ${borrowerName} has active loans. Please close all loans first.`);
      } else {
        alert(`Error: ${error.message || 'Failed to delete borrower'}`);
      }
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleViewProfile = (borrower) => {
    setSelectedBorrower(borrower);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setCurrentStep(1);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      idProof: '',
      principal: '',
      interestRate: '12',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      repaymentSchedule: 'monthly',
      loanTerm: 6
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      if (name === 'startDate' || name === 'loanTerm') {
        updated.endDate = calculateEndDate(
          name === 'startDate' ? value : prev.startDate,
          name === 'loanTerm' ? value : prev.loanTerm
        );
      }
      
      return updated;
    });
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  // Helper function to get borrower info for repayment
  const getBorrowerInfoForRepayment = (repayment) => {
    if (repayment.borrowerName && repayment.borrowerPhone) {
      return {
        name: repayment.borrowerName,
        phone: repayment.borrowerPhone
      };
    }
    
    const loan = safeLoans.find(l => l._id === repayment.loanId || l.id === repayment.loanId);
    if (loan) {
      return {
        name: loan.borrowerName || 'Unknown',
        phone: loan.borrowerPhone || 'N/A',
        loanAmount: loan.principal || 0
      };
    }
    
    return { name: 'Unknown Borrower', phone: 'N/A', loanAmount: 0 };
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      paid: 'status-paid',
      pending: 'status-pending',
      overdue: 'status-overdue'
    };
    return `status-badge ${statusClasses[status] || 'status-pending'}`;
  };

  return (
    <div className="borrowers-page">
      <div className="page-header">
        <h1 className="page-title">Borrower & Loan Management</h1>
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Add Borrower & Create Loan'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'borrowers' ? 'active' : ''}`}
          onClick={() => setActiveTab('borrowers')}
        >
          👥 Borrowers ({safeBorrowers.length})
        </button>
        {/* <button 
          className={`tab-btn ${activeTab === 'repayments' ? 'active' : ''}`}
          onClick={() => setActiveTab('repayments')}
        >
          📅 Today's Due ({todaysPending.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'overdue' ? 'active' : ''}`}
          onClick={() => setActiveTab('overdue')}
        >
          ⚠️ Overdue ({overdueRepayments.length})
        </button> */}
      </div>

      {/* Quick Actions for Repayments */}
      {(activeTab === 'repayments' || activeTab === 'overdue') && (
        <div className="quick-actions-section">
          <div className="quick-action-card">
            <div className="action-content">
              <h4>Repayment Actions</h4>
              <p>Manage repayments efficiently</p>
              <div className="action-buttons">
                <button 
                  className="btn btn-warning"
                  onClick={generateTodaysRepayments}
                  disabled={loading}
                >
                  {loading ? 'Generating...' : 'Generate Today\'s Repayments'}
                </button>
                {activeTab === 'repayments' && todaysPending.length > 0 && (
                  <button 
                    className="btn btn-success"
                    onClick={() => markMultipleAsPaid(todaysPending.map(r => r._id || r.id))}
                    disabled={loading}
                  >
                    Mark All Today's as Paid
                  </button>
                )}
                {activeTab === 'overdue' && overdueRepayments.length > 0 && (
                  <button 
                    className="btn btn-success"
                    onClick={() => markMultipleAsPaid(overdueRepayments.map(r => r._id || r.id))}
                    disabled={loading}
                  >
                    Mark All Overdue as Paid
                  </button>
                )}
              </div>
            </div>
            <div className="action-icon">💰</div>
          </div>
        </div>
      )}

      {/* Borrowers Tab Content */}
      {activeTab === 'borrowers' && (
        <>
          <div className="search-filter">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search borrowers by name or email..."
                className="form-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Address</th>
                  <th>ID Proof</th>
                  <th>Active Loans</th>
                  <th>Total Borrowed</th>
                  <th>Joined Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBorrowers.map(borrower => {
                  const borrowerLoans = safeLoans.filter(loan => 
                    loan.borrowerId === borrower._id || 
                    loan.borrowerId === borrower.id || 
                    loan.borrowerId?._id === borrower._id
                  );
                  const activeLoans = borrowerLoans.filter(loan => loan.status === 'active');
                  const totalBorrowed = borrowerLoans.reduce((sum, loan) => sum + (loan.principal || 0), 0);
                  
                  return (
                    <tr key={borrower._id || borrower.id}>
                      <td>
                        <div className="borrower-info">
                          <strong>{borrower.name}</strong>
                          <br />
                          <small>{borrower.email}</small>
                        </div>
                      </td>
                      <td>{borrower.phone}</td>
                      <td>{borrower.address || 'Not provided'}</td>
                      <td>{borrower.idProof || 'Not provided'}</td>
                      <td>
                        <span className="loan-count">{activeLoans.length} active</span>
                      </td>
                      <td className="amount">₹{totalBorrowed.toLocaleString()}</td>
                      <td>
                        {borrower.createdAt ? new Date(borrower.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleViewProfile(borrower)}
                          >
                            View Profile
                          </button>
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteBorrower(borrower._id || borrower.id, borrower.name)}
                            disabled={deleteLoading === (borrower._id || borrower.id)}
                          >
                            {deleteLoading === (borrower._id || borrower.id) ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {filteredBorrowers.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">👥</div>
                <h3>No borrowers found</h3>
                <p>Try adjusting your search or add a new borrower.</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowForm(true)}
                >
                  Add New Borrower
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Today's Repayments Tab Content
      {activeTab === 'repayments' && (
        <div className="repayments-section">
          <div className="section-header">
            <h3>📅 Today's Due Repayments</h3>
            <p>Repayments due on {new Date().toLocaleDateString('en-IN', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
          </div>
          
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Borrower</th>
                  <th>Contact</th>
                  <th>Loan Amount</th>
                  <th>Due Amount</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {todaysPending.map(repayment => {
                  const borrowerInfo = getBorrowerInfoForRepayment(repayment);
                  return (
                    <tr key={repayment._id || repayment.id} className="row-today">
                      <td>
                        <strong>{borrowerInfo.name}</strong>
                      </td>
                      <td>{borrowerInfo.phone}</td>
                      <td className="amount">₹{borrowerInfo.loanAmount.toLocaleString()}</td>
                      <td className="amount">
                        <strong>₹{(repayment.amount || 0).toLocaleString()}</strong>
                      </td>
                      <td>
                        <span className={`repayment-type-badge type-${repayment.type}`}>
                          {repayment.type || 'monthly'}
                        </span>
                      </td>
                      <td>
                        <span className={getStatusBadge(repayment.status)}>
                          {repayment.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-success btn-sm"
                          onClick={() => markRepaymentAsPaid(repayment._id || repayment.id)}
                          disabled={loading}
                        >
                          Mark Paid
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {todaysPending.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <h3>No repayments due today</h3>
                <p>All caught up! No repayments are due today.</p>
                <button 
                  className="btn btn-primary"
                  onClick={generateTodaysRepayments}
                  disabled={loading}
                >
                  {loading ? 'Generating...' : 'Generate Today\'s Repayments'}
                </button>
              </div>
            )}
          </div>
        </div>
      )} */}

      {/* Overdue Repayments Tab Content
      {activeTab === 'overdue' && (
        <div className="repayments-section">
          <div className="section-header">
            <h3>⚠️ Overdue Repayments</h3>
            <p>Repayments that are past their due date</p>
          </div>
          
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Borrower</th>
                  <th>Contact</th>
                  <th>Due Amount</th>
                  <th>Due Date</th>
                  <th>Days Overdue</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {overdueRepayments.map(repayment => {
                  const borrowerInfo = getBorrowerInfoForRepayment(repayment);
                  const dueDate = new Date(repayment.dueDate);
                  const today = new Date();
                  const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <tr key={repayment._id || repayment.id} className="row-overdue">
                      <td>
                        <strong>{borrowerInfo.name}</strong>
                      </td>
                      <td>{borrowerInfo.phone}</td>
                      <td className="amount">
                        <strong>₹{(repayment.amount || 0).toLocaleString()}</strong>
                      </td>
                      <td className="date-overdue">
                        {dueDate.toLocaleDateString('en-IN')}
                      </td>
                      <td>
                        <span className="overdue-badge">{daysOverdue} days</span>
                      </td>
                      <td>
                        <span className={getStatusBadge(repayment.status)}>
                          {repayment.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-success btn-sm"
                          onClick={() => markRepaymentAsPaid(repayment._id || repayment.id)}
                          disabled={loading}
                        >
                          Mark Paid
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {overdueRepayments.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <h3>No overdue repayments</h3>
                <p>Great! All repayments are up to date.</p>
              </div>
            )}
          </div>
        </div>
      )} */}

      {/* Add Borrower & Loan Form */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {currentStep === 1 ? 'Add Borrower Details' : 'Create Loan Details'}
              </h2>
              <button className="close-btn" onClick={handleCloseForm} disabled={loading}>×</button>
            </div>

            <div className="step-indicator">
              <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
                <span>1</span>
                <small>Borrower Info</small>
              </div>
              <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
                <span>2</span>
                <small>Loan Details</small>
              </div>
            </div>

            <form onSubmit={currentStep === 1 ? handleBorrowerSubmit : handleLoanSubmit}>
              {currentStep === 1 && (
                <div className="form-step">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      className="form-input"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input
                        type="email"
                        name="email"
                        className="form-input"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone *</label>
                      <input
                        type="tel"
                        name="phone"
                        className="form-input"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Address</label>
                    <textarea
                      name="address"
                      className="form-textarea"
                      value={formData.address}
                      onChange={handleChange}
                      rows="3"
                      disabled={loading}
                      placeholder="Full residential address"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">ID Proof Number</label>
                    <input
                      type="text"
                      name="idProof"
                      className="form-input"
                      value={formData.idProof}
                      onChange={handleChange}
                      placeholder="Aadhar, PAN, Driver's License, etc."
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="form-step">
                  <div className="borrower-summary">
                    <h4>Borrower: {formData.name}</h4>
                    <div className="borrower-details">
                      <p>Contact: <strong>{formData.phone}</strong></p>
                      <p>Email: <strong>{formData.email}</strong></p>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Principal Amount (₹) *</label>
                      <input
                        type="number"
                        name="principal"
                        className="form-input"
                        value={formData.principal}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Interest Rate (%) *</label>
                      <input
                        type="number"
                        name="interestRate"
                        className="form-input"
                        value={formData.interestRate}
                        onChange={handleChange}
                        min="0"
                        step="0.1"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Start Date *</label>
                      <input
                        type="date"
                        name="startDate"
                        className="form-input"
                        value={formData.startDate}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Loan Term (Months) *</label>
                      <select
                        name="loanTerm"
                        className="form-select"
                        value={formData.loanTerm}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      >
                        <option value="1">1 Month</option>
                        <option value="3">3 Months</option>
                        <option value="6">6 Months</option>
                        <option value="12">12 Months</option>
                        <option value="24">24 Months</option>
                        <option value="36">36 Months</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">End Date</label>
                      <input
                        type="date"
                        name="endDate"
                        className="form-input"
                        value={formData.endDate}
                        onChange={handleChange}
                        readOnly
                        style={{ backgroundColor: '#f8f9fa' }}
                        disabled={loading}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Repayment Schedule</label>
                      <select
                        name="repaymentSchedule"
                        className="form-select"
                        value={formData.repaymentSchedule}
                        onChange={handleChange}
                        disabled={loading}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>

                  {formData.principal && formData.interestRate && (
                    <div className="loan-summary">
                      <h4>Loan Summary</h4>
                      <div className="summary-grid">
                        <div className="summary-item">
                          <span>Total Principal:</span>
                          <strong>₹{parseFloat(formData.principal).toLocaleString()}</strong>
                        </div>
                        <div className="summary-item">
                          <span>Interest Rate:</span>
                          <strong>{formData.interestRate}%</strong>
                        </div>
                        <div className="summary-item">
                          <span>Total Interest:</span>
                          <strong>₹{(parseFloat(formData.principal) * (parseFloat(formData.interestRate)/100) * (parseInt(formData.loanTerm)/12)).toFixed(2)}</strong>
                        </div>
                        <div className="summary-item total">
                          <span>Total Amount Due:</span>
                          <strong>₹{(parseFloat(formData.principal) + (parseFloat(formData.principal) * (parseFloat(formData.interestRate)/100) * (parseInt(formData.loanTerm)/12))).toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="action-buttons" style={{ marginTop: '20px', justifyContent: 'space-between' }}>
                <div>
                  {currentStep === 2 && (
                    <button type="button" className="btn btn-secondary" onClick={handleBack} disabled={loading}>
                      ← Back to Borrower Details
                    </button>
                  )}
                </div>
                <div>
                  <button type="button" className="btn btn-secondary" onClick={handleCloseForm} disabled={loading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ marginLeft: '10px' }} disabled={loading}>
                    {loading ? 'Creating...' : currentStep === 1 ? 'Next → Loan Details' : 'Create Borrower & Loan'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Borrower Profile Modal */}
      {selectedBorrower && (
        <BorrowerProfile
          borrower={selectedBorrower}
          loans={loans}
          repayments={safeRepayments}
          onClose={() => setSelectedBorrower(null)}
          refreshData={refreshData}
        />
      )}
    </div>
  );
};

export default BorrowerManagement;
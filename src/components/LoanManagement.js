import React, { useState } from 'react';

const LoanManagement = ({ loans, setLoans, borrowers }) => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    borrowerId: '',
    principal: '',
    interestRate: '',
    startDate: '',
    endDate: '',
    repaymentSchedule: 'monthly'
  });

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.borrowerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
/*Total Due Calculation*/
  const calculateTotalDue = (principal, interestRate, months) => {
    const principalAmount = parseFloat(principal);
    const rate = parseFloat(interestRate) / 100;
    const timeInYears = months / 12;
    return principalAmount + (principalAmount * rate * timeInYears);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const borrower = borrowers.find(b => b.id === parseInt(formData.borrowerId));
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    
    const totalDue = calculateTotalDue(formData.principal, formData.interestRate, months);

    const newLoan = {
      id: Date.now(),
      borrowerId: parseInt(formData.borrowerId),
      borrowerName: borrower.name,
      principal: parseFloat(formData.principal),
      interestRate: parseFloat(formData.interestRate),
      startDate: formData.startDate,
      endDate: formData.endDate,
      repaymentSchedule: formData.repaymentSchedule,
      status: 'active',
      totalDue: totalDue,
      paidAmount: 0,
      remainingAmount: totalDue,
      createdAt: new Date().toISOString()
    };

    setLoans([...loans, newLoan]);
    handleCloseForm();
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setFormData({
      borrowerId: '',
      principal: '',
      interestRate: '',
      startDate: '',
      endDate: '',
      repaymentSchedule: 'monthly'
    });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const markAsCompleted = (loanId) => {
    setLoans(loans.map(loan => 
      loan.id === loanId ? { ...loan, status: 'completed' } : loan
    ));
  };

  return (
    <div className="loans-page">
      <div className="page-header">
        <h1 className="page-title">Loan Management</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          Create New Loan
        </button>
      </div>

      {/* Search and Filter */}
      <div className="search-filter">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search loans..."
            className="form-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select 
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="defaulted">Defaulted</option>
          </select>
        </div>
      </div>

      {/* Loans Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Borrower</th>
              <th>Principal</th>
              <th>Interest Rate</th>
              <th>Total Due</th>
              <th>Schedule</th>
              <th>Status</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLoans.map(loan => (
              <tr key={loan.id}>
                <td>
                  <div className="borrower-info">
                    <strong>{loan.borrowerName}</strong>
                  </div>
                </td>
                <td>${loan.principal.toLocaleString()}</td>
                <td>{loan.interestRate}%</td>
                <td>${loan.totalDue.toLocaleString()}</td>
                <td>
                  <span className="status-badge">
                    {loan.repaymentSchedule}
                  </span>
                </td>
                <td>
                  <span className={`status-badge status-₹{loan.status}`}>
                    {loan.status}
                  </span>
                </td>
                <td>{loan.startDate}</td>
                <td>{loan.endDate}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn btn-secondary btn-sm">
                      View Details
                    </button>
                    {loan.status === 'active' && (
                      <button 
                        className="btn btn-success btn-sm"
                        onClick={() => markAsCompleted(loan.id)}
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredLoans.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">💰</div>
            <h3>No loans found</h3>
            <p>Try adjusting your search or create a new loan.</p>
          </div>
        )}
      </div>

      {/* Create Loan Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Create New Loan</h2>
              <button className="close-btn" onClick={handleCloseForm}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Select Borrower</label>
                <select
                  name="borrowerId"
                  className="form-select"
                  value={formData.borrowerId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Choose a borrower...</option>
                  {borrowers.map(borrower => (
                    <option key={borrower.id} value={borrower.id}>
                      {borrower.name} - {borrower.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Principal Amount ($)</label>
                  <input
                    type="number"
                    name="principal"
                    className="form-input"
                    value={formData.principal}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Interest Rate (%)</label>
                  <input
                    type="number"
                    name="interestRate"
                    className="form-input"
                    value={formData.interestRate}
                    onChange={handleChange}
                    min="0"
                    step="0.1"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    className="form-input"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    className="form-input"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Repayment Schedule</label>
                <select
                  name="repaymentSchedule"
                  className="form-select"
                  value={formData.repaymentSchedule}
                  onChange={handleChange}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div className="action-buttons" style={{ marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary">
                  Create Loan
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleCloseForm}>
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

export default LoanManagement;
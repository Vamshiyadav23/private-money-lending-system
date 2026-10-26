
import React, { useState, useEffect } from 'react';
import './styles/App.css';
import './styles/components.css';

import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import BorrowerManagement from './components/BorrowerManagement';
import Reports from './components/Reports';
import Notifications from './components/Notifications';

import { borrowerAPI, loanAPI, repaymentAPI } from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [borrowers, setBorrowers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial data when the application starts.
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load data from the backend.
  const loadInitialData = async ({ showLoader = true } = {}) => {
    if (showLoader) {
      setLoading(true);
    }

    setError(null);

    try {
      const [
        borrowersResponse,
        loansResponse,
        repaymentsResponse,
      ] = await Promise.all([
        borrowerAPI.getAll(),
        loanAPI.getAll(),
        repaymentAPI.getAll({ limit: 100 }),
      ]);

      const borrowersData =
        borrowersResponse.borrowers || borrowersResponse || [];

      const loansData =
        loansResponse.loans || loansResponse || [];

      const repaymentsData =
        repaymentsResponse.repayments || repaymentsResponse || [];

      // Create sets of IDs for existing borrowers and loans.
      const validBorrowerIds = new Set(
        borrowersData.map((borrower) =>
          String(borrower._id || borrower.id)
        )
      );

      const validLoanIds = new Set(
        loansData.map((loan) =>
          String(loan._id || loan.id)
        )
      );

      // Exclude repayments associated with deleted borrowers or loans.
      const validRepayments = repaymentsData.filter((repayment) => {
        const borrowerId =
          repayment.borrowerId?._id || repayment.borrowerId;

        const loanId =
          repayment.loanId?._id || repayment.loanId;

        return (
          borrowerId != null &&
          loanId != null &&
          validBorrowerIds.has(String(borrowerId)) &&
          validLoanIds.has(String(loanId))
        );
      });

      setBorrowers(borrowersData);
      setLoans(loansData);
      setRepayments(validRepayments);
    } catch (error) {
      console.error('Failed to load application data:', error);

      setError(
        'Failed to load data. Please check whether the backend is running.'
      );

      // Clear data only when the initial load fails.
      if (showLoader) {
        setBorrowers([]);
        setLoans([]);
        setRepayments([]);
      }
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  // Refresh data without displaying the full-page loader.
  const refreshData = async () => {
    await loadInitialData({ showLoader: false });
  };

  // Render the selected page.
  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading application data...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Connection Error</h3>
          <p>{error}</p>

          <button
            className="btn btn-primary"
            onClick={refreshData}
          >
            Retry Connection
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            borrowers={borrowers}
            loans={loans}
            repayments={repayments}
            refreshData={refreshData}
          />
        );

      case 'borrowers':
        return (
          <BorrowerManagement
            borrowers={borrowers}
            setBorrowers={setBorrowers}
            loans={loans}
            setLoans={setLoans}
            repayments={repayments}
            setRepayments={setRepayments}
            refreshData={refreshData}
          />
        );

      case 'reports':
        return (
          <Reports
            borrowers={borrowers}
            loans={loans}
            repayments={repayments}
          />
        );

      case 'notifications':
        return (
          <Notifications
            loans={loans}
            borrowers={borrowers}
            repayments={repayments}
          />
        );

      default:
        return (
          <Dashboard
            borrowers={borrowers}
            loans={loans}
            repayments={repayments}
            refreshData={refreshData}
          />
        );
    }
  };

  return (
    <div className="App">
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;

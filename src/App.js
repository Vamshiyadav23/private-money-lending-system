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

  // Load initial data from backend
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [borrowersResponse, loansResponse, repaymentsResponse] = await Promise.all([
        borrowerAPI.getAll(),
        loanAPI.getAll(),
        repaymentAPI.getAll()
      ]);
      
      // Handle different response structures
      setBorrowers(borrowersResponse.borrowers || borrowersResponse || []);
      setLoans(loansResponse.loans || loansResponse || []);
      setRepayments(repaymentsResponse.repayments || repaymentsResponse || []);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setError('Failed to connect to server. Please check if the backend is running.');
      setBorrowers([]);
      setLoans([]);
      setRepayments([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    loadInitialData();
  };

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
          <button className="btn btn-primary" onClick={refreshData}>
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
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
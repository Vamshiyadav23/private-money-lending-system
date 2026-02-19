// Comprehensive Credit Score Calculator for Lending App

export const calculateCreditScore = (borrowerData, loanHistory = [], repaymentHistory = []) => {
  // For new borrowers, calculate initial score
  if (loanHistory.length === 0 && repaymentHistory.length === 0) {
    return calculateInitialCreditScore(borrowerData);
  }
  
  // For existing borrowers, calculate based on history
  let score = 650; // Base score
  
  // 1. Payment History (40% weight) - Most important factor
  const paymentScore = calculatePaymentScore(repaymentHistory);
  score += (paymentScore - 650) * 0.4;
  
  // 2. Current Debt Load (25% weight)
  const debtScore = calculateDebtScore(borrowerData, loanHistory);
  score += (debtScore - 650) * 0.25;
  
  // 3. Credit History Length (15% weight)
  const historyScore = calculateHistoryScore(loanHistory);
  score += (historyScore - 650) * 0.15;
  
  // 4. Recent Credit Activity (10% weight)
  const recentActivityScore = calculateRecentActivityScore(loanHistory);
  score += (recentActivityScore - 650) * 0.1;
  
  // 5. Borrower Profile Strength (10% weight)
  const profileScore = calculateProfileScore(borrowerData);
  score += (profileScore - 650) * 0.1;
  
  // Ensure score stays within standard bounds (300-850)
  return Math.max(300, Math.min(850, Math.round(score)));
};

// Calculate initial score for new borrowers
export const calculateInitialCreditScore = (borrowerData) => {
  let score = 650; // Average starting score
  
  // Income level adjustments
  if (borrowerData.monthlyIncome) {
    const monthlyIncome = parseFloat(borrowerData.monthlyIncome);
    if (monthlyIncome >= 50000) score += 40;
    else if (monthlyIncome >= 30000) score += 20;
    else if (monthlyIncome >= 15000) score += 10;
    else if (monthlyIncome < 10000) score -= 20;
  }
  
  // Employment stability
  if (borrowerData.employmentYears) {
    const employmentYears = parseFloat(borrowerData.employmentYears);
    if (employmentYears >= 5) score += 30;
    else if (employmentYears >= 3) score += 15;
    else if (employmentYears >= 1) score += 5;
    else if (employmentYears < 0.5) score -= 15;
  }
  
  // Employment status
  if (borrowerData.employmentStatus === 'employed') score += 20;
  else if (borrowerData.employmentStatus === 'self-employed') score += 10;
  else if (borrowerData.employmentStatus === 'unemployed') score -= 30;
  
  // Residence stability
  if (borrowerData.yearsAtAddress) {
    const yearsAtAddress = parseFloat(borrowerData.yearsAtAddress);
    if (yearsAtAddress >= 5) score += 15;
    else if (yearsAtAddress >= 2) score += 8;
    else if (yearsAtAddress < 1) score -= 10;
  }
  
  // Age factor (indirect through employment years)
  if (borrowerData.employmentYears >= 10) score += 10; // Experienced worker
  
  return Math.max(550, Math.min(750, score)); // Limit range for new borrowers
};

const calculatePaymentScore = (repayments) => {
  if (!repayments || repayments.length === 0) return 650;
  
  const totalPayments = repayments.length;
  const onTimePayments = repayments.filter(p => {
    if (p.status === 'paid') {
      const paymentDate = new Date(p.date || p.paymentDate);
      const dueDate = new Date(p.dueDate);
      return paymentDate <= dueDate;
    }
    return false;
  }).length;
  
  const latePayments = repayments.filter(p => {
    if (p.status === 'paid') {
      const paymentDate = new Date(p.date || p.paymentDate);
      const dueDate = new Date(p.dueDate);
      return paymentDate > dueDate;
    }
    return false;
  }).length;
  
  const missedPayments = repayments.filter(p => p.status === 'overdue' || p.status === 'defaulted').length;
  
  const onTimeRatio = onTimePayments / totalPayments;
  const lateRatio = latePayments / totalPayments;
  const missedRatio = missedPayments / totalPayments;
  
  if (onTimeRatio >= 0.95 && missedRatio === 0) return 800;      // Excellent
  if (onTimeRatio >= 0.90 && missedRatio <= 0.05) return 750;    // Good
  if (onTimeRatio >= 0.80 && missedRatio <= 0.10) return 680;    // Fair
  if (onTimeRatio >= 0.70 && missedRatio <= 0.15) return 620;    // Poor
  return 550;                                                    // Very Poor
};

const calculateDebtScore = (borrower, loans) => {
  const activeLoans = loans.filter(loan => loan.status === 'active');
  const totalOutstanding = activeLoans.reduce((sum, loan) => sum + loan.remainingAmount, 0);
  
  // Debt-to-Income Ratio calculation
  let dti = 0;
  if (borrower.monthlyIncome && borrower.monthlyIncome > 0) {
    const monthlyIncome = parseFloat(borrower.monthlyIncome);
    const estimatedMonthlyDebt = totalOutstanding / 12; // Simplified
    dti = (estimatedMonthlyDebt / monthlyIncome) * 100;
  }
  
  // Number of active loans
  const loanCount = activeLoans.length;
  
  let score = 650;
  
  // DTI adjustments
  if (dti <= 20) score += 50;      // Excellent DTI
  else if (dti <= 35) score += 25; // Good DTI
  else if (dti <= 50) score -= 20; // Fair DTI
  else if (dti <= 65) score -= 50; // Poor DTI
  else score -= 80;                // Very Poor DTI
  
  // Loan count adjustments
  if (loanCount === 0) score += 20;
  else if (loanCount === 1) score += 10;
  else if (loanCount >= 3) score -= (loanCount - 2) * 15;
  
  return Math.max(300, Math.min(800, score));
};

const calculateHistoryScore = (loans) => {
  if (!loans || loans.length === 0) return 600;
  
  const now = new Date();
  const loanDates = loans.map(loan => new Date(loan.startDate || loan.createdAt));
  const oldestLoan = new Date(Math.min(...loanDates.map(d => d.getTime())));
  
  const historyMonths = (now.getTime() - oldestLoan.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  
  if (historyMonths >= 60) return 750;      // 5+ years: Excellent
  if (historyMonths >= 36) return 700;      // 3-5 years: Good
  if (historyMonths >= 24) return 670;      // 2-3 years: Fair
  if (historyMonths >= 12) return 630;      // 1-2 years: Poor
  return 580;                               // <1 year: Very Poor
};

const calculateRecentActivityScore = (loans) => {
  const now = new Date();
  const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));
  
  const recentLoans = loans.filter(loan => {
    const loanDate = new Date(loan.startDate || loan.createdAt);
    return loanDate >= threeMonthsAgo;
  });
  
  if (recentLoans.length === 0) return 700; // No recent activity: Good
  if (recentLoans.length === 1) return 680; // 1 recent loan: Fair
  if (recentLoans.length === 2) return 650; // 2 recent loans: Poor
  return 600;                               // 3+ recent loans: Very Poor
};

const calculateProfileScore = (borrower) => {
  let score = 650;
  
  // Employment status adjustments
  if (borrower.employmentStatus === 'employed') score += 30;
  else if (borrower.employmentStatus === 'self-employed') score += 15;
  else if (borrower.employmentStatus === 'unemployed') score -= 30;
  
  // Income level (if available)
  if (borrower.monthlyIncome) {
    const income = parseFloat(borrower.monthlyIncome);
    if (income > 50000) score += 25;
    else if (income > 25000) score += 15;
    else if (income > 10000) score += 5;
  }
  
  // Residence stability (if available)
  if (borrower.yearsAtAddress) {
    const years = parseFloat(borrower.yearsAtAddress);
    if (years >= 5) score += 20;
    else if (years >= 2) score += 10;
    else if (years < 1) score -= 10;
  }
  
  return score;
};

// Calculate suggested interest rate based on credit score
export const calculateInterestRate = (creditScore, baseRate = 12) => {
  if (creditScore >= 750) return baseRate - 3;    // Excellent: Lower rate
  if (creditScore >= 650) return baseRate - 1;    // Good: Slightly lower rate
  if (creditScore >= 550) return baseRate + 2;    // Fair: Higher rate
  return baseRate + 5;                            // Poor: Highest rate
};

// Get credit score category information
export const getCreditScoreInfo = (score) => {
  if (score >= 750) return { 
    category: 'Excellent', 
    color: '#27ae60', 
    className: 'credit-excellent',
    description: 'Very low risk borrower'
  };
  if (score >= 650) return { 
    category: 'Good', 
    color: '#2ecc71', 
    className: 'credit-good',
    description: 'Low risk borrower'
  };
  if (score >= 550) return { 
    category: 'Fair', 
    color: '#f39c12', 
    className: 'credit-fair',
    description: 'Medium risk borrower'
  };
  return { 
    category: 'Poor', 
    color: '#e74c3c', 
    className: 'credit-poor',
    description: 'High risk borrower'
  };
};

// Recalculate score when repayment is made
export const recalculateScoreAfterRepayment = (borrowerId, borrowers, loans, repayments) => {
  const borrower = borrowers.find(b => b.id === borrowerId);
  if (!borrower) return 650;
  
  const borrowerLoans = loans.filter(loan => loan.borrowerId === borrowerId);
  const borrowerRepayments = repayments.filter(repayment => {
    const loan = borrowerLoans.find(l => l.id === repayment.loanId);
    return loan !== undefined;
  });
  
  return calculateCreditScore(borrower, borrowerLoans, borrowerRepayments);
};
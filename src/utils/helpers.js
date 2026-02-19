// Utility functions for the application

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

export const calculateDueDate = (startDate, termMonths) => {
  const date = new Date(startDate);
  date.setMonth(date.getMonth() + termMonths);
  return date.toISOString().split('T')[0];
};

export const calculateInterest = (principal, rate, timeInYears) => {
  return principal * rate * timeInYears;
};

export const getRiskColor = (riskRating) => {
  const colors = {
    Low: '#27ae60',
    Medium: '#f39c12',
    High: '#e74c3c'
  };
  return colors[riskRating] || '#95a5a6';
};

export const generateLoanId = () => {
  return 'LN' + Date.now().toString().slice(-6);
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone) => {
  const re = /^\+?[\d\s-()]{10,}$/;
  return re.test(phone);
};
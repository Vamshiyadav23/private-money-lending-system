const API_BASE_URL = 'http://localhost:5000/api';

const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// Borrower API calls
export const borrowerAPI = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiCall(`/borrowers?${params}`);
  },
  
  getById: (id) => apiCall(`/borrowers/${id}`),
  
  create: (borrowerData) => 
    apiCall('/borrowers', {
      method: 'POST',
      body: borrowerData,
    }),
  
  update: (id, borrowerData) =>
    apiCall(`/borrowers/${id}`, {
      method: 'PUT',
      body: borrowerData,
    }),
  
  delete: (id) =>
    apiCall(`/borrowers/${id}`, {
      method: 'DELETE',
    }),
};

// Loan API calls
export const loanAPI = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiCall(`/loans?${params}`);
  },
  
  getById: (id) => apiCall(`/loans/${id}`),
  
  create: (loanData) =>
    apiCall('/loans', {
      method: 'POST',
      body: loanData,
    }),
  
  updateStatus: (id, status) =>
    apiCall(`/loans/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),
};

// Repayment API calls
export const repaymentAPI = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiCall(`/repayments?${params}`);
  },
  
  getTodaysDue: () => apiCall('/repayments/today-due'),
  
  getOverdue: () => apiCall('/repayments/overdue'),
  
  create: (repaymentData) =>
    apiCall('/repayments', {
      method: 'POST',
      body: repaymentData,
    }),
  
  markAsPaid: (id) =>
    apiCall(`/repayments/${id}/paid`, {
      method: 'PUT',
    }),
  
  markMultipleAsPaid: (repaymentIds) =>
    apiCall('/repayments/bulk/paid', {
      method: 'PUT',
      body: { repaymentIds },
    }),
};
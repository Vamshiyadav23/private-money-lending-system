
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Handle API errors consistently
const handleApiError = (error) => {
  const message =
    error.response?.data?.message ||
    error.message ||
    'Something went wrong. Please try again.';

  console.error('API Error:', message);
  throw new Error(message);
};

// -----------------------------------------------------
// BORROWER API
// -----------------------------------------------------

export const borrowerAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/borrowers', { params });
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/borrowers/${id}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  create: async (borrowerData) => {
    try {
      const response = await api.post('/borrowers', borrowerData);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  update: async (id, borrowerData) => {
    try {
      const response = await api.put(`/borrowers/${id}`, borrowerData);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/borrowers/${id}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },
};

// -----------------------------------------------------
// LOAN API
// -----------------------------------------------------

export const loanAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/loans', { params });
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/loans/${id}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  create: async (loanData) => {
    try {
      const response = await api.post('/loans', loanData);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  updateStatus: async (id, status) => {
    try {
      const response = await api.put(`/loans/${id}/status`, { status });
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },
};

// -----------------------------------------------------
// REPAYMENT API
// -----------------------------------------------------

export const repaymentAPI = {
  // Get repayments, with optional filters and pagination
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/repayments', { params });
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  // Get today's pending installments
  getTodaysDue: async () => {
    try {
      const response = await api.get('/repayments/today-due');
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  // Get overdue installments
  getOverdue: async () => {
    try {
      const response = await api.get('/repayments/overdue');
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  // Record the amount actually received
  create: async (repaymentData) => {
    try {
      const response = await api.post('/repayments', repaymentData);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  // Mark a scheduled installment as paid
  markAsPaid: async (repaymentId) => {
    try {
      const response = await api.put(
        `/repayments/${repaymentId}/paid`
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  // Mark multiple scheduled installments as paid
  markMultipleAsPaid: async (repaymentIds) => {
    try {
      const response = await api.put('/repayments/bulk/paid', {
        repaymentIds,
      });
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  // Edit an existing repayment amount or payment date
  update: async (repaymentId, repaymentData) => {
    try {
      const response = await api.put(
        `/repayments/${repaymentId}`,
        repaymentData
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  // Delete an incorrect repayment
  delete: async (repaymentId) => {
    try {
      const response = await api.delete(
        `/repayments/${repaymentId}`
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },
};

// Export the Axios instance for other services if needed
export default api;

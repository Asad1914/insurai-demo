import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: async (userData) => {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
  },

  getStates: async () => {
    const response = await api.get('/api/auth/states');
    return response.data;
  },
};

// Plans API calls
export const plansAPI = {
  getPlans: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const response = await api.get(`/api/plans?${params.toString()}`);
    return response.data;
  },

  getPlanById: async (id) => {
    const response = await api.get(`/api/plans/${id}`);
    return response.data;
  },

  getPlanTypes: async () => {
    const response = await api.get('/api/plans/meta/types');
    return response.data;
  },
};

// Chat API calls
export const chatAPI = {
  sendMessage: async (message, sessionId = null) => {
    const response = await api.post('/api/chat', {
      message,
      session_id: sessionId,
    });
    return response.data;
  },

  getHistory: async (sessionId = null, limit = 50) => {
    const params = new URLSearchParams();
    if (sessionId) params.append('session_id', sessionId);
    params.append('limit', limit);
    const response = await api.get(`/api/chat/history?${params.toString()}`);
    return response.data;
  },

  clearHistory: async (sessionId) => {
    const response = await api.delete(`/api/chat/history/${sessionId}`);
    return response.data;
  },
};

// Admin API calls
export const adminAPI = {
  uploadPlans: async (files, stateId, providerName = '') => {
    const formData = new FormData();
    
    // Support both single file and multiple files
    if (Array.isArray(files)) {
      files.forEach((file) => {
        formData.append('files', file);
      });
    } else {
      formData.append('file', files);
    }
    
    formData.append('state_id', stateId);
    if (providerName) {
      formData.append('provider_name', providerName);
    }

    const response = await api.post('/api/admin/upload-plans', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getPlans: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params.append(key, filters[key]);
      }
    });
    const response = await api.get(`/api/admin/plans?${params.toString()}`);
    return response.data;
  },

  updatePlan: async (id, data) => {
    const response = await api.put(`/api/admin/plans/${id}`, data);
    return response.data;
  },

  deletePlan: async (id, hardDelete = false) => {
    const params = hardDelete ? '?hard_delete=true' : '';
    const response = await api.delete(`/api/admin/plans/${id}${params}`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/api/admin/stats');
    return response.data;
  },
};

export default api;

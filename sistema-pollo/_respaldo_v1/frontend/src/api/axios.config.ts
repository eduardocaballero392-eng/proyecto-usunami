import axios from 'axios';

// URL del backend
const API_URL = import.meta.env.DEV 
  ? 'http://localhost:3000/api' 
  : 'http://192.168.1.100:3000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          localStorage.removeItem('token');
          localStorage.removeItem('mozoId');
          if (window.location.pathname !== '/mozo-select') {
            window.location.href = '/mozo-select';
          }
          break;
        case 403:
          console.error('No autorizado');
          break;
        case 500:
          console.error('Error del servidor');
          break;
      }
    }
    return Promise.reject(error);
  }
);

export default api;

import axios from 'axios'

const BASE_URL = import.meta.env.PROD 
  ? 'https://proxy-blocker-production.up.railway.app/api'
  : '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api

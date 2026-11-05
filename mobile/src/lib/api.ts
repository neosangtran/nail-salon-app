import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const TOKEN_KEY = 'nail_salon_token';

const api = axios.create({
  baseURL: 'https://backend-production-212a.up.railway.app/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Request interceptor - attach token
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - unwrap { success, data } envelope
api.interceptors.response.use((response) => {
  if (
    response.data &&
    typeof response.data === 'object' &&
    'success' in response.data &&
    'data' in response.data
  ) {
    response.data = response.data.data;
  }
  return response;
});

export const tokenHelpers = {
  getToken: () => SecureStore.getItemAsync(TOKEN_KEY),
  setToken: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  clearToken: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};

export default api;

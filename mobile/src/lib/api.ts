import axios from 'axios';
import { storage } from './storage';

// URL de l'API backend - à changer selon l'environnement
const API_BASE_URL = __DEV__ 
  ? 'https://event-app-backend-production.up.railway.app' // Backend Railway
  : 'https://event-app-backend-production.up.railway.app';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Augmenté à 30 secondes pour les opérations lentes
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use(
  async (config) => {
    const token = await storage.getItemAsync('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Routes qui ne nécessitent pas de refresh token
const authRoutes = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];

// Intercepteur pour gérer le refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';

    // Ne pas essayer de refresh pour les routes d'auth ou si déjà retry
    const isAuthRoute = authRoutes.some(route => requestUrl.includes(route));
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;

      try {
        const refreshToken = await storage.getItemAsync('refreshToken');
        if (!refreshToken) {
          // Pas de refresh token = utilisateur non connecté, rejeter silencieusement
          return Promise.reject(error);
        }

        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        await storage.setItemAsync('accessToken', accessToken);
        await storage.setItemAsync('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear tokens
        await storage.deleteItemAsync('accessToken');
        await storage.deleteItemAsync('refreshToken');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export { api, API_BASE_URL };

import axios from 'axios'

// En production, utiliser l'URL Railway, sinon localhost
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
const baseURL = isProduction 
  ? 'https://event-app-backend-production.up.railway.app'
  : (import.meta.env.VITE_API_URL || 'http://localhost:3000')

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common.Authorization
  }
}

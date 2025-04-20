import axios from 'axios'

// Base API configuration
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for handling common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const { status } = error?.response || {}

    if (status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }

    if (status === 403) {
      // Handle forbidden access
      console.error('Forbidden resource')
    }

    if (status === 500) {
      // Handle server errors
      console.error('Server error occurred')
    }

    return Promise.reject(error)
  }
)

export default apiClient
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export const apiClient = axios.create({
  baseURL: API_GATEWAY_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject Idempotency-Key for mutations
apiClient.interceptors.request.use((config) => {
  if (config.method && ['post', 'put', 'patch'].includes(config.method.toLowerCase())) {
    if (!config.headers['Idempotency-Key']) {
      config.headers['Idempotency-Key'] = uuidv4();
    }
  }
  return config;
});

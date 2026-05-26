import axios from 'axios';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

const api = axios.create({
  baseURL: 'http://10.0.2.2:3000/api/v1', // Android 模拟器访问本机
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截器：注入 token
api.interceptors.request.use((config) => {
  const token = storage.getString('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：处理 401
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = storage.getString('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post('http://10.0.2.2:3000/api/v1/auth/refresh', { refreshToken });
          storage.set('accessToken', data.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(originalRequest);
        } catch {
          storage.delete('accessToken');
          storage.delete('refreshToken');
        }
      }
    }
    return Promise.reject(error.response?.data || error);
  },
);

export default api;

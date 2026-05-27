import axios from 'axios';
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV();

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
          storage.remove('accessToken');
          storage.remove('refreshToken');
        }
      }
    }
    return Promise.reject(error.response?.data || error);
  },
);

export default api;

// Shop API
export const shopApi = {
  list: (params?: { page?: number; limit?: number; categoryId?: number; keyword?: string; sort?: string }) =>
    api.get('/shops', { params }),
  recommended: () => api.get('/shops/recommended'),
  detail: (id: number) => api.get(`/shops/${id}`),
};

// Category API
export const categoryApi = {
  list: () => api.get('/categories'),
};

// Product API
export const productApi = {
  list: (params?: { shopId?: number; categoryId?: number; page?: number; limit?: number }) =>
    api.get('/products', { params }),
  detail: (id: number) => api.get(`/products/${id}`),
};

// Shop Nearby API
export const shopNearbyApi = {
  list: (params: { latitude: number; longitude: number; radius?: number; limit?: number }) =>
    api.get('/shops/nearby', { params }),
};

// Amap Proxy API
export const amapApi = {
  reverseGeocode: (lat: number, lng: number) =>
    api.get('/amap/reverse-geocode', { params: { lat, lng } }),
  poiSearch: (keywords: string, location?: string) =>
    api.get('/amap/poi-search', { params: { keywords, location } }),
  direction: (origin: string, destination: string, mode: string = 'driving') =>
    api.get('/amap/direction', { params: { origin, destination, mode } }),
  geocode: (address: string, city?: string) =>
    api.get('/amap/geocode', { params: { address, city } }),
};

// Address API
export const addressApi = {
  list: () => api.get('/addresses'),
  create: (data: any) => api.post('/addresses', data),
  update: (id: number, data: any) => api.patch(`/addresses/${id}`, data),
  delete: (id: number) => api.delete(`/addresses/${id}`),
};

// ============ 购物车 ============
export const cartApi = {
  get: () => api.get('/cart'),
  addItem: (data: { productId: number; quantity: number }) => api.post('/cart/items', data),
  updateItem: (id: number, quantity: number) => api.patch(`/cart/items/${id}`, { quantity }),
  removeItem: (id: number) => api.delete(`/cart/items/${id}`),
  clear: () => api.delete('/cart/clear'),
};

// ============ 订单 ============
export const orderApi = {
  create: (data: { addressId: number; remark?: string }) => api.post('/orders', data),
  list: (params?: { status?: number; page?: number; limit?: number }) => api.get('/orders', { params }),
  detail: (id: number) => api.get(`/orders/${id}`),
  pay: (id: number, payMethod = '微信支付') => api.patch(`/orders/${id}/pay`, { payMethod }),
  cancel: (id: number) => api.patch(`/orders/${id}/cancel`),
  confirm: (id: number) => api.patch(`/orders/${id}/confirm`),
};

// ============ 评价 ============
export const reviewApi = {
  submit: (data: any) => api.post('/reviews', data),
  shopReviews: (shopId: number, params?: { page?: number; limit?: number }) =>
    api.get(`/reviews/shop/${shopId}`, { params }),
};

// ============ 收藏 ============
export const favoriteApi = {
  toggle: (shopId: number) => api.post(`/favorites/${shopId}`),
  list: () => api.get('/favorites'),
  check: (shopId: number) => api.get(`/favorites/check/${shopId}`),
};

// ============ AI 助手 ============
export const aiApi = {
  chat: (message: string, conversationId?: number) => {
    return api.post('/ai/chat', { message, conversationId });
  },
  history: () => api.get('/ai/history'),
  messages: (conversationId: number) => api.get(`/ai/conversation/${conversationId}`),
};

// ============ 浏览历史 ============
export const browseHistoryApi = {
  record: (shopId: number) => api.post('/browse-history/record', { shopId }),
  list: (group: string) => api.get('/browse-history', { params: { group } }),
  clear: () => api.delete('/browse-history'),
};

// SSE Stream Helper
export const createChatStream = async (
  message: string,
  conversationId: number | undefined,
  onChunk: (chunk: string) => void,
  onDone: (conversationId: number) => void,
  onError: (error: string) => void,
) => {
  const token = storage.getString('accessToken');
  const response = await fetch('http://10.0.2.2:3000/api/v1/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, conversationId }),
  });

  const reader = (response as any).body?.getReader();
  const decoder = new (globalThis as any).TextDecoder();

  if (!reader) {
    onError('Failed to create stream');
    return;
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.chunk) {
            onChunk(data.chunk);
          } else if (data.done) {
            onDone(data.conversationId);
          } else if (data.error) {
            onError(data.error);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }
};

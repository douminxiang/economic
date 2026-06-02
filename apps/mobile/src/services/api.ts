import axios from 'axios';
import { getStorage } from '../utils/storage';
import { API_BASE_URL } from '../config/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截器：注入 token；FormData 上传时不能带 application/json
api.interceptors.request.use((config) => {
  const token = getStorage().getString('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
    delete config.headers['content-type'];
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
      const refreshToken = getStorage().getString('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const tokens = data.data;
          getStorage().set('accessToken', tokens.accessToken);
          if (tokens.refreshToken) {
            getStorage().set('refreshToken', tokens.refreshToken);
          }
          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
          return api(originalRequest);
        } catch {
          getStorage().remove('accessToken');
          getStorage().remove('refreshToken');
        }
      }
    }
    const message =
      error.response?.data?.message ||
      (error.code === 'ECONNABORTED' ? '请求超时，请检查网络' : null) ||
      (error.message === 'Network Error' ? '无法连接服务器，请确认后端已启动' : null) ||
      error.message ||
      '请求失败';
    return Promise.reject({ message, ...error.response?.data });
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

// ============ 认证（短信 / SSO） ============
export const authApi = {
  sendCode: (phone: string) => api.post('/auth/send-code', { phone }),
  smsLogin: (phone: string, code: string, device?: { deviceId?: string; deviceName?: string }) =>
    api.post('/auth/sms-login', { phone, code, ...device }),
  logout: (refreshToken?: string) => api.post('/auth/logout', refreshToken ? { refreshToken } : {}),
  sessions: () => api.get('/auth/sessions'),
  logoutOthers: () => api.delete('/auth/sessions/others'),
};

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStorage().getString('refreshToken');
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const accessToken = json?.data?.accessToken;
    if (!accessToken) return null;
    getStorage().set('accessToken', accessToken);
    if (json?.data?.refreshToken) {
      getStorage().set('refreshToken', json.data.refreshToken);
    }
    return accessToken;
  } catch {
    return null;
  }
}

// ============ 文件上传 ============
async function uploadFileWithFetch(
  endpoint: string,
  file: { uri: string; type: string; name: string },
) {
  const buildFormData = () => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.type || 'image/jpeg',
      name: file.name || `photo_${Date.now()}.jpg`,
    } as any);
    return formData;
  };

  const doUpload = async (token?: string | null) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: buildFormData(),
        signal: controller.signal,
      });
      return res;
    } finally {
      clearTimeout(timer);
    }
  };

  let token = getStorage().getString('accessToken');
  let response: Response;
  try {
    response = await doUpload(token);
    if (response.status === 401) {
      token = await refreshAccessToken();
      if (token) {
        response = await doUpload(token);
      }
    }
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw { message: '上传超时，请检查网络' };
    }
    throw { message: '无法连接服务器，请确认后端已启动' };
  }

  if (!response.ok) {
    let message = '图片上传失败，请重试';
    try {
      const errJson = await response.json();
      message = errJson.message || message;
    } catch {
      // ignore non-json body
    }
    throw { message };
  }

  return response.json();
}

export const uploadApi = {
  /** Android 上 axios + FormData 易触发 Network Error，改用 fetch 上传 */
  uploadImage: (file: { uri: string; type: string; name: string }) =>
    uploadFileWithFetch('/upload/image', file),

  /** AI 多模态对话 — 图片强制存储到 OSS */
  uploadAiImage: (file: { uri: string; type: string; name: string }) =>
    uploadFileWithFetch('/upload/image/ai', file),
};

// ============ 分析追踪 ============
export const analyticsApi = {
  track: (data: {
    eventType: string;
    eventName: string;
    properties?: Record<string, any>;
    platform?: string;
    appVersion?: string;
    deviceId?: string;
  }) => api.post('/events/track', {
    platform: 'android',
    appVersion: '1.0.0',
    ...data,
  }),
};

// ============ 支付 ============
export const paymentApi = {
  mode: () => api.get('/payment/mode'),
  mockPay: (orderNo: string) => api.post(`/payment/mock-pay/${orderNo}`),
  status: (orderNo: string) => api.get(`/payment/status/${orderNo}`),
  sync: (orderNo: string, alipayOutTradeNo?: string) =>
    api.post(`/payment/sync/${orderNo}`, alipayOutTradeNo ? { alipayOutTradeNo } : {}),
  callback: (data: any) => api.post('/payment/callback', data),
};

// SSE Stream Helper — uses XMLHttpRequest for SSE streaming (most reliable in React Native)
export const createChatStream = async (
  message: string,
  conversationId: number | undefined,
  onChunk: (chunk: string) => void,
  onDone: (conversationId: number) => void,
  onError: (error: string) => void,
  onThinking?: (chunk: string) => void,
  thinkingEnabled?: boolean,
  onSearchResults?: (results: Array<{ title: string; url: string; snippet: string }>) => void,
  imageUrl?: string,
  webSearch?: boolean,
) => {
  const token = getStorage().getString('accessToken');

  return new Promise<void>((resolve) => {
    const xhr = new XMLHttpRequest();
    const url = `${API_BASE_URL}/ai/chat`;
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = 120000;

    let buffer = '';
    let lastPos = 0;
    let finished = false;
    let lastConversationId = conversationId ?? 0;
    let receivedChunks = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      resolve();
    };

    const handleEvent = (data: any) => {
      if (data.conversationId) {
        lastConversationId = data.conversationId;
      }
      if (data.type === 'thinking' && data.thinkingChunk) {
        onThinking?.(data.thinkingChunk);
      } else if (data.type === 'search' && data.searchResults) {
        onSearchResults?.(data.searchResults);
      } else if (data.type === 'chunk' && data.chunk) {
        receivedChunks = true;
        onChunk(data.chunk);
      } else if (data.chunk) {
        receivedChunks = true;
        onChunk(data.chunk);
      } else if (data.done) {
        onDone(data.conversationId ?? lastConversationId);
        finish();
      } else if (data.error) {
        onError(data.error);
        finish();
      }
    };

    const processLines = (text: string) => {
      buffer += text;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const payload = trimmed.slice(6);
        if (payload === '[DONE]') continue;

        try {
          handleEvent(JSON.parse(payload));
        } catch {
          // ignore malformed SSE lines
        }
      }
    };

    const readNewContent = () => {
      const text = xhr.responseText;
      if (text.length > lastPos) {
        processLines(text.slice(lastPos));
        lastPos = text.length;
      }
    };

    xhr.onreadystatechange = () => {
      if (finished) return;
      if (xhr.readyState === 3 || xhr.readyState === 4) {
        readNewContent();
      }
    };

    xhr.onload = () => {
      if (finished) return;
      readNewContent();

      if (xhr.status === 401) {
        onError('登录已过期，请重新登录');
        finish();
        return;
      }

      if (xhr.status >= 400) {
        let errorMsg = `请求失败: ${xhr.status}`;
        try {
          const resp = JSON.parse(xhr.responseText);
          if (resp.message) errorMsg = resp.message;
        } catch {
          // response may be SSE text, not JSON
        }
        onError(errorMsg);
        finish();
        return;
      }

      if (!finished) {
        if (receivedChunks || lastConversationId) {
          onDone(lastConversationId);
        } else {
          onError('AI 服务暂时不可用');
        }
        finish();
      }
    };

    xhr.onerror = () => {
      if (!finished) {
        onError('网络连接失败');
        finish();
      }
    };

    xhr.ontimeout = () => {
      if (!finished) {
        onError('请求超时，请重试');
        finish();
      }
    };

    xhr.send(JSON.stringify({ message, conversationId, thinkingEnabled, imageUrl, webSearch }));
  });
};

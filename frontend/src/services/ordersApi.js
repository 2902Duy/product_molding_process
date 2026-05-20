/**
 * Orders API service — calls backend /api/v1/orders endpoints.
 */
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

const handleResponse = async (response) => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }
  return response.json();
};

export const ordersApi = {
  getOrders: async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/orders`);
    return handleResponse(response);
  },

  getOrder: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/orders/${encodeURIComponent(id)}`);
    return handleResponse(response);
  },

  createOrder: async (data) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  searchOrders: async (query) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/orders/search?q=${encodeURIComponent(query)}`);
    return handleResponse(response);
  },
};

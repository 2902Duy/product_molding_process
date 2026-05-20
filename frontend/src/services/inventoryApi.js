/**
 * Inventory API service — calls backend /api/v1/inventory endpoints.
 */
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

const handleResponse = async (response) => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }
  return response.json();
};

export const inventoryApi = {
  getInventory: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.type) query.set('type', params.type);
    if (params.status) query.set('status', params.status);
    const qs = query.toString();
    const url = `${API_BASE_URL}/api/v1/inventory${qs ? `?${qs}` : ''}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  getAvailableInventory: async () => {
    return inventoryApi.getInventory({ status: 'AVAILABLE' });
  },

  getInventoryItem: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/inventory/${encodeURIComponent(id)}`);
    return handleResponse(response);
  },

  createInventoryItem: async (data) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateInventoryItem: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/inventory/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteInventoryItem: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/inventory/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  deleteInventoryItems: async (ids) => {
    const results = await Promise.all(ids.map((id) => inventoryApi.deleteInventoryItem(id).catch((err) => ({ error: err.message, id }))));
    return results;
  },

  updateStatus: async (id, status) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/inventory/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return handleResponse(response);
  },

  updateQuantity: async (id, quantity) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/inventory/${encodeURIComponent(id)}/quantity`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });
    return handleResponse(response);
  },

  bulkUpdateStatus: async (ids, status) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/inventory/bulk-update-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, status }),
    });
    return handleResponse(response);
  },

  searchInventory: async (query) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/inventory/search?q=${encodeURIComponent(query)}`);
    return handleResponse(response);
  },

  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/inventory/stats`);
    return handleResponse(response);
  },
};

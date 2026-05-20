/**
 * Lots API service — calls backend /api/v1/lots endpoints.
 */
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

const handleResponse = async (response) => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }
  return response.json();
};

export const lotsApi = {
  getLots: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.slip_type) query.set('slip_type', params.slip_type);
    if (params.status) query.set('status', params.status);
    const qs = query.toString();
    const url = `${API_BASE_URL}/api/v1/lots${qs ? `?${qs}` : ''}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  getLot: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/lots/${encodeURIComponent(id)}`);
    return handleResponse(response);
  },

  createLot: async (data) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/lots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateLot: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/lots/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteLot: async (id) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/lots/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  getLotInputs: async (lotId) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/lots/${encodeURIComponent(lotId)}/inputs`);
    return handleResponse(response);
  },

  getLotOutputs: async (lotId) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/lots/${encodeURIComponent(lotId)}/outputs`);
    return handleResponse(response);
  },

  consumeMaterialsForLot: async (lotId, materials) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/lots/${encodeURIComponent(lotId)}/consume-materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(materials),
    });
    return handleResponse(response);
  },

  releaseMaterialsFromLot: async (lotId, materials) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/lots/${encodeURIComponent(lotId)}/release-materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(materials),
    });
    return handleResponse(response);
  },

  getLotMaterialUsage: async (lotId) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/lots/${encodeURIComponent(lotId)}/material-usage`);
    return handleResponse(response);
  },
};

import { db } from './db';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

const compactArray = (items, limit) => {
  if (!Array.isArray(items)) return [];
  return items.slice(0, limit);
};

export function buildChatContext({ currentView, currentLotId } = {}) {
  const lots = db.getLots() || [];
  const inventory = db.getInventory() || [];
  const orders = db.getOrders() || [];
  const customRequests = db.getCustomRequests ? db.getCustomRequests() : [];

  return {
    currentView,
    currentLotId,
    lots: compactArray(lots, 80),
    inventory: compactArray(inventory, 120),
    orders: compactArray(orders, 80),
    customRequests: compactArray(customRequests, 80)
  };
}

export async function askAssistant(message, contextOptions) {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      context: buildChatContext(contextOptions)
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let detail = errorText || `Chat API error: ${response.status}`;
    try {
      const parsed = JSON.parse(errorText);
      detail = parsed.detail || detail;
    } catch {
      // Keep the original text if the backend did not return JSON.
    }

    const quotaMatch = detail.match(/retry(?:Delay| in)?["']?:?\s*["']?(\d+(?:\.\d+)?)s/i)
      || detail.match(/retry in (\d+(?:\.\d+)?)s/i);
    if (response.status === 429 || detail.includes('RESOURCE_EXHAUSTED') || detail.includes('Quota exceeded')) {
      const seconds = quotaMatch ? Math.ceil(Number(quotaMatch[1])) : null;
      throw new Error(seconds
        ? `Chat AI đang bị giới hạn lượt gọi. Thử lại sau khoảng ${seconds} giây.`
        : 'Chat AI đang bị giới hạn lượt gọi. Bạn thử lại sau ít phút.');
    }

    throw new Error(detail);
  }

  return response.json();
}

export async function uploadChatFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/chat/upload`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    let detail = errorText || `Upload error: ${response.status}`;
    try {
      const parsed = JSON.parse(errorText);
      detail = parsed.detail || detail;
    } catch {
      // Keep original
    }
    throw new Error(detail);
  }

  return response.json();
}

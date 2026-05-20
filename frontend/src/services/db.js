/**
 * Database service — quản lý dữ liệu ứng dụng qua Supabase API và MCP sync.
 *
 * MCP sync functions được giữ lại để lấy dữ liệu từ MCP server,
 * sau đó gọi backend sync endpoint để upsert vào Supabase.
 * CRUD operations chuyển sang gọi API services (lotsApi, inventoryApi, ordersApi).
 */
import { lotsApi } from './lotsApi';
import { inventoryApi } from './inventoryApi';
import { ordersApi } from './ordersApi';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
const MCP_ORDERS_KEY = 'wp_mcp_orders_v1';
const MCP_INVENTORY_KEY = 'wp_mcp_inventory_v1';
const MCP_SYNC_TTL_MS = 5 * 60 * 1000;
let mcpSyncInFlight = null;

const readJson = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const getLotPrefix = (slipType) => {
  if (slipType === 'DINH_HINH') return 'DDH';
  if (slipType === 'ASSEMBLY') return 'LR';
  if (slipType === 'PAINTING') return 'SON';
  if (slipType === 'PACKING') return 'DG';
  if (slipType === 'HOAN_THIEN') return 'HT';
  return 'PG';
};

const createReadableLotId = (slipType, lots = []) => {
  const prefix = getLotPrefix(slipType);
  const now = new Date();
  const dateCode = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const base = `${prefix}-${dateCode}`;
  const nextNumber = lots
    .map((lot) => String(lot.id || ''))
    .filter((id) => id.startsWith(`${base}-`))
    .map((id) => Number(id.slice(base.length + 1)))
    .filter((num) => Number.isFinite(num))
    .reduce((max, num) => Math.max(max, num), 0) + 1;

  return `${base}-${String(nextNumber).padStart(3, '0')}`;
};

async function runMcpTemplate(name, args = {}) {
  const response = await fetch(`${API_BASE_URL}/mcp/run-template`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, args }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MCP ${name} failed: ${response.status} ${text}`);
  }

  return response.json();
}

const firstPositiveNumericValue = (row, keys, fallback = 0) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value === null || value === undefined || value === '') continue;

    const normalized = typeof value === 'string'
      ? value.replace(',', '.')
      : value;
    const numeric = Number(normalized);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }

  return fallback;
};

const mapMcpInventory = (rows = []) => rows.map((row) => ({
  id: `MCP-INV-${row.id}`,
  mcp_id: row.id,
  batchId: row.malo_nguyenlieu || row.p_id || row.madonhang || `MCP-${row.id}`,
  name: row.nguyenlieu || 'Khong ro',
  length: Number(row.dai_sc) || 0,
  width: Number(row.rong_sc) || 0,
  thickness: Number(row.day_sc) || 0,
  quantity: firstPositiveNumericValue(row, [
    'soluong_conlai', 'soluongton', 'soluong_ton', 'sl_conlai',
    'sl_ton', 'sl', 'soluong', 'qty', 'quantity'
  ]),
  volume: firstPositiveNumericValue(row, [
    'sokhoi_conlai', 'sokhoiton', 'sokhoi_ton', 'm3_conlai',
    'm3_ton', 'sokhoi', 'm3', 'volume'
  ]),
  type: 'RAW',
  source_lot_id: row.madonhang || null,
  source: 'mcp',
  fsc_name: row.fsc_name || null,
  origin: row.nguongoc || null,
  orderName: row.donhang || null,
  status: 'AVAILABLE',
  wood_type: row.nguyenlieu || null,
}));

const mapMcpBomItems = (rows = []) => rows
  .filter((row) => row && row.chitiet && String(row.nguyenlieu || '0') !== '0')
  .map((row) => ({
    id: row.mact || `MCP-ITEM-${row.id}`,
    name: row.chitiet,
    materialType: row.nguyenlieu || null,
    length: Number(row.dai_tc) || 0,
    width: Number(row.rong_tc) || 0,
    thickness: Number(row.dayy_tc) || 0,
    base_quantity: Number(row.soluong_tc) || 1,
    m3_tc: Number(row.m3_tc) || 0,
    source: 'mcp',
  }));

const mapMcpDetailProduct = (row, items = [], orderId = '') => {
  const productCode = row.masp || `MCP-PROD-${row.id}`;
  const length = firstPositiveNumericValue(row, [
    'dai', 'dai_sp', 'dai_tp', 'chieudai', 'chieu_dai', 'length', 'product_length'
  ]);
  const width = firstPositiveNumericValue(row, [
    'rong', 'rong_sp', 'rong_tp', 'chieurong', 'chieu_rong', 'width', 'product_width'
  ]);
  const thickness = firstPositiveNumericValue(row, [
    'cao', 'cao_sp', 'cao_tp', 'chieu_cao', 'chieucao', 'day', 'day_sp', 'day_tp',
    'height', 'thickness', 'product_height'
  ]);
  const volume = firstPositiveNumericValue(row, [
    'm3', 'm3_sp', 'm3_tp', 'sokhoi', 'the_tich', 'thetich', 'volume', 'product_volume'
  ]);

  return {
    id: row.id ? `MCP-PROD-LINE-${row.id}` : `MCP-PROD-${orderId || 'ORDER'}-${productCode}`,
    productCode,
    name: row.tenchitiet || row.mota || row.masp || 'San pham',
    quantity: Number(row.soluong) || 0,
    length,
    width,
    thickness,
    height: thickness,
    volume,
    items,
    source: 'mcp',
    orderLineId: row.id,
    deliveryDate: row.ngaycangiao || null,
    color: row.mausac || null,
  };
};

const normalizeOrderProductIds = (order) => ({
  ...order,
  products: (order.products || []).map((product) => {
    if (product.source !== 'mcp') return product;
    const productCode = product.productCode || product.code || product.id;
    return {
      ...product,
      id: product.orderLineId
        ? `MCP-PROD-LINE-${product.orderLineId}`
        : `MCP-PROD-${order.id || 'ORDER'}-${productCode}`,
      productCode,
    };
  }),
});

async function syncMcpOrders({ maxOrders = 30, detailOrderLimit = 10, bomProductLimit = 4 } = {}) {
  const list = await runMcpTemplate('exec_tr_dondathang_getlisthtr', { trangthai: 'all' });
  const orderRows = (list.rows || []).slice(0, maxOrders);

  const orders = [];
  for (const [orderIndex, order] of orderRows.entries()) {
    let products = [];
    if (orderIndex < detailOrderLimit && order.maddh) {
      const detail = await runMcpTemplate('exec_tr_dondathang_chitiet_getall', { maddh: order.maddh });
      products = [];

      for (const [productIndex, product] of (detail.rows || []).entries()) {
        let items = [];
        if (productIndex < bomProductLimit && product.masp) {
          try {
            const bom = await runMcpTemplate('exec_dqt_dinhmuc_govan_get', {
              masp: product.masp,
              soluong: Number(product.soluong) || 1,
              nguyenlieu: 'all',
            });
            items = mapMcpBomItems(bom.rows || []);
          } catch (error) {
            console.warn('MCP BOM fallback', product.masp, error);
          }
        }
        products.push(mapMcpDetailProduct(product, items, order.maddh));
      }
    }

    orders.push({
      id: order.maddh,
      name: order.donhang || order.maddh,
      products,
      source: 'mcp',
      supplierId: order.mancc || null,
      supplierName: order.tenncc || null,
      orderDate: order.ngaydat || null,
    });
  }

  writeJson(MCP_ORDERS_KEY, orders);
  return orders;
}

async function syncMcpInventory() {
  const data = await runMcpTemplate('exec_dqt_thongke_phoi_getall', {});
  const inventory = mapMcpInventory(data.rows || []);
  writeJson(MCP_INVENTORY_KEY, inventory);
  return inventory;
}

async function pushMcpDataToSupabase(orders, inventory) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/mcp/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orders: orders || [],
        inventory: inventory || [],
      }),
    });
    if (response.ok) {
      return await response.json();
    }
    console.warn('MCP sync to Supabase failed:', response.status);
    return null;
  } catch (error) {
    console.warn('MCP sync to Supabase error:', error);
    return null;
  }
}

async function syncFromMcp(options = {}) {
  const force = Boolean(options.force);
  const lastSync = readJson('wp_mcp_sync_meta', null);
  const lastSyncedAt = lastSync?.syncedAt ? new Date(lastSync.syncedAt).getTime() : 0;
  const hasCachedData = readJson(MCP_ORDERS_KEY, []).length > 0 || readJson(MCP_INVENTORY_KEY, []).length > 0;

  if (!force && hasCachedData && lastSyncedAt && Date.now() - lastSyncedAt < MCP_SYNC_TTL_MS) {
    return {
      orders: readJson(MCP_ORDERS_KEY, []),
      inventory: readJson(MCP_INVENTORY_KEY, []),
      errors: lastSync?.errors || [],
      cached: true,
    };
  }

  if (mcpSyncInFlight) {
    return mcpSyncInFlight;
  }

  mcpSyncInFlight = (async () => {
    const result = { orders: null, inventory: null, errors: [] };

    try {
      result.orders = await syncMcpOrders(options.orders);
    } catch (error) {
      console.warn('MCP orders sync fallback', error);
      result.errors.push(error.message);
    }

    try {
      result.inventory = await syncMcpInventory();
    } catch (error) {
      console.warn('MCP inventory sync fallback', error);
      result.errors.push(error.message);
    }

    await pushMcpDataToSupabase(result.orders, result.inventory);

    writeJson('wp_mcp_sync_meta', {
      syncedAt: new Date().toISOString(),
      errors: result.errors,
    });

    window.dispatchEvent(new CustomEvent('wp:mcp-sync-complete', { detail: result }));
    return result;
  })();

  try {
    return await mcpSyncInFlight;
  } finally {
    mcpSyncInFlight = null;
  }
}

export function initDb() {
  // No-op: localStorage init is no longer needed since data lives in Supabase.
}

initDb();

// =============================================================================
// db object — wrapper functions calling API services + keeping MCP cache
// =============================================================================

let _cachedLots = [];

export const db = {
  getOrders: () => {
    const mcpOrders = readJson(MCP_ORDERS_KEY, null);
    if (mcpOrders && mcpOrders.length > 0) return mcpOrders.map(normalizeOrderProductIds);
    return [];
  },

  getOrdersAsync: async () => {
    try {
      const apiOrders = await ordersApi.getOrders();
      if (apiOrders && apiOrders.length > 0) return apiOrders;
    } catch {
      // fallback to MCP cache
    }
    return db.getOrders();
  },

  getInventory: () => {
    const mcpInventory = readJson(MCP_INVENTORY_KEY, null);
    if (mcpInventory && mcpInventory.length > 0) return mcpInventory;
    return [];
  },

  getInventoryAsync: async () => {
    try {
      const apiInventory = await inventoryApi.getInventory();
      if (apiInventory && apiInventory.length > 0) return apiInventory;
    } catch {
      // fallback to MCP cache
    }
    return db.getInventory();
  },

  getAvailableInventoryAsync: async () => {
    try {
      return await inventoryApi.getAvailableInventory();
    } catch {
      return db.getInventory().filter((item) => item.status === 'AVAILABLE' || !item.status);
    }
  },

  addInventory: async (items) => {
    const results = [];
    for (const item of items) {
      try {
        const created = await inventoryApi.createInventoryItem({
          ...item,
          id: item.id || undefined,
          source: item.source || 'local',
        });
        results.push(created);
      } catch (error) {
        console.warn('Failed to add inventory item:', error);
      }
    }
    return results;
  },

  removeInventory: async (ids) => {
    try {
      await inventoryApi.deleteInventoryItems(ids);
    } catch (error) {
      console.warn('Failed to remove inventory items:', error);
    }
  },

  getLots: () => _cachedLots,

  getLotsAsync: async () => {
    try {
      const apiLots = await lotsApi.getLots();
      _cachedLots = apiLots || [];
      return _cachedLots;
    } catch {
      return _cachedLots;
    }
  },

  getLot: (id) => _cachedLots.find((l) => l.id === id) || null,

  getLotAsync: async (id) => {
    try {
      return await lotsApi.getLot(id);
    } catch {
      return db.getLot(id);
    }
  },

  createLotId: (slipType = 'PHOI_GO') => createReadableLotId(slipType, _cachedLots),

  saveLot: async (lot) => {
    try {
      const existing = _cachedLots.find((l) => l.id === lot.id);
      if (existing) {
        const updated = await lotsApi.updateLot(lot.id, {
          name: lot.name,
          status: lot.status,
          description: lot.description,
          data: lot.data || lot,
        });
        const idx = _cachedLots.findIndex((l) => l.id === lot.id);
        if (idx >= 0) _cachedLots[idx] = { ..._cachedLots[idx], ...updated };
        return updated;
      }
      const created = await lotsApi.createLot({
        id: lot.id,
        name: lot.name,
        status: lot.status || 'Đang sản xuất',
        slip_type: lot.slip_type || 'PHOI_GO',
        description: lot.description,
        data: lot.data || lot,
      });
      _cachedLots.unshift(created);
      return created;
    } catch (error) {
      console.warn('Failed to save lot via API, caching locally:', error);
      const idx = _cachedLots.findIndex((l) => l.id === lot.id);
      if (idx >= 0) {
        _cachedLots[idx] = lot;
      } else {
        _cachedLots.unshift(lot);
      }
      return lot;
    }
  },

  deleteLot: async (id) => {
    try {
      await lotsApi.deleteLot(id);
    } catch (error) {
      console.warn('Failed to delete lot via API:', error);
    }
    _cachedLots = _cachedLots.filter((l) => l.id !== id);
  },

  resetAllData: () => {
    localStorage.removeItem('wp_mcp_orders_v1');
    localStorage.removeItem('wp_mcp_inventory_v1');
    localStorage.removeItem('wp_mcp_sync_meta');
    _cachedLots = [];
    console.log('Đã xóa dữ liệu cache. Reload lại trang để nhận dữ liệu mới.');
    window.location.reload();
  },

  saveCustomRequests: (requests) => {
    const existing = JSON.parse(localStorage.getItem('wp_custom_requests') || '[]');
    const newRequests = requests.map((req) => ({
      ...req,
      id: req.id || `REQ-${Date.now()}`,
      created_at: new Date().toISOString(),
      status: 'pending',
    }));
    localStorage.setItem('wp_custom_requests', JSON.stringify([...existing, ...newRequests]));
    return newRequests;
  },

  getCustomRequests: () => {
    return JSON.parse(localStorage.getItem('wp_custom_requests') || '[]');
  },

  syncFromMcp,
  getMcpSyncMeta: () => readJson('wp_mcp_sync_meta', null),
};

if (typeof window !== 'undefined') {
  window.resetDb = db.resetAllData;
}

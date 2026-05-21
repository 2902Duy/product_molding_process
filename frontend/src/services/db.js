/**
 * Database service — quản lý dữ liệu ứng dụng qua Supabase API và MCP sync.
 * Đã loại bỏ hoàn toàn việc lưu cache dữ liệu thô vào localStorage của trình duyệt.
 */
import { lotsApi } from './lotsApi';
import { inventoryApi } from './inventoryApi';
import { ordersApi } from './ordersApi';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

let mcpSyncInFlight = null;
let _cachedLots = [];
let _cachedOrders = [];
let _cachedInventory = [];
let _cachedCustomRequests = [];

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
  source_lot_id: null,
  source: 'mcp',
  malo_nguyenlieu: row.malo_nguyenlieu || null,
  fsc_name: row.fsc_name || null,
  origin: row.nguongoc || null,
  orderName: row.donhang || null,
  status: 'AVAILABLE',
  wood_type: row.nguyenlieu || null,
  data: {
    source: 'mcp',
    mcp_id: row.id,
    batchId: row.malo_nguyenlieu || row.p_id || `MCP-${row.id}`,
    malo_nguyenlieu: row.malo_nguyenlieu || null,
    p_id: row.p_id || null,
    orderId: row.madonhang || null,
    orderName: row.donhang || null,
    fsc_name: row.fsc_name || null,
    origin: row.nguongoc || null,
  },
}));

const mapMcpBomItems = (rows = [], orderId = '', productId = '', productCode = '') => rows
  .filter((row) => row && row.chitiet && String(row.nguyenlieu || '0') !== '0')
  .map((row) => {
    const rawDetailId = row.mact || row.id || row.chitiet;
    const detailRowId = `${orderId}__${productId}__${rawDetailId}`;
    return {
      id: detailRowId,
      detailRowId,
      mcp_id: row.id,
      mact: row.mact || null,
      productId,
      productCode,
      orderId,
      name: row.chitiet,
      materialType: row.nguyenlieu || null,
      length: Number(row.dai_tc) || 0,
      width: Number(row.rong_tc) || 0,
      thickness: Number(row.dayy_tc) || 0,
      base_quantity: Number(row.soluong_tc) || 1,
      m3_tc: Number(row.m3_tc) || 0,
      source: 'mcp',
    };
  });

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
    productId: row.id ? `MCP-PROD-LINE-${row.id}` : `MCP-PROD-${orderId || 'ORDER'}-${productCode}`,
    orderId,
    productCode,
    code: productCode,
    detailCode: row.chitiet || null,
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
            const productId = product.id ? `MCP-PROD-LINE-${product.id}` : `MCP-PROD-${order.maddh || 'ORDER'}-${product.masp}`;
            items = mapMcpBomItems(bom.rows || [], order.maddh, productId, product.masp);
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
  return orders;
}

async function syncMcpInventory() {
  const data = await runMcpTemplate('exec_dqt_thongke_phoi_getall', {});
  return mapMcpInventory(data.rows || []);
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
    const text = await response.text();
    throw new Error(`MCP sync to Supabase failed: ${response.status} ${text}`);
  } catch (error) {
    console.warn('MCP sync to Supabase error:', error);
    return { errors: [error.message] };
  }
}

async function syncFromMcp(options = {}) {
  if (mcpSyncInFlight) {
    return mcpSyncInFlight;
  }

  mcpSyncInFlight = (async () => {
    const result = { orders: null, inventory: null, errors: [] };

    try {
      result.orders = await syncMcpOrders(options.orders);
    } catch (error) {
      console.warn('MCP orders sync failed', error);
      result.errors.push(error.message);
    }

    try {
      result.inventory = await syncMcpInventory();
    } catch (error) {
      console.warn('MCP inventory sync failed', error);
      result.errors.push(error.message);
    }

    const supabaseResult = await pushMcpDataToSupabase(result.orders, result.inventory);
    result.supabase = supabaseResult;
    if (supabaseResult?.errors?.length) {
      result.errors.push(...supabaseResult.errors);
    }

    // Refresh memory cache from Supabase
    try {
      await Promise.all([
        db.getOrdersAsync(),
        db.getInventoryAsync(),
      ]);
    } catch (e) {
      console.warn('Failed to refresh data after MCP sync:', e);
    }

    window.dispatchEvent(new CustomEvent('wp:mcp-sync-complete', { detail: result }));
    return result;
  })();

  try {
    return await mcpSyncInFlight;
  } finally {
    mcpSyncInFlight = null;
  }
}

export const db = {
  getOrders: () => _cachedOrders.map(normalizeOrderProductIds),

  getOrdersAsync: async () => {
    try {
      const apiOrders = await ordersApi.getOrders();
      if (apiOrders) {
        _cachedOrders = apiOrders;
        return _cachedOrders;
      }
    } catch (error) {
      console.warn('Failed to load orders from API:', error);
    }
    return _cachedOrders;
  },

  getInventory: () => _cachedInventory,

  getInventoryAsync: async () => {
    try {
      const apiInventory = await inventoryApi.getInventory();
      if (apiInventory) {
        _cachedInventory = apiInventory;
        return _cachedInventory;
      }
    } catch (error) {
      console.warn('Failed to load inventory from API:', error);
    }
    return _cachedInventory;
  },

  getAvailableInventoryAsync: async () => {
    try {
      return await inventoryApi.getAvailableInventory();
    } catch (error) {
      console.warn('Failed to load available inventory:', error);
      return _cachedInventory.filter((item) => item.status === 'AVAILABLE' || !item.status);
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

  consumeInventoryForLot: async (lotId, inputs) => {
    if (!lotId || !inputs || inputs.length === 0) return null;
    return lotsApi.consumeMaterialsForLot(lotId, inputs.map((item) => ({
      inventory_id: item.id,
      quantity_used: Number(item.quantity_used) || 0,
      volume_used: item.volume_used === '' || item.volume_used === undefined || item.volume_used === null
        ? null
        : Number(item.volume_used),
    })));
  },

  getLots: () => _cachedLots,

  getLotsAsync: async () => {
    try {
      const apiLots = await lotsApi.getLots();
      _cachedLots = (apiLots || []).map((l) => {
        const merged = { ...l, ...(l.data || {}) };
        // Sanitize: ensure object-typed fields that should be strings are converted
        if (merged.source_lot_id && typeof merged.source_lot_id === 'object') merged.source_lot_id = null;
        return merged;
      });
      return _cachedLots;
    } catch {
      return _cachedLots;
    }
  },

  getLot: (id) => _cachedLots.find((l) => l.id === id) || null,

  getLotAsync: async (id) => {
    try {
      const lot = await lotsApi.getLot(id);
      if (!lot) return null;
      const merged = { ...lot, ...(lot.data || {}) };
      if (merged.source_lot_id && typeof merged.source_lot_id === 'object') merged.source_lot_id = null;
      return merged;
    } catch {
      const lot = db.getLot(id);
      if (!lot) return null;
      const merged = { ...lot, ...(lot.data || {}) };
      if (merged.source_lot_id && typeof merged.source_lot_id === 'object') merged.source_lot_id = null;
      return merged;
    }
  },

  createLotId: (slipType = 'PHOI_GO') => createReadableLotId(slipType, _cachedLots),

  saveLot: async (lot) => {
    // Build a clean data payload: strip the nested `.data` key so we always
    // persist the *current* top-level properties, not a stale snapshot.
    const { data: _stripNested, ...topLevel } = lot;
    const cleanData = { ...topLevel };

    try {
      const existing = _cachedLots.find((l) => l.id === lot.id);
      if (existing) {
        const updated = await lotsApi.updateLot(lot.id, {
          name: lot.name,
          status: lot.status,
          description: lot.description,
          data: cleanData,
        });
        const idx = _cachedLots.findIndex((l) => l.id === lot.id);
        if (idx >= 0) _cachedLots[idx] = { ..._cachedLots[idx], ...updated, ...(updated.data || {}) };
        return updated;
      }
      const created = await lotsApi.createLot({
        id: lot.id,
        name: lot.name,
        status: lot.status || 'Đang sản xuất',
        slip_type: lot.slip_type || 'PHOI_GO',
        description: lot.description,
        data: cleanData,
      });
      _cachedLots.unshift({ ...created, ...(created.data || {}) });
      return created;
    } catch (error) {
      console.warn('Failed to save lot via API, caching locally:', error);
      const idx = _cachedLots.findIndex((l) => l.id === lot.id);
      const lotMerged = { ...lot, ...(lot.data || {}) };
      if (idx >= 0) {
        _cachedLots[idx] = lotMerged;
      } else {
        _cachedLots.unshift(lotMerged);
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
    _cachedLots = [];
    _cachedOrders = [];
    _cachedInventory = [];
    _cachedCustomRequests = [];
    console.log('Đã reset dữ liệu bộ nhớ cache.');
    window.location.reload();
  },

  saveCustomRequests: async (requests) => {
    const formatted = requests.map((req) => ({
      id: req.id || `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      wood_type: req.woodType || req.wood_type,
      thickness: Number(req.thickness) || 0,
      width: Number(req.width) || 0,
      length: Number(req.length) || 0,
      quantity: Number(req.quantity) || 0,
      reason: req.reason || '',
      status: req.status || 'pending',
      source_molding_lot_id: req.source_molding_lot_id || req.sourceMoldingLotId || null,
      supplemental_lot_id: req.supplemental_lot_id || req.supplementalLotId || null,
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/custom-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formatted),
      });
      if (response.ok) {
        const saved = await response.json();
        _cachedCustomRequests = [...saved, ..._cachedCustomRequests.filter(r => !saved.some(s => s.id === r.id))];
        return saved;
      }
    } catch (error) {
      console.warn('Failed to save custom requests to Supabase:', error);
    }
    return formatted;
  },

  getCustomRequests: () => _cachedCustomRequests,

  getCustomRequestsAsync: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/custom-requests`);
      if (response.ok) {
        _cachedCustomRequests = await response.json();
        return _cachedCustomRequests;
      }
    } catch (error) {
      console.warn('Failed to fetch custom requests from Supabase:', error);
    }
    return _cachedCustomRequests;
  },

  syncFromMcp,
};

if (typeof window !== 'undefined') {
  window.resetDb = db.resetAllData;
}

const defaultOrders = [
  {
    id: 'DH-2026-01', name: 'Đơn hàng Nội thất Vinpearl', products: [
      {
        id: 'SP-001', name: 'Bàn ăn Sồi', quantity: 10, items: [
          { id: 'PT-01', name: 'Phôi chân bàn', length: 750, width: 80, thickness: 80, base_quantity: 4 },
          { id: 'PT-02', name: 'Phôi mặt bàn', length: 1800, width: 200, thickness: 25, base_quantity: 1 },
        ]
      },
      {
        id: 'SP-002', name: 'Ghế ăn Sồi', quantity: 40, items: [
          { id: 'PT-03', name: 'Phôi chân ghế trước', length: 450, width: 50, thickness: 50, base_quantity: 2 },
          { id: 'PT-04', name: 'Phôi chân ghế sau', length: 850, width: 50, thickness: 50, base_quantity: 2 },
          { id: 'PT-05', name: 'Phôi mặt ghế', length: 450, width: 400, thickness: 20, base_quantity: 1 },
        ]
      }
    ]
  },
  {
    id: 'DH-2026-02', name: 'Dự án Tủ áo Gõ đỏ', products: [
      {
        id: 'SP-003', name: 'Tủ quần áo 3 buồng', quantity: 5, items: [
          { id: 'PT-06', name: 'Phôi cánh tủ', length: 2000, width: 500, thickness: 20, base_quantity: 3 },
          { id: 'PT-07', name: 'Phôi hông tủ', length: 2000, width: 600, thickness: 18, base_quantity: 2 },
          { id: 'PT-08', name: 'Phôi đợt kệ', length: 800, width: 580, thickness: 18, base_quantity: 6 },
        ]
      }
    ]
  },
  {
    id: 'DH-2026-03', name: 'Lô xuất khẩu gỗ khối', products: [
      {
        id: 'SP-004', name: 'Phôi tổng hợp Dẻ gai', quantity: 1, items: [
          { id: 'PT-09', name: 'Phôi quy cách A', length: 670, width: 910, thickness: 22, base_quantity: 22 },
          { id: 'PT-10', name: 'Phôi quy cách B', length: 500, width: 400, thickness: 22, base_quantity: 104 },
        ]
      }
    ]
  }
];

const defaultInventory = [
  { id: 'ITEM-1', batchId: 'LÔ-GỖ-NHẬP-001', name: 'THÔNG', length: 3000, width: 150, thickness: 22, quantity: 50, volume: 0.495, type: 'RAW', source_lot_id: null },
  { id: 'ITEM-2', batchId: 'LÔ-GỖ-NHẬP-001', name: 'THÔNG', length: 2000, width: 200, thickness: 25, quantity: 100, volume: 1.000, type: 'RAW', source_lot_id: null },
  { id: 'ITEM-3', batchId: 'LÔ-GỖ-NHẬP-001', name: 'THÔNG', length: 2500, width: 300, thickness: 30, quantity: 20, volume: 0.450, type: 'RAW', source_lot_id: null },
  { id: 'ITEM-4', batchId: 'LÔ-GỖ-NHẬP-001', name: 'THÔNG', length: 1800, width: 120, thickness: 20, quantity: 80, volume: 0.345, type: 'RAW', source_lot_id: null },

  { id: 'ITEM-5', batchId: 'LÔ-GỖ-NHẬP-002', name: 'DẺ GAI', length: 3000, width: 150, thickness: 22, quantity: 50, volume: 0.495, type: 'RAW', source_lot_id: null },
  { id: 'ITEM-6', batchId: 'LÔ-GỖ-NHẬP-002', name: 'THÔNG', length: 2000, width: 200, thickness: 25, quantity: 100, volume: 1.000, type: 'RAW', source_lot_id: null },
  { id: 'ITEM-7', batchId: 'LÔ-GỖ-NHẬP-002', name: 'THÔNG', length: 2500, width: 300, thickness: 30, quantity: 20, volume: 0.450, type: 'RAW', source_lot_id: null },
  { id: 'ITEM-8', batchId: 'LÔ-GỖ-NHẬP-002', name: 'HỒ ĐÀO', length: 1800, width: 120, thickness: 20, quantity: 80, volume: 0.345, type: 'RAW', source_lot_id: null },

  { id: 'ITEM-9', batchId: 'LÔ-GỖ-NHẬP-003', name: 'DẺ GAI', length: 3000, width: 150, thickness: 22, quantity: 50, volume: 0.495, type: 'RAW', source_lot_id: null },
  { id: 'ITEM-10', batchId: 'LÔ-GỖ-NHẬP-003', name: 'CAO SU', length: 2000, width: 200, thickness: 25, quantity: 100, volume: 1.000, type: 'RAW', source_lot_id: null },
  { id: 'ITEM-11', batchId: 'LÔ-GỖ-NHẬP-003', name: 'SỒI', length: 2500, width: 300, thickness: 30, quantity: 20, volume: 0.450, type: 'RAW', source_lot_id: null },
  { id: 'ITEM-12', batchId: 'LÔ-GỖ-NHẬP-003', name: 'HỒ ĐÀO', length: 1800, width: 120, thickness: 20, quantity: 80, volume: 0.345, type: 'RAW', source_lot_id: null },

  { id: 'NL-001', batchId: 'NL-001', name: 'SỒI', length: 2500, width: 300, thickness: 300, quantity: 5, volume: 1.125, type: 'RAW', source_lot_id: null },
  { id: 'PD-102', batchId: 'PD-102', name: 'SỒI', length: 800, width: 100, thickness: 80, quantity: 15, volume: 0.096, type: 'SURPLUS', source_lot_id: 'LSX-OLD-1' },
  { id: 'PD-105', batchId: 'PD-105', name: 'THÔNG', length: 1850, width: 210, thickness: 30, quantity: 5, volume: 0.058, type: 'SURPLUS', source_lot_id: 'LSX-OLD-1' },
  { id: 'NL-002', batchId: 'NL-002', name: 'THÔNG', length: 1200, width: 80, thickness: 40, quantity: 100, volume: 0.384, type: 'RAW', source_lot_id: null },
];

const defaultLots = [
  {
    id: 'LSX-001',
    name: 'Lệnh SX bàn ghế gỗ Sồi',
    date: '2026-04-25',
    status: 'Đang sản xuất',
    description: 'Xẻ từ lô gỗ tròn NL-001',
    inputs: [],
    outputs: []
  },
  {
    id: 'LSX-002',
    name: 'Lệnh SX phôi tồn kho (Gỗ Tần bì)',
    date: '2026-04-24',
    status: 'Hoàn thành',
    description: 'Xẻ dọn kho đợt 1',
    inputs: [],
    outputs: []
  },
];

export function initDb() {
  const currentInv = localStorage.getItem('wp_inventory_v3');
  if (!currentInv) {
    localStorage.setItem('wp_orders', JSON.stringify(defaultOrders));
    localStorage.setItem('wp_inventory_v3', JSON.stringify(defaultInventory));
    localStorage.setItem('wp_lots_v3', JSON.stringify(defaultLots));
  }
}

initDb();

export const db = {
  getOrders: () => {
    const orders = localStorage.getItem('wp_orders_v2');
    if (orders) return JSON.parse(orders);
    localStorage.setItem('wp_orders_v2', JSON.stringify(defaultOrders));
    return defaultOrders;
  },
  getInventory: () => JSON.parse(localStorage.getItem('wp_inventory_v3')),
  addInventory: (items) => {
    const inv = db.getInventory();
    const newInv = [...inv, ...items.map(i => ({ ...i, id: i.id || `INV-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 100)}` }))];
    localStorage.setItem('wp_inventory_v3', JSON.stringify(newInv));
  },
  removeInventory: (ids) => {
    const inv = db.getInventory();
    localStorage.setItem('wp_inventory_v3', JSON.stringify(inv.filter(i => !ids.includes(i.id))));
  },
  getLots: () => JSON.parse(localStorage.getItem('wp_lots_v3')) || [],
  getLot: (id) => db.getLots().find(l => l.id === id),
  saveLot: (lot) => {
    const lots = db.getLots();
    const index = lots.findIndex(l => l.id === lot.id);
    if (index >= 0) {
      lots[index] = lot;
    } else {
      lots.unshift(lot);
    }
    localStorage.setItem('wp_lots_v3', JSON.stringify(lots));
  },
  deleteLot: (id) => {
    const lots = db.getLots();
    localStorage.setItem('wp_lots_v3', JSON.stringify(lots.filter(l => l.id !== id)));
  },

  // Helper for development: Reset all local storage data
  resetAllData: () => {
    localStorage.removeItem('wp_orders');
    localStorage.removeItem('wp_orders_v2');
    localStorage.removeItem('wp_inventory_v3');
    localStorage.removeItem('wp_lots_v3');
    localStorage.removeItem('wp_production_lots_v3');
    console.log("Đã xóa dữ liệu cũ. Reload lại trang để nhận dữ liệu mới từ code.");
    window.location.reload();
  }
};

// Expose to window for easy debugging
if (typeof window !== 'undefined') {
  window.resetDb = db.resetAllData;
}

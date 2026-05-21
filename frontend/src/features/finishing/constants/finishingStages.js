export const FINISHING_STAGES = [
  { id: 'lap-rap', name: 'Lắp ráp', order: 1 },
  { id: 'nham', name: 'Nhám', order: 2 },
  { id: 'truoc-son-pallet', name: 'Trước sơn pallet', order: 3 },
  { id: 'son-pallet', name: 'Sơn pallet', order: 4 },
  { id: 'truoc-son-bang-tai', name: 'Trước sơn băng tải', order: 5 },
  { id: 'son-bang-tai', name: 'Sơn băng tải', order: 6 },
  { id: 'son-chuyen-treo', name: 'Sơn chuyền treo', order: 7 },
  { id: 'son-lot', name: 'Sơn lót', order: 8 },
  { id: 'son-pu', name: 'Sơn PU', order: 9 },
  { id: 'son', name: 'Sơn', order: 10 },
  { id: 'dong-goi-sau', name: 'Đóng gói (Sau)', order: 11 }
];

export const ASSEMBLY_STAGES = [
  { id: 'lap-rap', name: 'Lắp ráp', order: 1 },
  { id: 'nham', name: 'Nhám', order: 2 },
  { id: 'truoc-son-pallet', name: 'Trước sơn pallet', order: 3 },
  { id: 'truoc-son-bang-tai', name: 'Trước sơn băng tải', order: 4 }
];

export const PAINTING_STAGES = [
  { id: 'son-lot', name: 'Sơn lót', order: 1 },
  { id: 'son-pallet', name: 'Sơn pallet', order: 2 },
  { id: 'son-bang-tai', name: 'Sơn băng tải', order: 3 },
  { id: 'son-chuyen-treo', name: 'Sơn chuyền treo', order: 4 },
  { id: 'son-pu', name: 'Sơn PU', order: 5 },
  { id: 'son', name: 'Sơn', order: 6 }
];

export const PACKING_STAGES = [
  { id: 'dong-goi-sau', name: 'Đóng gói (Sau)', order: 1 }
];

export const FINISHING_SLIP_CONFIGS = {
  ASSEMBLY: {
    slipType: 'ASSEMBLY',
    label: 'Lắp ráp',
    shortLabel: 'Lắp ráp',
    defaultName: 'Phiếu lắp ráp đơn hàng mới',
    autoNamePrefix: 'Phiếu lắp ráp',
    inventoryName: 'Bán thành phẩm sau lắp ráp',
    inventoryType: 'SEMIFINISHED',
    stages: ASSEMBLY_STAGES
  },
  PAINTING: {
    slipType: 'PAINTING',
    label: 'Sơn',
    shortLabel: 'Sơn',
    defaultName: 'Phiếu sơn đơn hàng mới',
    autoNamePrefix: 'Phiếu sơn',
    inventoryName: 'Bán thành phẩm sau sơn',
    inventoryType: 'SEMIFINISHED',
    stages: PAINTING_STAGES
  },
  PACKING: {
    slipType: 'PACKING',
    label: 'Đóng gói',
    shortLabel: 'Đóng gói',
    defaultName: 'Phiếu đóng gói đơn hàng mới',
    autoNamePrefix: 'Phiếu đóng gói',
    inventoryName: 'Thành phẩm đóng gói',
    inventoryType: 'FINISHED',
    stages: PACKING_STAGES
  }
};

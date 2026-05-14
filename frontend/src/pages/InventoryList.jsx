import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers,
  Package,
  Search,
} from 'lucide-react';
import { db } from '../services/db';
import { removeVietnameseTones } from '../utils/stringUtils';
import { normalizeInventoryType } from '../utils/inventoryTypes';

const PAGE_SIZE = 15;

const WAREHOUSE_TABS = [
  {
    id: 'WOOD_BLANKS',
    label: 'Kho phôi gỗ',
    description: 'Nguyên liệu, phôi đã xẻ và phôi dư còn dùng cho sản xuất.',
  },
  {
    id: 'MOLDING_OUTPUTS',
    label: 'Kho thành phẩm định hình',
    description: 'Thành phẩm được nhập kho từ công đoạn định hình trở đi.',
  },
];

const TYPE_FILTERS = {
  WOOD_BLANKS: [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'RAW', label: 'Nguyên liệu' },
    { id: 'SEMIFINISHED', label: 'Phôi' },
    { id: 'SURPLUS', label: 'Phôi dư' },
    { id: 'WASTE', label: 'Phế phẩm' },
  ],
  MOLDING_OUTPUTS: [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'SEMIFINISHED', label: 'Thành phẩm' },
    { id: 'SURPLUS', label: 'Hàng dư' },
    { id: 'WASTE', label: 'Phế phẩm' },
  ],
};

const isMoldingLot = (lot) => {
  if (!lot) return false;
  const id = String(lot.id || '').toUpperCase();
  const name = removeVietnameseTones(lot.name || '');
  return lot.slip_type === 'DINH_HINH' || id.startsWith('DDH-') || name.includes('dinh hinh');
};

const getItemWarehouse = (item, lotMap) => {
  const sourceLot = lotMap.get(item.source_lot_id);
  if (isMoldingLot(sourceLot)) return 'MOLDING_OUTPUTS';

  const sourceId = String(item.source_lot_id || '').toUpperCase();
  if (sourceId.startsWith('DDH-')) return 'MOLDING_OUTPUTS';

  return 'WOOD_BLANKS';
};

const getTypeBadge = (item, warehouseTab) => {
  const type = normalizeInventoryType(item);
  if (type === 'RAW') {
    return <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">NGUYÊN LIỆU</span>;
  }
  if (type === 'SEMIFINISHED' && warehouseTab === 'MOLDING_OUTPUTS') {
    return <span className="inline-block px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold">THÀNH PHẨM</span>;
  }
  if (type === 'SEMIFINISHED') {
    return <span className="inline-block px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold">PHÔI</span>;
  }
  if (type === 'SURPLUS') {
    return <span className="inline-block px-2 py-1 bg-amber-50 text-amber-700 rounded text-[10px] font-bold">PHÔI DƯ</span>;
  }
  if (type === 'WASTE') {
    return <span className="inline-block px-2 py-1 bg-red-50 text-red-600 rounded text-[10px] font-bold">PHẾ PHẨM</span>;
  }
  return <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">{type}</span>;
};

const formatNumber = (value, digits = 0) => {
  const numeric = Number(value) || 0;
  return digits > 0 ? numeric.toFixed(digits) : numeric.toLocaleString('vi-VN');
};

const isValidWarehouseTab = (tabId) => WAREHOUSE_TABS.some((tab) => tab.id === tabId);

export default function InventoryList({ initialTab = 'WOOD_BLANKS', onWarehouseTabChange }) {
  const [inventory, setInventory] = useState([]);
  const [lots, setLots] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilters, setTypeFilters] = useState({ WOOD_BLANKS: 'ALL', MOLDING_OUTPUTS: 'ALL' });
  const [activeTab, setActiveTab] = useState(isValidWarehouseTab(initialTab) ? initialTab : 'WOOD_BLANKS');
  const [pages, setPages] = useState({ WOOD_BLANKS: 1, MOLDING_OUTPUTS: 1 });

  useEffect(() => {
    if (isValidWarehouseTab(initialTab) && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [activeTab, initialTab]);

  useEffect(() => {
    const refreshLocalData = () => {
      setInventory(db.getInventory());
      setLots(db.getLots());
    };

    refreshLocalData();
    db.syncFromMcp({ orders: { maxOrders: 20, detailOrderLimit: 5, bomProductLimit: 3 } })
      .then(refreshLocalData)
      .catch(refreshLocalData);
  }, []);

  const lotMap = useMemo(() => new Map(lots.map((lot) => [lot.id, lot])), [lots]);
  const term = removeVietnameseTones(search);

  const tabInventory = useMemo(() => {
    return inventory.filter((item) => getItemWarehouse(item, lotMap) === activeTab);
  }, [activeTab, inventory, lotMap]);

  const filteredInventory = useMemo(() => {
    const activeTypeFilter = typeFilters[activeTab] || 'ALL';
    return tabInventory.filter((item) => {
      const matchesType = activeTypeFilter === 'ALL' || normalizeInventoryType(item) === activeTypeFilter;
      const matchesSearch = !term || (
        removeVietnameseTones(item.name || '').includes(term) ||
        removeVietnameseTones(item.id || '').includes(term) ||
        removeVietnameseTones(item.batchId || '').includes(term) ||
        removeVietnameseTones(item.source_lot_id || '').includes(term)
      );
      return matchesType && matchesSearch;
    });
  }, [activeTab, tabInventory, term, typeFilters]);

  const currentPage = pages[activeTab] || 1;
  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedInventory = filteredInventory.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totalVolume = filteredInventory.reduce((sum, item) => sum + (Number(item.volume) || 0), 0);
  const totalQuantity = filteredInventory.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const setActivePage = (page) => {
    setPages((prev) => ({ ...prev, [activeTab]: Math.min(Math.max(1, page), totalPages) }));
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    onWarehouseTabChange?.(tabId);
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setPages((prev) => ({ ...prev, [activeTab]: 1 }));
  };

  const handleTypeFilterChange = (type) => {
    setTypeFilters((prev) => ({ ...prev, [activeTab]: type }));
    setPages((prev) => ({ ...prev, [activeTab]: 1 }));
  };

  const activeTabInfo = WAREHOUSE_TABS.find((tab) => tab.id === activeTab);
  const activeTypeFilter = typeFilters[activeTab] || 'ALL';
  const availableTypeFilters = TYPE_FILTERS[activeTab] || TYPE_FILTERS.WOOD_BLANKS;

  return (
    <div className="w-full min-h-screen bg-warm-white text-notion-black font-sans">
      <div className="max-w-[1120px] mx-auto px-3 md:px-5 py-6 md:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
          <div>
            <h1 className="text-[28px] sm:text-[32px] font-bold tracking-[-1px] leading-tight flex items-center gap-3">
              <Archive className="text-notion-blue" size={28} />
              Quản lý kho
            </h1>
            <p className="text-[14px] text-warm-gray-500 mt-1">
              Tách riêng kho phôi gỗ và kho thành phẩm sau định hình để dễ theo dõi tồn.
            </p>
          </div>
        </div>

        <div className="mb-5 border-b border-whisper md:hidden">
          <div className="flex items-end gap-1 overflow-x-auto">
            {WAREHOUSE_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = inventory.filter((item) => getItemWarehouse(item, lotMap) === tab.id).length;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative px-4 py-2.5 text-left whitespace-nowrap transition ${
                    isActive
                      ? 'text-notion-blue'
                      : 'text-warm-gray-500 hover:text-notion-black'
                  }`}
                >
                  <span className="text-[14px] font-bold">{tab.label}</span>
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    isActive ? 'bg-blue-50 text-notion-blue' : 'bg-warm-white text-warm-gray-400'
                  }`}>
                    {count.toLocaleString('vi-VN')}
                  </span>
                  {isActive && (
                    <span className="absolute left-3 right-3 bottom-[-1px] h-[2px] rounded-full bg-notion-blue" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-3">
          <div>
            <div className="text-[15px] font-bold">{activeTabInfo?.label}</div>
            <div className="text-[12px] text-warm-gray-500 mt-0.5">
              Hiển thị {pagedInventory.length} / {filteredInventory.length} mục phù hợp
            </div>
          </div>

          <div className="relative w-full md:w-[320px] shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray-300" />
            <input
              type="text"
              placeholder="Tìm theo mã, loại gỗ, lệnh SX..."
              className="w-full bg-notion-white border border-whisper rounded-[6px] pl-8 pr-3 py-[8px] text-[13px] focus:outline-none focus:ring-1 focus:ring-notion-blue/30 focus:border-notion-blue transition"
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-5">
          {availableTypeFilters.map((filter) => {
            const isActive = activeTypeFilter === filter.id;
            const count = filter.id === 'ALL'
              ? tabInventory.length
              : tabInventory.filter((item) => normalizeInventoryType(item) === filter.id).length;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => handleTypeFilterChange(filter.id)}
                className={`h-8 rounded-full border px-3 text-[12px] font-semibold transition ${
                  isActive
                    ? 'border-notion-blue bg-blue-50 text-notion-blue'
                    : 'border-whisper bg-white text-warm-gray-500 hover:border-warm-gray-300 hover:text-notion-black'
                }`}
              >
                {filter.label}
                <span className={`ml-1.5 ${isActive ? 'text-notion-blue' : 'text-warm-gray-400'}`}>
                  {count.toLocaleString('vi-VN')}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
          <div className="bg-white border border-whisper rounded-[8px] p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Layers size={20} />
            </div>
            <div>
              <div className="text-[12px] font-semibold text-warm-gray-400 uppercase tracking-wider mb-0.5">Tổng số lượng</div>
              <div className="text-2xl font-bold">{formatNumber(totalQuantity)}</div>
            </div>
          </div>
          <div className="bg-white border border-whisper rounded-[8px] p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Package size={20} />
            </div>
            <div>
              <div className="text-[12px] font-semibold text-warm-gray-400 uppercase tracking-wider mb-0.5">Tổng khối lượng (m³)</div>
              <div className="text-2xl font-bold">{formatNumber(totalVolume, 4)}</div>
            </div>
          </div>
        </div>

        <div className="bg-notion-white border border-whisper rounded-[8px] shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-[13px]">
              <thead className="text-[11px] uppercase text-warm-gray-400 tracking-[0.5px] bg-warm-white border-b border-whisper">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold w-[12%]">Phân loại</th>
                  <th className="px-4 py-3 text-left font-semibold w-[18%]">Loại gỗ</th>
                  <th className="px-4 py-3 text-center font-semibold w-[20%]">Quy cách (Dày x Rộng x Dài)</th>
                  <th className="px-4 py-3 text-right font-semibold w-[10%]">Số lượng</th>
                  <th className="px-4 py-3 text-right font-semibold w-[15%]">Khối lượng (m³)</th>
                  <th className="px-4 py-3 text-left font-semibold w-[25%]">Nguồn gốc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-whisper">
                {pagedInventory.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-warm-gray-300 text-[13px]">
                      Không tìm thấy dữ liệu kho phù hợp.
                    </td>
                  </tr>
                ) : (
                  pagedInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-warm-white/60 transition">
                      <td className="px-4 py-3">{getTypeBadge(item, activeTab)}</td>
                      <td className="px-4 py-3 font-semibold text-notion-black">{item.name || '--'}</td>
                      <td className="px-4 py-3 text-center text-warm-gray-600">
                        {item.thickness && item.thickness !== 0 ? item.thickness : '~D'} x{' '}
                        {item.width && item.width !== 0 ? item.width : '~R'} x{' '}
                        {item.length && item.length !== 0 ? item.length : '~L'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">
                        {item.quantity && item.quantity !== 0 ? formatNumber(item.quantity) : '--'}
                      </td>
                      <td className="px-4 py-3 text-right text-notion-blue font-semibold tabular-nums">
                        {formatNumber(item.volume, 4)}
                      </td>
                      <td className="px-4 py-3 text-warm-gray-500">
                        {item.batchId ? (
                          <span className="flex items-center gap-1.5">
                            <ArrowLeftRight size={13} className="text-blue-400" /> Nhập lô: {item.batchId}
                          </span>
                        ) : item.source_lot_id ? (
                          <span className="flex items-center gap-1.5">
                            <FileText size={13} className="text-orange-400" /> Lệnh SX: {item.source_lot_id}
                          </span>
                        ) : (
                          <span className="italic">Không xác định</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-whisper bg-white">
            <div className="text-[12px] text-warm-gray-500">
              Trang {safePage} / {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActivePage(safePage - 1)}
                disabled={safePage <= 1}
                className="h-8 px-3 rounded-[6px] border border-whisper text-[12px] font-semibold text-warm-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-warm-white flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Trước
              </button>
              <button
                type="button"
                onClick={() => setActivePage(safePage + 1)}
                disabled={safePage >= totalPages}
                className="h-8 px-3 rounded-[6px] border border-whisper text-[12px] font-semibold text-warm-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-warm-white flex items-center gap-1"
              >
                Sau <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

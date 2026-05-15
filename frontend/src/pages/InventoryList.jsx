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
  Boxes,
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
    return <span className="badge-pill badge-primary">NGUYÊN LIỆU</span>;
  }
  if (type === 'SEMIFINISHED' && warehouseTab === 'MOLDING_OUTPUTS') {
    return <span className="badge-pill badge-success">THÀNH PHẨM</span>;
  }
  if (type === 'SEMIFINISHED') {
    return <span className="badge-pill badge-success">PHÔI</span>;
  }
  if (type === 'SURPLUS') {
    return <span className="badge-pill badge-warning">PHÔI DƯ</span>;
  }
  if (type === 'WASTE') {
    return <span className="badge-pill badge-danger">PHẾ PHẨM</span>;
  }
  return <span className="badge-pill badge-neutral">{type}</span>;
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

  const setActivePage = (p) => {
    setPages((prev) => ({ ...prev, [activeTab]: Math.min(Math.max(1, p), totalPages) }));
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
    <div className="w-full min-h-screen font-sans" style={{ background: 'var(--color-app-bg)', color: 'var(--color-text-primary)' }}>
      <div className="max-w-[1120px] mx-auto px-4 md:px-6 py-6 md:py-8">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
          <div>
            <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight leading-tight">
              Quản lý kho
            </h1>
            <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              Quản lý tồn kho nguyên liệu, phôi và thành phẩm của xưởng.
            </p>
          </div>
        </div>

        {/* Mobile warehouse tabs */}
        <div className="mb-5 md:hidden" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-end gap-1 overflow-x-auto">
            {WAREHOUSE_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = inventory.filter((item) => getItemWarehouse(item, lotMap) === tab.id).length;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className="relative px-4 py-2.5 text-left whitespace-nowrap transition-colors"
                  style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}
                >
                  <span className="text-[14px] font-bold">{tab.label}</span>
                  <span
                    className="ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{
                      background: isActive ? 'var(--color-primary-soft)' : 'var(--color-border-light)',
                      color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    }}
                  >
                    {count.toLocaleString('vi-VN')}
                  </span>
                  {isActive && (
                    <span
                      className="absolute left-3 right-3 bottom-[-1px] h-[2px] rounded-full"
                      style={{ background: 'var(--color-primary)' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
          <div
            className="flex items-center gap-4 p-4 rounded-xl transition-shadow"
            style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--color-primary-soft)' }}
            >
              <Layers size={20} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Tổng số lượng</div>
              <div className="text-[24px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{formatNumber(totalQuantity)}</div>
            </div>
          </div>
          <div
            className="flex items-center gap-4 p-4 rounded-xl transition-shadow"
            style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--color-success-soft)' }}
            >
              <Boxes size={20} style={{ color: 'var(--color-success)' }} />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Tổng khối lượng (m³)</div>
              <div className="text-[24px] font-bold" style={{ color: 'var(--color-text-primary)' }}>{formatNumber(totalVolume, 4)}</div>
            </div>
          </div>
        </div>

        {/* Filter & search row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <div className="text-[15px] font-bold">{activeTabInfo?.label}</div>
            <div className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              Hiển thị {pagedInventory.length} / {filteredInventory.length} kết quả
            </div>
          </div>
          <div className="relative w-full md:w-[300px] shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Tìm theo mã, loại gỗ, lệnh SX..."
              className="w-full rounded-lg pl-9 pr-3 py-2 text-[13px] transition-all"
              style={{ background: 'white', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', outline: 'none' }}
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-soft)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
        </div>

        {/* Type filter pills */}
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
                className="h-8 rounded-full px-3.5 text-[12.5px] font-semibold transition-all"
                style={{
                  border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: isActive ? 'var(--color-primary-soft)' : 'white',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                }}
              >
                {filter.label}
                <span
                  className="ml-1.5"
                  style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
                >
                  {count.toLocaleString('vi-VN')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Table card */}
        <div
          className="overflow-hidden"
          style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-border)', borderRadius: '10px', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-[13px]">
              <thead style={{ background: 'var(--color-border-light)', borderBottom: '1px solid var(--color-border)' }}>
                <tr>
                  <th className="px-5 py-3.5 text-left font-semibold w-[12%] text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Phân loại</th>
                  <th className="px-5 py-3.5 text-left font-semibold w-[18%] text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Loại gỗ</th>
                  <th className="px-5 py-3.5 text-center font-semibold w-[20%] text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Quy cách (Dày × Rộng × Dài)</th>
                  <th className="px-5 py-3.5 text-right font-semibold w-[10%] text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Số lượng</th>
                  <th className="px-5 py-3.5 text-right font-semibold w-[15%] text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Khối lượng (m³)</th>
                  <th className="px-5 py-3.5 text-left font-semibold w-[25%] text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Nguồn gốc</th>
                </tr>
              </thead>
              <tbody>
                {pagedInventory.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                      Không tìm thấy dữ liệu kho phù hợp.
                    </td>
                  </tr>
                ) : (
                  pagedInventory.map((item) => (
                    <tr
                      key={item.id}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid var(--color-border-light)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-app-bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td className="px-5 py-3.5">{getTypeBadge(item, activeTab)}</td>
                      <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--color-text-primary)' }}>{item.name || '--'}</td>
                      <td className="px-5 py-3.5 text-center" style={{ color: 'var(--color-text-secondary)' }}>
                        {item.thickness && item.thickness !== 0 ? item.thickness : '~D'} ×{' '}
                        {item.width && item.width !== 0 ? item.width : '~R'} ×{' '}
                        {item.length && item.length !== 0 ? item.length : '~L'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold tabular-nums">
                        {item.quantity && item.quantity !== 0 ? formatNumber(item.quantity) : '--'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums" style={{ color: 'var(--color-primary)' }}>
                        {formatNumber(item.volume, 4)}
                      </td>
                      <td className="px-5 py-3.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {item.batchId ? (
                          <span className="flex items-center gap-1.5">
                            <ArrowLeftRight size={13} style={{ color: 'var(--color-primary)' }} />
                            Nhập lô: {item.batchId}
                          </span>
                        ) : item.source_lot_id ? (
                          <span className="flex items-center gap-1.5">
                            <FileText size={13} style={{ color: 'var(--color-warning)' }} />
                            Lệnh SX: {item.source_lot_id}
                          </span>
                        ) : (
                          <span className="italic" style={{ color: 'var(--color-text-muted)' }}>Không xác định</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3"
            style={{ borderTop: '1px solid var(--color-border-light)', background: 'var(--color-card-bg)' }}
          >
            <div className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
              Trang <strong>{safePage}</strong> / <strong>{totalPages}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActivePage(safePage - 1)}
                disabled={safePage <= 1}
                className="h-8 px-3 rounded-lg text-[12px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.background = 'var(--color-app-bg)')}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <ChevronLeft size={14} /> Trước
              </button>
              <button
                type="button"
                onClick={() => setActivePage(safePage + 1)}
                disabled={safePage >= totalPages}
                className="h-8 px-3 rounded-lg text-[12px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.background = 'var(--color-app-bg)')}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
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

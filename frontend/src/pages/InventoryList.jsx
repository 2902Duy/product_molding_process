import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers,
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
    label: 'Kho nguyên liệu / phôi',
    description: 'Nguyên liệu, phôi đã xẻ và phôi dư còn dùng cho sản xuất.',
  },
  {
    id: 'MOLDING_OUTPUTS',
    label: 'Kho sản xuất',
    description: 'Chi tiết sau định hình, bán thành phẩm và thành phẩm hoàn chỉnh.',
  },
];

const CATEGORY_FILTERS = {
  WOOD_BLANKS: [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'RAW_MATERIAL', label: 'Nguyên liệu / gỗ nhập' },
    { id: 'WOOD_BLANK', label: 'Phôi' },
    { id: 'WOOD_SURPLUS', label: 'Phôi dư' },
    { id: 'WASTE', label: 'Phế phẩm' },
  ],
  MOLDING_OUTPUTS: [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'DETAIL', label: 'Chi tiết định hình' },
    { id: 'SEMI_PRODUCT', label: 'Đang sản xuất' },
    { id: 'FINISHED_PRODUCT', label: 'Sản phẩm hoàn chỉnh' },
  ],
};

const STATUS_FILTERS = [
  { id: 'ALL', label: 'Tất cả trạng thái' },
  { id: 'available', label: 'Khả dụng' },
  { id: 'allocated', label: 'Đang dùng' },
  { id: 'consumed', label: 'Đã dùng' },
];

const isMoldingLot = (lot) => {
  if (!lot) return false;
  const id = String(lot.id || '').toUpperCase();
  const name = removeVietnameseTones(lot.name || '');
  return lot.slip_type === 'DINH_HINH' || id.startsWith('DDH-') || name.includes('dinh hinh');
};

const getSourceSlipType = (item, lotMap) => {
  const sourceLot = lotMap.get(item.source_lot_id);
  if (sourceLot?.slip_type) return sourceLot.slip_type;
  const sourceId = String(item.source_lot_id || '').toUpperCase();
  if (sourceId.startsWith('DDH-')) return 'DINH_HINH';
  if (sourceId.startsWith('LR-')) return 'ASSEMBLY';
  if (sourceId.startsWith('SON-')) return 'PAINTING';
  if (sourceId.startsWith('DG-')) return 'PACKING';
  if (isMoldingLot(sourceLot)) return 'DINH_HINH';
  return '';
};

const getItemCategory = (item, lotMap) => {
  if (item.stock_category) return item.stock_category;

  const type = normalizeInventoryType(item);
  const sourceSlipType = getSourceSlipType(item, lotMap);

  if (type === 'FINISHED' || sourceSlipType === 'PACKING') return 'FINISHED_PRODUCT';
  if (sourceSlipType === 'DINH_HINH') return 'DETAIL';
  if (sourceSlipType === 'ASSEMBLY' || sourceSlipType === 'PAINTING') return 'SEMI_PRODUCT';
  if (type === 'SURPLUS') return 'WOOD_SURPLUS';
  if (type === 'SEMIFINISHED') return 'WOOD_BLANK';
  if (type === 'WASTE') return 'WASTE';
  return 'RAW_MATERIAL';
};

const getItemWarehouse = (item, lotMap) => {
  const category = getItemCategory(item, lotMap);
  return ['DETAIL', 'SEMI_PRODUCT', 'FINISHED_PRODUCT'].includes(category)
    ? 'MOLDING_OUTPUTS'
    : 'WOOD_BLANKS';
};

const isSameDimension = (a, b) =>
  Number(a.thickness) === Number(b.thickness) &&
  Number(a.width) === Number(b.width) &&
  Number(a.length) === Number(b.length);

const isHandoffLot = (lot) =>
  lot?.is_handoff || (lot?.source_lot_id && lot?.handoff_lot_id === lot?.id);

const getDownstreamHandoffQty = (item, lots, lotMap) => {
  const sourceLotId = item.source_lot_id;
  if (!sourceLotId) return 0;

  const category = getItemCategory(item, lotMap);
  if (category === 'FINISHED_PRODUCT') return 0;

  const downstreamHandoffs = lots.filter((lot) => (
    isHandoffLot(lot) &&
    lot.source_lot_id === sourceLotId
  ));

  if (category === 'DETAIL') {
    return downstreamHandoffs.reduce((sum, lot) => {
      const matchedQty = (lot.details || [])
        .filter((row) => {
          if (item.source_detail_id && row.source_detail_id) {
            return item.source_detail_id === row.source_detail_id;
          }
          return (row.semiFinishedName || row.name || '') === (item.name || '') && isSameDimension(row, item);
        })
        .reduce((rowSum, row) => rowSum + (Number(row.quantity) || 0), 0);
      return sum + matchedQty;
    }, 0);
  }

  if (category === 'SEMI_PRODUCT') {
    return downstreamHandoffs.reduce((sum, lot) => {
      const matchedQty = (lot.targetProducts || [])
        .filter((product) => {
          if (item.product_id && product.id) return item.product_id === product.id;
          return (product.name || '') === (item.name || '');
        })
        .reduce((productSum, product) => productSum + (Number(product.quantity_produce ?? product.quantity) || 0), 0);
      return sum + matchedQty;
    }, 0);
  }

  return 0;
};

const getStockStatus = (item, lots = [], lotMap = new Map()) => {
  if (getItemCategory(item, lotMap) === 'FINISHED_PRODUCT') return 'available';

  const itemQty = Number(item.quantity) || 0;
  const downstreamQty = getDownstreamHandoffQty(item, lots, lotMap);
  if (itemQty > 0 && downstreamQty >= itemQty) return 'allocated';

  const status = String(item.stock_status || '').trim();
  if (status === 'consumed') return status;
  return 'available';
};

const getStatusBadge = (item, lots, lotMap) => {
  const status = getStockStatus(item, lots, lotMap);
  if (status === 'allocated') {
    return <span className="badge-pill badge-warning">Đang dùng</span>;
  }
  if (status === 'consumed') {
    return <span className="badge-pill badge-neutral">Đã dùng</span>;
  }
  return <span className="badge-pill badge-success">Khả dụng</span>;
};

const formatNumber = (value, digits = 0) => {
  const numeric = Number(value) || 0;
  return digits > 0 ? numeric.toFixed(digits) : numeric.toLocaleString('vi-VN');
};

const hasDimensions = (item) =>
  Number(item.thickness) > 0 && Number(item.width) > 0 && Number(item.length) > 0;

const isValidWarehouseTab = (tabId) => WAREHOUSE_TABS.some((tab) => tab.id === tabId);

export default function InventoryList({ initialTab = 'WOOD_BLANKS', onWarehouseTabChange }) {
  const [inventory, setInventory] = useState([]);
  const [lots, setLots] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilters, setCategoryFilters] = useState({ WOOD_BLANKS: 'ALL', MOLDING_OUTPUTS: 'ALL' });
  const [statusFilter, setStatusFilter] = useState('available');
  const [activeTab, setActiveTab] = useState(isValidWarehouseTab(initialTab) ? initialTab : 'WOOD_BLANKS');
  const [pages, setPages] = useState({ WOOD_BLANKS: 1, MOLDING_OUTPUTS: 1 });

  useEffect(() => {
    if (isValidWarehouseTab(initialTab) && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [activeTab, initialTab]);

  useEffect(() => {
    const refreshLocalData = async () => {
      const [inv, lotData] = await Promise.all([
        db.getInventoryAsync(),
        db.getLotsAsync(),
      ]);
      setInventory(inv);
      setLots(lotData);
    };
    refreshLocalData();
    db.syncFromMcp({ orders: { maxOrders: 20, detailOrderLimit: 5, bomProductLimit: 3 } })
      .then(refreshLocalData)
      .catch(refreshLocalData);
  }, []);

  const lotMap = useMemo(() => new Map(lots.map((lot) => [lot.id, lot])), [lots]);
  const term = removeVietnameseTones(search);

  const filteredInventory = useMemo(() => {
    const activeCategoryFilter = categoryFilters[activeTab] || 'ALL';
    return inventory.filter((item) => {
      const itemWarehouse = getItemWarehouse(item, lotMap);
      const itemCategory = getItemCategory(item, lotMap);
      const matchesWarehouse = itemWarehouse === activeTab;
      const matchesCategory = activeCategoryFilter === 'ALL' || itemCategory === activeCategoryFilter;
      const itemStatus = getStockStatus(item, lots, lotMap);
      const matchesStatus = statusFilter === 'ALL' || itemStatus === statusFilter;
      const matchesSearch = !term || (
        removeVietnameseTones(item.name || '').includes(term) ||
        removeVietnameseTones(item.id || '').includes(term) ||
        removeVietnameseTones(item.batchId || '').includes(term) ||
        removeVietnameseTones(item.source_lot_id || '').includes(term)
      );
      return matchesWarehouse && matchesCategory && matchesStatus && matchesSearch;
    });
  }, [activeTab, categoryFilters, inventory, lots, lotMap, statusFilter, term]);

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

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setPages((prev) => ({ ...prev, [activeTab]: 1 }));
  };

  const activeTabInfo = WAREHOUSE_TABS.find((tab) => tab.id === activeTab);
  const activeCategoryFilter = categoryFilters[activeTab] || 'ALL';
  const availableCategoryFilters = CATEGORY_FILTERS[activeTab] || CATEGORY_FILTERS.WOOD_BLANKS;

  const handleCategoryFilterChange = (category) => {
    setCategoryFilters((prev) => ({ ...prev, [activeTab]: category }));
    setPages((prev) => ({ ...prev, [activeTab]: 1 }));
  };

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
              const count = inventory.filter((item) => (
                getItemWarehouse(item, lotMap) === tab.id &&
                (statusFilter === 'ALL' || getStockStatus(item, lots, lotMap) === statusFilter)
              )).length;
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
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12.5px] font-semibold text-slate-600 outline-none focus:border-emerald-400"
            >
              {STATUS_FILTERS.map((filter) => (
                <option key={filter.id} value={filter.id}>{filter.label}</option>
              ))}
            </select>
            <div className="relative w-full md:w-[300px] shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                placeholder="Tìm theo mã, tên hàng, lệnh SX..."
                className="w-full rounded-lg pl-9 pr-3 py-2 text-[13px] transition-all"
                style={{ background: 'white', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', outline: 'none' }}
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-soft)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
          </div>
        </div>

        {/* Category filter pills */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {availableCategoryFilters.map((filter) => {
            const isActive = activeCategoryFilter === filter.id;
            const count = filter.id === 'ALL'
              ? inventory.filter((item) => (
                getItemWarehouse(item, lotMap) === activeTab &&
                (statusFilter === 'ALL' || getStockStatus(item, lots, lotMap) === statusFilter)
              )).length
              : inventory.filter((item) => (
                getItemWarehouse(item, lotMap) === activeTab &&
                getItemCategory(item, lotMap) === filter.id &&
                (statusFilter === 'ALL' || getStockStatus(item, lots, lotMap) === statusFilter)
              )).length;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => handleCategoryFilterChange(filter.id)}
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
                  <th className="px-5 py-3.5 text-left font-semibold w-[12%] text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Trạng thái</th>
                  <th className="px-5 py-3.5 text-left font-semibold w-[24%] text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Tên hàng</th>
                  <th className="px-5 py-3.5 text-center font-semibold w-[20%] text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Quy cách (Dày × Rộng × Dài)</th>
                  <th className="px-5 py-3.5 text-right font-semibold w-[10%] text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Số lượng</th>
                  <th className="px-5 py-3.5 text-right font-semibold w-[14%] text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Khối lượng (m³)</th>
                  <th className="px-5 py-3.5 text-left font-semibold w-[20%] text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Nguồn gốc</th>
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
                      <td className="px-5 py-3.5">{getStatusBadge(item, lots, lotMap)}</td>
                      <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--color-text-primary)' }}>{item.name || '--'}</td>
                      <td className="px-5 py-3.5 text-center" style={{ color: 'var(--color-text-secondary)' }}>
                        {hasDimensions(item)
                          ? `${item.thickness} × ${item.width} × ${item.length}`
                          : '--'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold tabular-nums">
                        {item.quantity && item.quantity !== 0 ? formatNumber(item.quantity) : '--'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums" style={{ color: 'var(--color-primary)' }}>
                        {Number(item.volume) > 0 ? formatNumber(item.volume, 4) : '--'}
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

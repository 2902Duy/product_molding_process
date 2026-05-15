import { useEffect, useState } from 'react';
import { Search, ArrowRight, Plus, Trash2, X, Layers, Square, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../services/db';
import { removeVietnameseTones } from '../utils/stringUtils';

export default function ProductionLotList({ onNavigate }) {
  const [search, setSearch] = useState('');
  const [lots, setLots] = useState([]);
  const [slipFilter, setSlipFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });

  const closeModal = () => setModal((prev) => ({ ...prev, isOpen: false }));

  useEffect(() => {
    const syncLots = () => setLots(db.getLots());
    syncLots();
    window.addEventListener('focus', syncLots);
    return () => window.removeEventListener('focus', syncLots);
  }, []);

  const handleDelete = (e, id) => {
    e.stopPropagation();
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Xác nhận xoá',
      message: 'Bạn có chắc muốn xoá phiếu sản xuất này không? Hành động này không thể hoàn tác.',
      onConfirm: () => {
        db.deleteLot(id);
        setLots(db.getLots());
        closeModal();
      }
    });
  };

  const handleCreateSlip = (slipType) => {
    setShowCreateModal(false);
    if (slipType === 'PHOI_GO') {
      onNavigate('lot-detail');
    } else {
      onNavigate('molding-production-slip', { lotId: 'new' });
    }
  };

  const filteredLots = lots.filter((lot) => {
    const term = removeVietnameseTones(search);
    const matchesSearch = removeVietnameseTones(lot.name || '').includes(term) ||
      removeVietnameseTones(lot.id || '').includes(term);
    const matchesFilter = slipFilter === 'ALL' || lot.slip_type === slipFilter;
    return matchesSearch && matchesFilter;
  });

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredLots.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedLots = filteredLots.slice((safePage - 1) * pageSize, safePage * pageSize);
  const resetPage = () => setPage(1);

  const renderStatusBadge = (lotStatus) => {
    if (lotStatus === 'Hoàn thành') {
      return (
        <span className="badge-pill badge-success">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block', flexShrink: 0 }} />
          Hoàn thành
        </span>
      );
    }
    return (
      <span className="badge-pill badge-primary">
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', display: 'inline-block', flexShrink: 0 }} />
        Đang sản xuất
      </span>
    );
  };

  const renderSlipTypeBadge = (slipType) => {
    if (slipType === 'DINH_HINH') {
      return (
        <span className="badge-pill badge-warning">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-warning)', display: 'inline-block', flexShrink: 0 }} />
          Định hình
        </span>
      );
    }
    return (
      <span className="badge-pill badge-primary">
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', display: 'inline-block', flexShrink: 0 }} />
        Phôi gỗ
      </span>
    );
  };

  return (
    <div className="w-full min-h-screen font-sans" style={{ background: 'var(--color-app-bg)', color: 'var(--color-text-primary)' }}>
      <div className="max-w-[1180px] mx-auto px-4 md:px-6 py-6 md:py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-7">
          <div>
            <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight leading-tight">
              Phiếu Sản Xuất
            </h1>
            <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              Quản lý quy trình sản xuất phôi gỗ và định hình.
            </p>
          </div>

          {/* Create button */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowCreateModal(!showCreateModal)}
              className="flex items-center gap-1.5 text-white text-[13px] font-semibold px-4 py-2 rounded-lg transition-all active:scale-[0.97] shadow-sm hover:shadow"
              style={{ background: 'var(--color-primary)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--color-primary)'}
            >
              <Plus size={15} /> Tạo Lệnh Mới
            </button>

            {showCreateModal && (
              <div
                className="absolute right-0 top-full mt-2 w-60 rounded-xl py-2 z-50"
                style={{ background: 'white', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-deep)' }}
              >
                <div
                  className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border-light)' }}
                >
                  Chọn loại phiếu
                </div>
                <button
                  onClick={() => handleCreateSlip('PHOI_GO')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors"
                  style={{ color: 'var(--color-text-primary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-soft)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'var(--color-primary-soft)' }}
                  >
                    <Layers size={16} style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div>
                    <div className="font-semibold text-[13px]">Phiếu sản xuất phôi gỗ</div>
                    <div className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>Xẻ sấy, tạo phôi thô</div>
                  </div>
                </button>
                <button
                  onClick={() => handleCreateSlip('DINH_HINH')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors"
                  style={{ color: 'var(--color-text-primary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-warning-soft)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'var(--color-warning-soft)' }}
                  >
                    <Square size={16} style={{ color: 'var(--color-warning)' }} />
                  </div>
                  <div>
                    <div className="font-semibold text-[13px]">Phiếu sản xuất định hình</div>
                    <div className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>Chỉ dùng phôi thành phẩm/dư</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-col lg:flex-row gap-3 mb-5">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã hoặc tên phiếu..."
              className="w-full rounded-lg pl-9 pr-3 py-2 text-[13px] transition-all"
              style={{
                background: 'white',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-soft)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Slip type filter */}
          <div
            className="flex rounded-lg overflow-hidden shrink-0 self-start lg:self-stretch"
            style={{ border: '1px solid var(--color-border)', background: 'white' }}
          >
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'PHOI_GO', label: 'Phôi gỗ' },
              { key: 'DINH_HINH', label: 'Định hình' }
            ].map((tab, idx, arr) => (
              <button
                key={tab.key}
                onClick={() => { setSlipFilter(tab.key); resetPage(); }}
                className="px-4 py-2 text-[12.5px] font-medium transition-all"
                style={{
                  background: slipFilter === tab.key ? 'var(--color-primary)' : 'transparent',
                  color: slipFilter === tab.key ? 'white' : 'var(--color-text-secondary)',
                  borderRight: idx < arr.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table card */}
        <div
          className="overflow-hidden"
          style={{
            background: 'var(--color-card-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13px] table-fixed">
              <thead style={{ background: 'var(--color-border-light)', borderBottom: '1px solid var(--color-border)' }}>
                <tr>
                  <th className="px-5 py-3.5 text-left font-semibold w-[16%] text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Mã</th>
                  <th className="px-5 py-3.5 text-left font-semibold w-[14%] text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Loại phiếu</th>
                  <th className="px-5 py-3.5 text-left font-semibold w-[36%] text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Tên phiếu</th>
                  <th className="px-5 py-3.5 text-left font-semibold w-[16%] text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Trạng thái</th>
                  <th className="px-5 py-3.5 text-left font-semibold w-[10%] text-[11px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Ngày</th>
                  <th className="px-5 py-3.5 w-[8%]"></th>
                </tr>
              </thead>
              <tbody>
                {filteredLots.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                      Không tìm thấy phiếu sản xuất nào.
                    </td>
                  </tr>
                ) : pagedLots.map((lot) => (
                  <tr
                    key={lot.id}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: '1px solid var(--color-border-light)' }}
                    onClick={() => onNavigate(lot.slip_type === 'DINH_HINH' ? 'molding-production-slip' : 'lot-detail', { id: lot.id })}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-app-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td className="px-5 py-3.5 font-semibold break-words leading-snug text-[13px]">{lot.id}</td>
                    <td className="px-5 py-3.5">{renderSlipTypeBadge(lot.slip_type)}</td>
                    <td className="px-5 py-3.5">
                      <div className="line-clamp-2 leading-snug">{lot.name}</div>
                    </td>
                    <td className="px-5 py-3.5">{renderStatusBadge(lot.status)}</td>
                    <td className="px-5 py-3.5 text-[12px] whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>{lot.date}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => handleDelete(e, lot.id)}
                          className="p-1.5 rounded-md transition-colors"
                          title="Xoá lệnh"
                          style={{ color: 'var(--color-text-muted)' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-danger)'; e.currentTarget.style.background = 'var(--color-danger-soft)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                        >
                          <Trash2 size={14} />
                        </button>
                        <ArrowRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3"
            style={{ borderTop: '1px solid var(--color-border-light)', background: 'var(--color-card-bg)' }}
          >
            <div className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
              Hiển thị <strong>{pagedLots.length}</strong> / <strong>{filteredLots.length}</strong> phiếu — Trang {safePage} / {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((c) => Math.max(1, c - 1))}
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
                onClick={() => setPage((c) => Math.min(totalPages, c + 1))}
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

      {/* Confirm Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div
            className="w-full max-w-[400px] overflow-hidden rounded-2xl"
            style={{ background: 'white', boxShadow: 'var(--shadow-deep)', border: '1px solid var(--color-border)' }}
          >
            <div
              className="px-5 py-4 flex justify-between items-center"
              style={{ borderBottom: '1px solid var(--color-border-light)' }}
            >
              <h3 className="font-semibold text-[15px]" style={{ color: 'var(--color-text-primary)' }}>{modal.title}</h3>
              <button
                onClick={closeModal}
                className="rounded-lg p-1 transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-app-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-5 text-[14px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {modal.message}
            </div>
            <div
              className="px-5 py-4 flex justify-end gap-2"
              style={{ borderTop: '1px solid var(--color-border-light)' }}
            >
              {modal.type === 'confirm' && (
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-[13px] font-semibold rounded-lg transition-colors"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', background: 'white' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-app-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  Huỷ bỏ
                </button>
              )}
              <button
                onClick={() => { if (modal.onConfirm) modal.onConfirm(); else closeModal(); }}
                className="px-4 py-2 text-[13px] font-semibold text-white rounded-lg transition-all active:scale-[0.97]"
                style={{ background: 'var(--color-danger)' }}
                onMouseEnter={e => e.currentTarget.style.background = '#DC2626'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--color-danger)'}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

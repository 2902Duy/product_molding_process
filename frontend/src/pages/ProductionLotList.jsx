import { useEffect, useState } from 'react';
import { Search, ArrowRight, Plus, Trash2, X, Layers, Square, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../services/db';
import { removeVietnameseTones } from '../utils/stringUtils';

export default function ProductionLotList({ onNavigate }) {
  const [search, setSearch] = useState('');
  const [lots, setLots] = useState([]);
  const [slipFilter, setSlipFilter] = useState('ALL'); // 'ALL' | 'PHOI_GO' | 'DINH_HINH'
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
        <span className="inline-block px-2 py-[2px] bg-green-50 text-success-green rounded-full text-[10px] font-bold uppercase tracking-wider">
          Hoàn thành
        </span>
      );
    }
    return (
      <span className="inline-block px-2 py-[2px] bg-badge-bg text-badge-text rounded-full text-[10px] font-bold uppercase tracking-wider">
        Đang sản xuất
      </span>
    );
  };

  const renderSlipTypeBadge = (slipType) => {
    if (slipType === 'DINH_HINH') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-[2px] bg-orange-100 text-orange-700 rounded text-[10px] font-bold uppercase tracking-wider">
          <Square size={8} /> Định hình
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-[2px] bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase tracking-wider">
        <Layers size={8} /> Phôi gỗ
      </span>
    );
  };

  return (
    <div className="w-full min-h-screen bg-warm-white text-notion-black font-sans">
      <div className="max-w-[1180px] mx-auto px-3 md:px-6 py-6 md:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
          <div>
            <h1 className="text-[28px] sm:text-[32px] font-bold tracking-[-1px] leading-tight">
              Phiếu Sản Xuất
            </h1>
            <p className="text-[14px] text-warm-gray-500 mt-1">
              Quản lý quy trình sản xuất phôi gỗ và định hình.
            </p>
          </div>
          <div className="relative shrink-0">
            <button
              onClick={() => setShowCreateModal(!showCreateModal)}
              className="flex items-center gap-1 bg-notion-blue hover:bg-notion-blue-hover text-white text-[13px] font-medium px-3 py-[7px] rounded-[4px] transition active:scale-[0.97]"
            >
              <Plus size={14} /> Tạo Lệnh Mới
            </button>
            {showCreateModal && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  Chọn loại phiếu
                </div>
                <button
                  onClick={() => handleCreateSlip('PHOI_GO')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-blue-50 transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Layers size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">Phiếu sản xuất phôi gỗ</div>
                    <div className="text-xs text-gray-500">Xẻ sấy, tạo phôi thô</div>
                  </div>
                </button>
                <button
                  onClick={() => handleCreateSlip('DINH_HINH')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-orange-50 transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Square size={16} className="text-orange-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">Phiếu sản xuất định hình</div>
                    <div className="text-xs text-gray-500">Chỉ dùng phôi thành phẩm/dư</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-col lg:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray-300" />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã hoặc tên phiếu..."
              className="w-full bg-notion-white border border-whisper rounded-[6px] pl-8 pr-3 py-[7px] text-[13px] focus:outline-none focus:ring-1 focus:ring-notion-blue/30 focus:border-notion-blue transition"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
            />
          </div>
          <div className="flex bg-notion-white border border-whisper rounded-[6px] overflow-hidden shrink-0 self-start lg:self-stretch">
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'PHOI_GO', label: 'Phôi gỗ' },
              { key: 'DINH_HINH', label: 'Định hình' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setSlipFilter(tab.key);
                  resetPage();
                }}
                className={`px-3 py-[7px] text-[12px] font-medium transition ${
                  slipFilter === tab.key
                    ? 'bg-notion-blue text-white'
                    : 'text-warm-gray-500 hover:bg-warm-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-notion-white border border-whisper rounded-[8px] shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13px] table-fixed">
              <thead className="text-[11px] uppercase text-warm-gray-400 tracking-[0.5px] bg-warm-white border-b border-whisper">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold w-[16%]">Mã</th>
                  <th className="px-5 py-3 text-left font-semibold w-[14%]">Loại phiếu</th>
                  <th className="px-5 py-3 text-left font-semibold w-[36%]">Tên phiếu</th>
                  <th className="px-5 py-3 text-left font-semibold w-[16%]">Trạng thái</th>
                  <th className="px-5 py-3 text-left font-semibold w-[10%]">Ngày</th>
                  <th className="px-5 py-3 w-[8%]"></th>
                </tr>
              </thead>
              <tbody>
                {filteredLots.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-warm-gray-300 text-[13px]">
                      Không tìm thấy phiếu sản xuất nào.
                    </td>
                  </tr>
                ) : pagedLots.map((lot) => (
                  <tr
                    key={lot.id}
                    className="border-b border-whisper last:border-0 hover:bg-warm-white/60 transition cursor-pointer"
                    onClick={() => onNavigate(lot.slip_type === 'DINH_HINH' ? 'molding-production-slip' : 'lot-detail', { id: lot.id })}
                  >
                    <td className="px-5 py-3 font-semibold break-words leading-snug">{lot.id}</td>
                    <td className="px-5 py-3">{renderSlipTypeBadge(lot.slip_type)}</td>
                    <td className="px-5 py-3">
                      <div className="line-clamp-2 leading-snug">{lot.name}</div>
                    </td>
                    <td className="px-5 py-3">{renderStatusBadge(lot.status)}</td>
                    <td className="px-5 py-3 text-warm-gray-500 text-[12px] whitespace-nowrap">{lot.date}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={(e) => handleDelete(e, lot.id)} className="text-warm-gray-300 hover:text-red-500 transition p-1" title="Xoá lệnh">
                          <Trash2 size={14} />
                        </button>
                        <ArrowRight size={14} className="text-warm-gray-300" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-whisper bg-white">
            <div className="text-[12px] text-warm-gray-500">
              Hiển thị {pagedLots.length} / {filteredLots.length} phiếu - Trang {safePage} / {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage <= 1}
                className="h-8 px-3 rounded-[6px] border border-whisper text-[12px] font-semibold text-warm-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-warm-white flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Trước
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={safePage >= totalPages}
                className="h-8 px-3 rounded-[6px] border border-whisper text-[12px] font-semibold text-warm-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-warm-white flex items-center gap-1"
              >
                Sau <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {modal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[400px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-semibold text-gray-800">{modal.title}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition"><X size={18} /></button>
            </div>
            <div className="px-5 py-6 text-gray-600 text-[14px] leading-relaxed">
              {modal.message}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
              {modal.type === 'confirm' && (
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition"
                >
                  Huỷ bỏ
                </button>
              )}
              <button
                onClick={() => {
                  if (modal.onConfirm) modal.onConfirm();
                  else closeModal();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:scale-[0.98] transition"
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

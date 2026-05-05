import React, { useEffect, useState } from 'react';
import { Search, ArrowRight, Plus, Trash2, X } from 'lucide-react';
import { db } from '../services/db';
import { removeVietnameseTones } from '../utils/stringUtils';

export default function ProductionLotList({ onNavigate }) {
  const [search, setSearch] = useState('');
  const [lots, setLots] = useState([]);
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
      message: 'Bạn có chắc muốn xoá lệnh sản xuất này không? Hành động này không thể hoàn tác.',
      onConfirm: () => {
        db.deleteLot(id);
        setLots(db.getLots());
        closeModal();
      }
    });
  };

  const filteredLots = lots.filter((lot) => {
    const term = removeVietnameseTones(search);
    return removeVietnameseTones(lot.name || '').includes(term) ||
      removeVietnameseTones(lot.id || '').includes(term);
  });

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

  return (
    <div className="w-full min-h-screen bg-warm-white text-notion-black font-sans">
      <div className="max-w-[960px] mx-auto px-3 md:px-5 py-6 md:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
          <div>
            <h1 className="text-[28px] sm:text-[32px] font-bold tracking-[-1px] leading-tight">
              Lệnh Sản Xuất
            </h1>
            <p className="text-[14px] text-warm-gray-500 mt-1">
              Quản lý quy trình xẻ sấy, tạo phôi chung.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => onNavigate('lot-detail')}
              className="flex items-center gap-1 bg-notion-blue hover:bg-notion-blue-hover text-white text-[13px] font-medium px-3 py-[7px] rounded-[4px] transition active:scale-[0.97]"
            >
              <Plus size={14} /> Tạo Lệnh Mới
            </button>
          </div>
        </div>

        <div className="flex mb-5">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray-300" />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã hoặc tên lệnh..."
              className="w-full bg-notion-white border border-whisper rounded-[6px] pl-8 pr-3 py-[7px] text-[13px] focus:outline-none focus:ring-1 focus:ring-notion-blue/30 focus:border-notion-blue transition"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-notion-white border border-whisper rounded-[8px] shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-[13px]">
              <thead className="text-[11px] uppercase text-warm-gray-400 tracking-[0.5px] bg-warm-white border-b border-whisper">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold w-[18%]">Mã</th>
                  <th className="px-4 py-2.5 text-left font-semibold w-[36%]">Tên lệnh</th>
                  <th className="px-4 py-2.5 text-left font-semibold w-[20%]">Trạng thái</th>
                  <th className="px-4 py-2.5 text-left font-semibold w-[18%]">Ngày</th>
                  <th className="px-4 py-2.5 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {filteredLots.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-warm-gray-300 text-[13px]">
                      Không tìm thấy lệnh sản xuất nào.
                    </td>
                  </tr>
                ) : (
                  filteredLots.map((lot) => (
                    <tr
                      key={lot.id}
                      className="border-b border-whisper last:border-0 hover:bg-warm-white/60 transition cursor-pointer"
                      onClick={() => onNavigate('lot-detail', { id: lot.id })}
                    >
                      <td className="px-4 py-3 font-semibold">{lot.id}</td>
                      <td className="px-4 py-3">{lot.name}</td>
                      <td className="px-4 py-3">{renderStatusBadge(lot.status)}</td>
                      <td className="px-4 py-3 text-warm-gray-500 text-[12px]">{lot.date}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={(e) => handleDelete(e, lot.id)} className="text-warm-gray-300 hover:text-red-500 transition p-1" title="Xoá lệnh">
                            <Trash2 size={14} />
                          </button>
                          <ArrowRight size={14} className="text-warm-gray-300" />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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

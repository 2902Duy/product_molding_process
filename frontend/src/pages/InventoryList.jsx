import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, Package, Plus, Archive, Layers, X, ArrowLeftRight } from 'lucide-react';
import { db } from '../services/db';
import { removeVietnameseTones } from '../utils/stringUtils';

export default function InventoryList({ onNavigate }) {
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, RAW, SEMIFINISHED, SURPLUS

  useEffect(() => {
    setInventory(db.getInventory());
  }, []);

  const filteredInventory = inventory.filter(item => {
    const matchesTab = activeTab === 'ALL' || item.type === activeTab;
    const term = removeVietnameseTones(search);
    const matchesSearch =
      removeVietnameseTones(item.name || '').includes(term) ||
      removeVietnameseTones(item.id || '').includes(term) ||
      removeVietnameseTones(item.batchId || '').includes(term);
    return matchesTab && matchesSearch;
  });

  // Calculate totals
  const totalVolume = filteredInventory.reduce((sum, item) => sum + (Number(item.volume) || 0), 0);
  const totalQuantity = filteredInventory.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const tabs = [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'RAW', label: 'Nguyên liệu thô' },
    { id: 'SEMIFINISHED', label: 'Thành phẩm' },
    { id: 'SURPLUS', label: 'Phôi dư' },
    { id: 'WASTE', label: 'Phế phẩm' }
  ];

  const getTypeBadge = (type) => {
    switch (type) {
      case 'RAW': return <span className="inline-block px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold">NGUYÊN LIỆU</span>;
      case 'SEMIFINISHED': return <span className="inline-block px-2 py-1 bg-green-50 text-success-green rounded text-[10px] font-bold">THÀNH PHẨM</span>;
      case 'SURPLUS': return <span className="inline-block px-2 py-1 bg-orange-50 text-orange-600 rounded text-[10px] font-bold">PHÔI DƯ</span>;
      case 'WASTE': return <span className="inline-block px-2 py-1 bg-red-50 text-red-600 rounded text-[10px] font-bold">PHẾ PHẨM</span>;
      default: return null;
    }
  };

  return (
    <div className="w-full min-h-screen bg-warm-white text-notion-black font-sans">


      <div className="max-w-[1060px] mx-auto px-3 md:px-5 py-6 md:py-8">

        {/* ── Title ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
          <div>
            <h1 className="text-[28px] sm:text-[32px] font-bold tracking-[-1px] leading-tight flex items-center gap-3">
              <Archive className="text-notion-blue" size={28} />
              Quản lý kho phôi
            </h1>
            <p className="text-[14px] text-warm-gray-500 mt-1">
              Theo dõi nguyên liệu thô, thành phẩm và phôi dư tận dụng.
            </p>
          </div>
        </div>

        {/* ── Tabs & Search ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
          <div className="flex bg-warm-white p-1 rounded-lg border border-whisper overflow-x-auto max-w-full">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 text-[13px] font-medium rounded-md whitespace-nowrap transition-colors ${activeTab === tab.id
                  ? 'bg-white shadow-sm text-notion-black'
                  : 'text-warm-gray-500 hover:text-notion-black hover:bg-black/5'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-[300px] shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray-300" />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã, loại gỗ..."
              className="w-full bg-notion-white border border-whisper rounded-[6px] pl-8 pr-3 py-[7px] text-[13px] focus:outline-none focus:ring-1 focus:ring-notion-blue/30 focus:border-notion-blue transition"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
          <div className="bg-white border border-whisper rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Layers size={20} />
            </div>
            <div>
              <div className="text-[12px] font-semibold text-warm-gray-400 uppercase tracking-wider mb-0.5">Tổng số lượng (Thanh/Tấm)</div>
              <div className="text-2xl font-bold">{totalQuantity.toLocaleString()}</div>
            </div>
          </div>
          <div className="bg-white border border-whisper rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-success-green">
              <Package size={20} />
            </div>
            <div>
              <div className="text-[12px] font-semibold text-warm-gray-400 uppercase tracking-wider mb-0.5">Tổng khối lượng (m³)</div>
              <div className="text-2xl font-bold">{totalVolume.toFixed(4)}</div>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-notion-white border border-whisper rounded-[8px] shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-[13px]">
              <thead className="text-[11px] uppercase text-warm-gray-400 tracking-[0.5px] bg-warm-white border-b border-whisper">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold w-[12%]">Phân loại</th>
                  <th className="px-4 py-3 text-left font-semibold w-[18%]">Loại gỗ</th>
                  <th className="px-4 py-3 text-center font-semibold w-[20%]">Quy cách (Dày × Rộng × Dài)</th>
                  <th className="px-4 py-3 text-right font-semibold w-[10%]">Số lượng</th>
                  <th className="px-4 py-3 text-right font-semibold w-[15%]">Khối lượng (m³)</th>
                  <th className="px-4 py-3 text-left font-semibold w-[25%]">Nguồn gốc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-whisper">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-warm-gray-300 text-[13px]">
                      Không tìm thấy phôi gỗ nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map(item => (
                    <tr
                      key={item.id}
                      className="hover:bg-warm-white/60 transition"
                    >
                      <td className="px-4 py-3">
                        {getTypeBadge(item.type)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-notion-black">
                        {item.name}
                      </td>
                      <td className="px-4 py-3 text-center text-warm-gray-600">
                        {item.thickness && item.thickness != 0 ? item.thickness : '~D'} × {item.width && item.width != 0 ? item.width : '~R'} × {item.length && item.length != 0 ? item.length : '~L'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">
                        {(item.quantity && item.quantity != 0) ? item.quantity : '--'}
                      </td>
                      <td className="px-4 py-3 text-right text-notion-blue font-semibold tabular-nums">
                        {Number(item.volume).toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-warm-gray-500">
                        {item.batchId ? (
                          <span className="flex items-center gap-1.5">
                            <ArrowLeftRight size={13} className="text-blue-400" /> Nhập lô: {item.batchId}
                          </span>
                        ) : item.source_lot_id ? (
                          <span className="flex items-center gap-1.5">
                            <FileIcon size={13} className="text-orange-400" /> Lệnh SX: {item.source_lot_id}
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
        </div>

      </div>
    </div>
  );
}

const FileIcon = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
);

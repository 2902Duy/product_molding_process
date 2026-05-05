import React, { useState } from 'react';
import { Package, X, Search, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { renderDimensions, renderQuantity } from '../../utils/formatters';

export default function InventoryModal({
  groupedInventory,
  selectedInputs,
  invTab,
  setInvTab,
  invSearch,
  setInvSearch,
  onClose,
  onToggleInputSelection,
  onToggleModalBatchSelection
}) {
  const [modalExpandedBatches, setModalExpandedBatches] = useState({});

  const handleToggleModalBatchOpen = (batchId) => {
    setModalExpandedBatches(prev => ({ ...prev, [batchId]: prev[batchId] === false ? true : false }));
  };

  const isModalBatchExpanded = (batchId) => modalExpandedBatches[batchId] !== false;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-10">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[800px] max-h-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Package size={18} className="text-notion-blue" /> Chọn nguyên liệu từ kho</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={20} /></button>
        </div>

        {/* Filters */}
        <div className="px-4 sm:px-5 py-3 border-b border-whisper bg-white flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo loại gỗ, mã lô..."
              className="w-full bg-warm-white border border-whisper rounded-lg pl-8 pr-3 py-2 text-[13px] focus:outline-none focus:border-notion-blue"
              value={invSearch}
              onChange={e => setInvSearch(e.target.value)}
            />
          </div>
          <div className="flex bg-warm-white p-1 rounded-lg border border-whisper shrink-0">
            {['ALL', 'RAW', 'SURPLUS'].map(tab => (
              <button
                key={tab}
                onClick={() => setInvTab(tab)}
                className={`px-3 py-1 text-[12px] font-medium rounded-md transition-colors ${invTab === tab ? 'bg-white shadow-sm text-notion-black' : 'text-warm-gray-500 hover:text-notion-black'}`}
              >
                {tab === 'ALL' ? 'Tất cả' : tab === 'RAW' ? 'Nguyên liệu thô' : 'Phôi dư'}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto bg-warm-white/30 p-4">
          {groupedInventory.length === 0 ? (
            <div className="text-center py-10 text-warm-gray-400 text-[13px]">Kho trống hoặc không tìm thấy kết quả.</div>
          ) : (
            <div className="space-y-3">
              {groupedInventory.map(group => {
                const isExpanded = isModalBatchExpanded(group.batchId);
                const allSelected = group.items.every(item => selectedInputs.find(i => i.id === item.id));
                const someSelected = group.items.some(item => selectedInputs.find(i => i.id === item.id));
                const isIndeterminate = someSelected && !allSelected;

                const totalQty = group.items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
                const totalVol = group.items.reduce((sum, i) => sum + (Number(i.volume) || 0), 0).toFixed(4);

                return (
                  <div key={group.batchId} className="bg-white border border-whisper rounded-lg overflow-hidden shadow-sm">
                    {/* Parent Row */}
                    <div className="flex items-start sm:items-center gap-3 p-3 bg-gray-50/80 border-b border-whisper hover:bg-gray-100/80 transition cursor-pointer" onClick={() => handleToggleModalBatchOpen(group.batchId)}>
                      <div
                        className="w-5 h-5 mt-0.5 sm:mt-0 flex items-center justify-center shrink-0"
                        onClick={(e) => { e.stopPropagation(); onToggleModalBatchSelection(group.items); }}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${allSelected ? 'bg-notion-blue border-notion-blue text-white' : isIndeterminate ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 bg-white'}`}>
                          {allSelected && <Check size={12} strokeWidth={3} />}
                          {isIndeterminate && <div className="w-2 h-[2px] bg-white rounded-full" />}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`shrink-0 text-[9px] font-bold px-1.5 py-[2px] rounded ${group.type === 'RAW' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                            {group.type === 'RAW' ? 'LÔ NL' : 'LÔ DƯ'}
                          </span>
                          <span className="font-bold text-gray-800 text-[14px] truncate">{group.batchId}</span>
                        </div>
                        <span className="text-[12px] text-gray-500 font-medium whitespace-nowrap">({group.items.length} quy cách)</span>
                      </div>

                      <div className="text-right flex items-center gap-2 sm:gap-4 shrink-0">
                        <div className="text-[12px] flex flex-col sm:flex-row sm:items-center text-right gap-1 sm:gap-3">
                          <div className="w-auto sm:w-[60px] text-gray-500 text-right flex items-center justify-end gap-1">
                            <span>Tồn:</span>
                            <span className="text-gray-800 font-bold">{totalQty}</span>
                          </div>
                          <div className="w-auto sm:w-[70px] text-gray-500 text-right">
                            {totalVol}m³
                          </div>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600 w-4 flex justify-end">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Child Rows */}
                    {isExpanded && (
                      <div className="divide-y divide-whisper">
                        {group.items.map(item => {
                          const isSelected = selectedInputs.find(i => i.id === item.id);
                          return (
                            <div
                              key={item.id}
                              onClick={() => onToggleInputSelection(item)}
                              className={`flex items-start sm:items-center gap-2 sm:gap-3 p-2.5 pl-8 sm:pl-10 cursor-pointer transition ${isSelected ? 'bg-blue-50/20' : 'hover:bg-warm-white/50'}`}
                            >
                              <div className={`w-4 h-4 mt-0.5 sm:mt-0 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-notion-blue border-notion-blue text-white' : 'border-gray-300 bg-white'}`}>
                                {isSelected && <Check size={12} strokeWidth={3} />}
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-300 hidden lg:inline">└─</span>
                                  <span className="font-semibold text-[13px] text-gray-800 truncate">{item.name}</span>
                                </div>
                                <span className="text-[11px] sm:text-[12px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 w-fit whitespace-nowrap">
                                  {renderDimensions(item.thickness, item.width, item.length)}
                                </span>
                              </div>
                              <div className="text-right shrink-0 flex items-center gap-2 sm:gap-4">
                                <div className="text-[12px] flex flex-col sm:flex-row sm:items-center text-right gap-1 sm:gap-3">
                                  <div className="w-auto sm:w-[60px] text-gray-600 font-medium text-right">{renderQuantity(item.quantity)}</div>
                                  <div className="w-auto sm:w-[70px] text-gray-400 text-right">{Number(item.volume).toFixed(4)}</div>
                                </div>
                                <div className="w-4 hidden sm:block"></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="text-[13px] text-gray-600 font-medium">
            Đã chọn: <span className="text-notion-blue font-bold">{selectedInputs.length}</span> phôi
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-white bg-notion-black rounded-lg hover:bg-gray-800 active:scale-[0.98] transition shadow-sm"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { ClipboardList, X, Search, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { removeVietnameseTones } from '../../utils/stringUtils';

export default function OrderSelectionModal({
  orders,
  selectedTargetProducts,
  onClose,
  onToggleProductSelection,
  onToggleOrderSelection
}) {
  const [search, setSearch] = useState('');
  const [expandedOrders, setExpandedOrders] = useState({});

  const handleToggleOrderOpen = (orderId) => {
    setExpandedOrders(prev => ({ ...prev, [orderId]: prev[orderId] === false ? true : false }));
  };

  const isOrderExpanded = (orderId) => expandedOrders[orderId] !== false;

  const filteredOrders = orders.map(order => {
    const term = removeVietnameseTones(search);
    const orderMatches = removeVietnameseTones(order.name).includes(term) || removeVietnameseTones(order.id).includes(term);
    
    if (orderMatches) return order;

    const matchingProducts = order.products.filter(p => removeVietnameseTones(p.name).includes(term));
    if (matchingProducts.length > 0) {
      return { ...order, products: matchingProducts };
    }
    return null;
  }).filter(Boolean);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-10">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[800px] max-h-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <ClipboardList size={18} className="text-notion-blue" /> Chọn Sản phẩm từ Đơn hàng
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={20} /></button>
        </div>

        {/* Filters */}
        <div className="px-4 sm:px-5 py-3 border-b border-whisper bg-white flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray-400" />
            <input
              type="text"
              placeholder="Mã đơn hàng hoặc tên sản phẩm..."
              className="w-full bg-warm-white border border-whisper rounded-lg pl-8 pr-3 py-2 text-[13px] focus:outline-none focus:border-notion-blue"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto bg-warm-white/30 p-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-10 text-warm-gray-400 text-[13px]">Không tìm thấy kết quả.</div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map(order => {
                const isExpanded = isOrderExpanded(order.id);
                const allSelected = order.products.every(p => selectedTargetProducts.find(sp => sp.id === p.id));
                const someSelected = order.products.some(p => selectedTargetProducts.find(sp => sp.id === p.id));
                const isIndeterminate = someSelected && !allSelected;

                return (
                  <div key={order.id} className="bg-white border border-whisper rounded-lg overflow-hidden shadow-sm">
                    {/* Parent Row (Order) */}
                    <div className="flex items-start sm:items-center gap-3 p-3 bg-gray-50/80 border-b border-whisper hover:bg-gray-100/80 transition cursor-pointer" onClick={() => handleToggleOrderOpen(order.id)}>
                      <div
                        className="w-5 h-5 mt-0.5 sm:mt-0 flex items-center justify-center shrink-0"
                        onClick={(e) => { e.stopPropagation(); onToggleOrderSelection(order); }}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${allSelected ? 'bg-notion-blue border-notion-blue text-white' : isIndeterminate ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 bg-white'}`}>
                          {allSelected && <Check size={12} strokeWidth={3} />}
                          {isIndeterminate && <div className="w-2 h-[2px] bg-white rounded-full" />}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-2">
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 text-[9px] font-bold px-1.5 py-[2px] rounded bg-purple-100 text-purple-700">ĐƠN HÀNG</span>
                          <span className="font-bold text-gray-800 text-[14px] truncate">{order.id}</span>
                        </div>
                        <span className="text-[12px] text-gray-500 font-medium whitespace-nowrap">({order.products.length} sản phẩm)</span>
                      </div>

                      <div className="text-right flex items-center gap-2 shrink-0">
                        <button className="text-gray-400 hover:text-gray-600 w-4 flex justify-end">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Child Rows (Products) */}
                    {isExpanded && (
                      <div className="divide-y divide-whisper">
                        {order.products.map(product => {
                          const isSelected = !!selectedTargetProducts.find(sp => sp.id === product.id);
                          return (
                            <div
                              key={product.id}
                              onClick={() => onToggleProductSelection(product, order)}
                              className={`flex items-start sm:items-center gap-2 sm:gap-3 p-2.5 pl-8 sm:pl-10 cursor-pointer transition ${isSelected ? 'bg-blue-50/20' : 'hover:bg-warm-white/50'}`}
                            >
                              <div className={`w-4 h-4 mt-0.5 sm:mt-0 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-notion-blue border-notion-blue text-white' : 'border-gray-300 bg-white'}`}>
                                {isSelected && <Check size={12} strokeWidth={3} />}
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-300 hidden lg:inline">└─</span>
                                  <span className="font-semibold text-[13px] text-gray-800 truncate">{product.id} - {product.name}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0 flex items-center gap-2 sm:gap-4">
                                <div className="text-[12px] flex flex-col sm:flex-row sm:items-center text-right gap-1 sm:gap-3">
                                  <div className="w-auto sm:w-[120px] text-gray-500 font-medium text-right flex justify-end gap-1">
                                    <span className="text-gray-400">SL Sản phẩm:</span>
                                    <span className="text-gray-800 font-bold">{product.quantity}</span>
                                  </div>
                                </div>
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
        <div className="px-5 py-4 border-t border-whisper bg-white flex justify-between items-center">
          <div className="text-[13px] text-gray-600">
            Đã chọn: <span className="font-bold text-notion-blue">{selectedTargetProducts.length}</span> sản phẩm
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-notion-blue text-white text-[13px] font-medium rounded-lg hover:bg-notion-blue-hover transition shadow-sm active:scale-[0.98]"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}

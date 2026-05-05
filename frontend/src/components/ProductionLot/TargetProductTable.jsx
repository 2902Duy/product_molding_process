import React, { useState } from 'react';
import { ClipboardList, Plus, Trash2, ChevronDown, ChevronRight, PackageSearch } from 'lucide-react';

export default function TargetProductTable({
  selectedTargetProducts,
  disabled = false,
  onChangeProductQuantity,
  onRemoveProduct,
  onOpenOrderModal
}) {
  const [expandedProducts, setExpandedProducts] = useState({});
  const [expandedOrders, setExpandedOrders] = useState({});

  const handleToggleProductExpand = (productId) => {
    setExpandedProducts((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

  const handleToggleOrderExpand = (orderId) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: prev[orderId] === false ? true : false }));
  };

  const isOrderExpanded = (orderId) => expandedOrders[orderId] !== false;

  const groupedOrders = selectedTargetProducts.reduce((acc, product) => {
    const orderId = product.orderId || 'UNKNOWN';
    const orderName = product.orderName || 'Sản phẩm tự do';
    if (!acc[orderId]) acc[orderId] = { id: orderId, name: orderName, products: [] };
    acc[orderId].products.push(product);
    return acc;
  }, {});

  const orderGroups = Object.values(groupedOrders);

  return (
    <div className="bg-white border border-whisper rounded-[8px] shadow-sm mb-4 overflow-hidden">
      <div className="px-4 py-3 border-b border-whisper bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-[14px]">
          <ClipboardList size={18} className="text-notion-blue" />
          Mục Tiêu Sản Xuất
        </h3>
        <button
          onClick={onOpenOrderModal}
          disabled={disabled}
          className="flex items-center gap-1 text-[13px] font-medium text-white bg-notion-blue hover:bg-notion-blue-hover transition px-3 py-1.5 rounded-md shadow-sm disabled:bg-gray-300 disabled:hover:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Plus size={14} /> Thêm đơn hàng
        </button>
      </div>

      <div className="p-0">
        {orderGroups.length === 0 ? (
          <div className="px-4 py-8 text-center text-[13px] text-warm-gray-400">
            Chưa có mục tiêu sản xuất nào. Bấm "Thêm đơn hàng" để bắt đầu.
          </div>
        ) : (
          <table className="w-full text-left text-[13px] border-collapse table-fixed">
            <thead className="text-[11px] uppercase text-warm-gray-400 tracking-[0.5px] border-b border-whisper bg-warm-white">
              <tr>
                <th className="px-4 py-2.5 font-semibold w-[20%] border-r border-whisper">Mã đơn hàng / Sản phẩm</th>
                <th className="px-4 py-2.5 font-semibold w-[40%] border-r border-whisper">Tên Sản phẩm</th>
                <th className="px-4 py-2.5 font-semibold text-center w-[25%] border-r border-whisper">Số lượng Sản xuất</th>
                <th className="px-2 py-2.5 w-[15%] text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-whisper">
              {orderGroups.map((group) => (
                <React.Fragment key={group.id}>
                  <tr
                    className="hover:bg-warm-white/60 transition group cursor-pointer bg-warm-white/30 border-b border-whisper"
                    onClick={() => handleToggleOrderExpand(group.id)}
                  >
                    <td colSpan={2} className="px-4 py-2 font-bold text-notion-black border-r border-whisper">
                      <div className="flex items-center gap-2">
                        <button type="button" className="text-warm-gray-400 hover:text-notion-blue w-5 h-5 flex items-center justify-center rounded hover:bg-black/5">
                          {isOrderExpanded(group.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        <span className="shrink-0 text-[10px] font-bold px-1.5 py-[2px] rounded bg-purple-100 text-purple-700">Đơn hàng</span>
                        {group.id}
                      </div>
                    </td>
                    <td colSpan={2} className="px-4 py-2 border-r border-whisper bg-stripes-light"></td>
                  </tr>

                  {isOrderExpanded(group.id) && group.products.map((product) => {
                    const isExpanded = expandedProducts[product.id];
                    const prodQty = Number(product.quantity_produce) || 0;

                    return (
                      <React.Fragment key={product.id}>
                        <tr className="hover:bg-warm-white/40 transition bg-white group border-b border-whisper">
                          <td className="px-4 py-2 border-r border-whisper">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleProductExpand(product.id)}
                                className="text-warm-gray-400 hover:text-notion-blue w-5 h-5 flex items-center justify-center rounded hover:bg-black/5"
                              >
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                              <span className="font-semibold text-gray-800">{product.id}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 border-r border-whisper font-semibold text-gray-800">
                            {product.name}
                          </td>
                          <td className="p-0 border-r border-whisper bg-blue-50/20">
                            <input
                              type="number"
                              min="0"
                              disabled={disabled}
                              value={product.quantity_produce}
                              onChange={(e) => onChangeProductQuantity(product.id, e.target.value)}
                              className="w-full h-[36px] bg-transparent text-[13px] text-center font-semibold text-blue-600 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-notion-blue disabled:bg-gray-50 disabled:text-warm-gray-400 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="p-0 text-center">
                            <button
                              onClick={() => onRemoveProduct(product.id)}
                              disabled={disabled}
                              className="text-warm-gray-300 hover:text-red-500 transition w-full h-[36px] flex items-center justify-center disabled:hover:text-warm-gray-300 disabled:cursor-not-allowed"
                              title="Xoá sản phẩm"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>

                        {isExpanded && product.items && product.items.length > 0 && (
                          <tr className="bg-gray-50/50 border-b border-whisper">
                            <td colSpan={4} className="px-4 py-3">
                              <div className="bg-white border border-whisper rounded-lg p-3 ml-[28px] shadow-sm">
                                <div className="text-[11px] font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                                  <PackageSearch size={14} /> Quy cách chi tiết phôi cần xẻ
                                </div>
                                <table className="w-full text-[12px] table-fixed">
                                  <thead className="border-b border-gray-100 text-gray-400">
                                    <tr>
                                      <th className="pb-1 text-left font-medium w-[40%]">Tên phôi</th>
                                      <th className="pb-1 text-center font-medium w-[30%]">Dày x Rộng x Dài</th>
                                      <th className="pb-1 text-right font-medium w-[15%]">Định mức</th>
                                      <th className="pb-1 text-right font-medium text-blue-600 w-[15%]">Tổng cần</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {product.items.map((part) => {
                                      const baseQty = Number(part.base_quantity) || 0;
                                      const totalQty = baseQty * prodQty;
                                      return (
                                        <tr key={part.id} className="hover:bg-gray-50/50 transition">
                                          <td className="py-2 text-gray-700 font-medium">{part.name}</td>
                                          <td className="py-2 text-center text-gray-500">
                                            {part.thickness} x {part.width} x {part.length}
                                          </td>
                                          <td className="py-2 text-right text-gray-500">{baseQty}</td>
                                          <td className="py-2 text-right font-bold text-blue-600">{totalQty}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

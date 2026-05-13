import React, { useState } from 'react';
import { Plus, Trash2, Check, Clock, Package, ChevronDown, ChevronRight } from 'lucide-react';

const STAGES = [
  { id: 'vao-dinh-hinh', name: 'Vào định hình', order: 1 },
  { id: 'dinh-hinh-2-dau', name: 'Định hình 2 đầu', order: 2 },
  { id: 'dinh-hinh-mat', name: 'Định hình mặt', order: 3 },
  { id: 'dong-bo-dinh-hinh', name: 'Đồng bộ định hình', order: 4 }
];

export default function MoldingDetailTable({
  detailRows = [],
  disabled = false,
  onAddRow,
  onRemoveRow,
  onRowChange,
  onCompletePartial
}) {
  const [completingRowId, setCompletingRowId] = useState(null);
  const [partialQty, setPartialQty] = useState('');
  const [expandedProducts, setExpandedProducts] = useState({});

  // Group rows by productId
  const groupedByProduct = detailRows.reduce((acc, row) => {
    const key = row.productId || 'no-product';
    if (!acc[key]) {
      acc[key] = {
        productName: row.productName || 'Sản phẩm tự do',
        productId: row.productId,
        items: []
      };
    }
    acc[key].items.push(row);
    return acc;
  }, {});

  const productGroups = Object.values(groupedByProduct);

  // Calculate totals
  const totalQtyNeeded = detailRows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  const totalQtyCompleted = detailRows.reduce((sum, row) => sum + (Number(row.quantity_completed) || 0), 0);
  const totalQtyRemaining = totalQtyNeeded - totalQtyCompleted;

  const handleToggleProductExpand = (productId) => {
    setExpandedProducts(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  const handleStartComplete = (row) => {
    if (disabled) return;
    const remaining = (Number(row.quantity) || 0) - (Number(row.quantity_completed) || 0);
    setCompletingRowId(row.id);
    setPartialQty(remaining > 0 ? remaining.toString() : '');
  };

  const handleConfirmPartial = (row) => {
    const qty = Number(partialQty) || 0;
    const remaining = (Number(row.quantity) || 0) - (Number(row.quantity_completed) || 0);

    if (qty <= 0) {
      setCompletingRowId(null);
      return;
    }

    if (qty > remaining) {
      alert(`Số lượng không được lớn hơn số lượng còn lại (${remaining})`);
      return;
    }

    onCompletePartial(row.id, qty);
    setCompletingRowId(null);
    setPartialQty('');
  };

  const handleCancelPartial = () => {
    setCompletingRowId(null);
    setPartialQty('');
  };

  const getProgressPercent = (row) => {
    const total = Number(row.quantity) || 0;
    const completed = Number(row.quantity_completed) || 0;
    if (total === 0) return 0;
    return Math.min(100, Math.round((completed / total) * 100));
  };

  const getProductProgress = (group) => {
    const totalNeeded = group.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalCompleted = group.items.reduce((sum, item) => sum + (Number(item.quantity_completed) || 0), 0);
    if (totalNeeded === 0) return 0;
    return Math.round((totalCompleted / totalNeeded) * 100);
  };

  return (
    <div className="bg-white border border-orange-200 rounded-xl overflow-hidden">
      {/* Header with progress summary */}
      <div className="px-4 py-3 bg-gradient-to-r from-orange-50 to-yellow-50 border-b border-orange-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-orange-500" />
            Chi Tiết Công Đoạn
          </h3>
          <button
            onClick={onAddRow}
            disabled={disabled}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm dòng
          </button>
        </div>

        {/* Progress summary bar */}
        <div className="bg-white rounded-lg p-3 border border-orange-100">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-gray-600">Tiến độ tổng:</span>
            <span className="font-bold text-orange-600">
              {totalQtyCompleted} / {totalQtyNeeded} cái
              {totalQtyRemaining > 0 && (
                <span className="text-gray-400 font-normal ml-2">(còn {totalQtyRemaining})</span>
              )}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-orange-400 to-green-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalQtyNeeded > 0 ? Math.round((totalQtyCompleted / totalQtyNeeded) * 100) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {detailRows.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            Chưa có chi tiết nào. Chọn sản phẩm từ đơn hàng hoặc bấm "Thêm dòng" để tạo.
          </div>
        ) : (
          <div className="space-y-4">
            {productGroups.map((group) => {
              const isExpanded = expandedProducts[group.productId] !== false;
              const productProgress = getProductProgress(group);
              const totalNeeded = group.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
              const totalCompleted = group.items.reduce((sum, item) => sum + (Number(item.quantity_completed) || 0), 0);
              const isAllCompleted = totalNeeded > 0 && totalCompleted >= totalNeeded;

              return (
                <div key={group.productId || 'no-product'} className="border border-orange-200 rounded-lg overflow-hidden">
                  {/* Product Header */}
                  <div
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${
                      isAllCompleted ? 'bg-green-50' : 'bg-orange-50'
                    }`}
                    onClick={() => handleToggleProductExpand(group.productId)}
                  >
                    <button className="text-orange-500">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700">
                          SẢN PHẨM
                        </span>
                        <span className="font-semibold text-gray-800">{group.productName}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {totalCompleted} / {totalNeeded} cái
                    </div>
                    <div className="w-24 bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${isAllCompleted ? 'bg-green-500' : 'bg-orange-400'}`}
                        style={{ width: `${productProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Detail Table */}
                  {isExpanded && (
                    <div className="border-t border-orange-100">
                      {/* Table Header */}
                      <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-100 text-xs font-medium text-gray-600">
                        <div className="col-span-3">Tên phôi / chi tiết</div>
                        <div className="col-span-2 text-center">Dày x Rộng x Dài</div>
                        <div className="col-span-1 text-center">Định mức</div>
                        <div className="col-span-1 text-center">Cần</div>
                        <div className="col-span-1 text-center">Đã HT</div>
                        <div className="col-span-1 text-center">Còn</div>
                        <div className="col-span-2 text-center">Công đoạn</div>
                        <div className="col-span-1 text-center">Thao tác</div>
                      </div>

                      {/* Rows */}
                      {group.items.map((row) => {
                        const qtyNeeded = Number(row.quantity) || 0;
                        const qtyCompleted = Number(row.quantity_completed) || 0;
                        const qtyRemaining = qtyNeeded - qtyCompleted;
                        const isCompleted = qtyRemaining <= 0;
                        const isCompleting = completingRowId === row.id;
                        const progress = getProgressPercent(row);

                        // Calculate unit quantity from total
                        const baseQty = row.base_quantity || 1;
                        const unitQty = qtyNeeded > 0 ? Math.round(qtyNeeded / baseQty) : 0;

                        return (
                          <div key={row.id}>
                            <div className={`grid grid-cols-12 gap-2 px-4 py-2 items-center border-b border-gray-100 ${
                              isCompleted ? 'bg-green-50' : isCompleting ? 'bg-blue-50' : ''
                            }`}>
                              {/* Part name */}
                              <div className="col-span-3">
                                <div className={`px-2 py-1.5 text-xs border rounded truncate ${
                                  row.semiFinishedName ? 'border-orange-200 bg-orange-50 text-orange-700 font-medium' : 'border-gray-200 bg-white text-gray-500'
                                }`}>
                                  {row.semiFinishedName || 'Chi tiết'}
                                </div>
                              </div>

                              {/* Dimensions */}
                              <div className="col-span-2 flex justify-center gap-1">
                                <div className="w-8 px-1 py-1.5 text-xs border border-gray-200 rounded text-center bg-gray-50 text-gray-600">
                                  {row.thickness || '-'}
                                </div>
                                <span className="text-xs text-gray-400 self-center">×</span>
                                <div className="w-8 px-1 py-1.5 text-xs border border-gray-200 rounded text-center bg-gray-50 text-gray-600">
                                  {row.width || '-'}
                                </div>
                                <span className="text-xs text-gray-400 self-center">×</span>
                                <div className="w-10 px-1 py-1.5 text-xs border border-gray-200 rounded text-center bg-gray-50 text-gray-600">
                                  {row.length || '-'}
                                </div>
                              </div>

                              {/* Unit quantity */}
                              <div className="col-span-1 text-center">
                                <div className="text-xs text-gray-600">{unitQty}</div>
                              </div>

                              {/* Quantity needed */}
                              <div className="col-span-1">
                                <input
                                  type="number"
                                  value={row.quantity}
                                  onChange={(e) => onRowChange(row.id, 'quantity', e.target.value)}
                                  disabled={disabled || isCompleted}
                                  className="w-full px-1 py-1.5 text-xs border border-gray-200 rounded text-center focus:outline-none focus:border-orange-400 disabled:bg-gray-100"
                                  min="0"
                                />
                              </div>

                              {/* Quantity completed */}
                              <div className="col-span-1">
                                <div className={`w-full px-1 py-1.5 text-xs border rounded text-center font-semibold ${
                                  isCompleted
                                    ? 'bg-green-100 border-green-300 text-green-700'
                                    : 'bg-gray-100 border-gray-200 text-gray-600'
                                }`}>
                                  {qtyCompleted}
                                </div>
                              </div>

                              {/* Quantity remaining */}
                              <div className="col-span-1">
                                <div className={`w-full px-1 py-1.5 text-xs border rounded text-center ${
                                  qtyRemaining > 0 ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-gray-100 border-gray-200 text-gray-400'
                                }`}>
                                  {qtyRemaining}
                                </div>
                              </div>

                              {/* Stage */}
                              <div className="col-span-2">
                                <select
                                  value={row.stage}
                                  onChange={(e) => onRowChange(row.id, 'stage', e.target.value)}
                                  disabled={disabled}
                                  className="w-full px-1 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-orange-400 disabled:bg-gray-100"
                                >
                                  {STAGES.map(stage => (
                                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Actions */}
                              <div className="col-span-1 flex justify-center gap-1">
                                {!isCompleted && !isCompleting && (
                                  <button
                                    onClick={() => handleStartComplete(row)}
                                    disabled={disabled || qtyNeeded === 0}
                                    className="px-2 py-1.5 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 rounded transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                )}
                                {!isCompleted && !isCompleting && (
                                  <button
                                    onClick={() => onRemoveRow(row.id)}
                                    disabled={disabled}
                                    className="p-1.5 text-gray-400 hover:text-red-500 transition disabled:opacity-50"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="px-4 pb-2">
                              <div className="flex items-center gap-2 ml-0">
                                <div className="flex-1 bg-gray-200 rounded-full h-1">
                                  <div
                                    className={`h-1 rounded-full transition-all ${
                                      isCompleted ? 'bg-green-500' : 'bg-orange-400'
                                    }`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-[9px] text-gray-400 w-8 text-right">{progress}%</span>
                              </div>
                            </div>

                            {/* Partial completion input */}
                            {isCompleting && (
                              <div className="px-4 pb-3">
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                                  <Clock className="w-4 h-4 text-blue-500" />
                                  <span className="text-xs text-gray-600">Hoàn thành:</span>
                                  <input
                                    type="number"
                                    value={partialQty}
                                    onChange={(e) => setPartialQty(e.target.value)}
                                    className="w-16 px-2 py-1 text-sm border border-blue-300 rounded text-center font-semibold focus:outline-none focus:border-blue-500"
                                    min="1"
                                    max={qtyRemaining}
                                    autoFocus
                                  />
                                  <span className="text-xs text-gray-500">/ {qtyRemaining} cái</span>
                                  <div className="flex-1" />
                                  <button
                                    onClick={handleCancelPartial}
                                    className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                                  >
                                    Hủy
                                  </button>
                                  <button
                                    onClick={() => handleConfirmPartial(row)}
                                    className="px-3 py-1 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg transition"
                                  >
                                    Xác nhận
                                  </button>
                                </div>
                              </div>
                            )}
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
    </div>
  );
}

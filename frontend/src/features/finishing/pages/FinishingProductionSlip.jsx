import { useState } from 'react';
import { ArrowLeft, Save, Check, ChevronDown, ChevronUp, X, Loader2 } from 'lucide-react';
import TargetProductTable from '../../production-lot/components/TargetProductTable';
import OrderSelectionModal from '../../production-lot/components/OrderSelectionModal';
import MoldingInventoryModal from '../../molding/components/MoldingInventoryModal';
import { FINISHING_SLIP_CONFIGS } from '../constants/finishingStages';
import { getFinalCompleted } from '../../shared/utils/productionUtils';
import useFinishingSlip from '../hooks/useFinishingSlip';

const DEFAULT_SLIP_TYPE = 'ASSEMBLY';

// Safely convert a value to a string for rendering. Prevents React crash when
// database contains corrupted object values (e.g., {} instead of a string).
const safeStr = (v) => (v != null && typeof v === 'object' ? '' : (v ?? ''));
const safeArray = (value) => (Array.isArray(value) ? value : []);

export default function FinishingProductionSlip({ onNavigate, lotId, slipType = DEFAULT_SLIP_TYPE }) {
  const {
    currentSlipType,
    slipConfig,
    newLotId,
    lotName, setLotName,
    slipDate, setSlipDate,
    description, setDescription,
    linkedHandoffMeta,
    orders,
    selectedTargetProducts,
    orderModalOpen, setOrderModalOpen,
    inventoryModalOpen, setInventoryModalOpen,
    selectedInputs,
    invSearch, setInvSearch,
    detailRows,
    selectedProductHandoffIds,
    selectedInputHandoffLotIds,
    expandedHandoffLotId, setExpandedHandoffLotId,
    productHandoffConfirm, setProductHandoffConfirm,
    modal,
    toast,
    closeModal,
    isCompleted,
    groupedInventory,
    selectedProductIds,
    linkedHandoffQty,
    handoffLotsForCurrentSlip,
    handleToggleInputHandoffLot,
    handleImportHandoffLots,
    completedMoldingProductIds,
    handleToggleProductSelection,
    handleToggleOrderSelection,
    handleChangeProductQuantity,
    handleRemoveProduct,
    handleChangeProductMeta,
    handleChangeProductNumber,
    handleCommitProductCompletionEntry,
    handleToggleInputSelection,
    handleToggleModalBatchSelection,
    handleToggleProductHandoff,
    handleCancelLot,
    handleSaveDraft,
    handleBackToList,
    handleConfirmProduction,
    getProductRequiredQty,
    getProductCompleteQty,
    getProductHandoffRemaining,
    getProductsToHandoff,
    openProductHandoffConfirm,
    createProductHandoffSlip,
    NEXT_FINISHING_SLIP
  } = useFinishingSlip({ lotId, onNavigate, slipType });

  const [isModalSubmitting, setIsModalSubmitting] = useState(false);
  const [isHandoffSubmitting, setIsHandoffSubmitting] = useState(false);

  const isHandoffLotReceivedByCurrent = (handoffLot) =>
    Array.isArray(handoffLot.received_by_lot_ids) &&
    handoffLot.received_by_lot_ids.includes(lotId && lotId !== 'new' ? lotId : newLotId);

  const confirmedProductHandoffs = productHandoffConfirm.isOpen
    ? getProductsToHandoff(productHandoffConfirm.toSlipType, productHandoffConfirm.productIds || selectedProductHandoffIds)
    : [];
  const confirmedProductHandoffConfig = FINISHING_SLIP_CONFIGS[productHandoffConfirm.toSlipType];

  return (
    <div className="w-full min-h-screen bg-warm-white text-notion-black font-sans pb-8">
      {/* Header */}
      <nav className="flex justify-between items-center h-[48px] px-3 md:px-5 border-b border-whisper bg-notion-white sticky top-0 z-40">
        <button
          onClick={handleBackToList}
          className="flex items-center gap-1.5 text-[14px] font-medium text-warm-gray-500 hover:text-notion-black transition"
        >
          <ArrowLeft size={15} /> Quay lại
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">{slipConfig.label}</span>
          {isCompleted && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">Đã hoàn thành</span>
          )}
        </div>
      </nav>

      <div className="max-w-[1060px] mx-auto px-3 md:px-5 py-6 md:py-8">
        {/* Slip Info */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">Thông tin phiếu</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tên phiếu</label>
              <input
                type="text"
                value={lotName}
                disabled={isCompleted}
                onChange={(e) => setLotName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ngày lập</label>
              <input
                type="date"
                value={slipDate}
                disabled={isCompleted}
                onChange={(e) => setSlipDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú</label>
              <textarea
                value={description}
                disabled={isCompleted}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ghi chú..."
                rows={description?.includes('\n') ? 4 : 2}
                className="w-full resize-y px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 disabled:bg-gray-50 whitespace-pre-line"
              />
            </div>
          </div>
        </div>

        {/* Target Products */}
        <TargetProductTable
          selectedTargetProducts={selectedTargetProducts}
          disabled={isCompleted}
          onChangeProductQuantity={handleChangeProductQuantity}
          onRemoveProduct={handleRemoveProduct}
          onOpenOrderModal={() => setOrderModalOpen(true)}
        />

        {linkedHandoffMeta && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-emerald-800">Phiếu giao đã gắn</h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {linkedHandoffQty} cái
              </span>
            </div>
            <div className="grid gap-2 text-xs text-emerald-800 md:grid-cols-[1fr_1fr]">
              <div>
                <span className="text-emerald-600">Phiếu giao: </span>
                <span className="font-semibold">{linkedHandoffMeta.id}</span>
              </div>
              <div>
                <span className="text-emerald-600">Từ phiếu: </span>
                <span className="font-semibold">{linkedHandoffMeta.sourceLotId}</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-gray-800 text-sm">Phiếu giao khả dụng</h3>
            <button
              type="button"
              onClick={handleImportHandoffLots}
              disabled={selectedInputHandoffLotIds.length === 0}
              className={`h-8 rounded-lg px-3 text-xs font-semibold shadow-sm transition-all active:scale-[0.98] ${
                selectedInputHandoffLotIds.length === 0
                  ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none scale-100"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
              }`}
            >
              Nhận phiếu giao
            </button>
          </div>
          {handoffLotsForCurrentSlip.length === 0 ? (
            <div className="rounded border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400">
              Chưa có phiếu giao phù hợp với loại phiếu và sản phẩm đã chọn.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[860px] divide-y divide-slate-100 rounded border border-slate-200">
                {handoffLotsForCurrentSlip.map((handoffLot) => {
                  const products = safeArray(handoffLot.targetProducts)
                    .filter((product) => selectedProductIds.size === 0 || selectedProductIds.has(product.id));
                  const totalQty = products.reduce((sum, product) => sum + (Number(product.quantity_produce ?? product.quantity) || 0), 0);
                  const isReceived = isHandoffLotReceivedByCurrent(handoffLot);
                  const isExpanded = expandedHandoffLotId === handoffLot.id;
                  const detailRowsForLot = safeArray(handoffLot.details)
                    .filter((row) => selectedProductIds.size === 0 || selectedProductIds.has(row.productId));

                  return (
                    <div key={handoffLot.id}>
                      <div className="grid grid-cols-[36px_1fr_140px_100px_120px_92px] items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={selectedInputHandoffLotIds.includes(handoffLot.id)}
                          disabled={isReceived}
                          onChange={() => handleToggleInputHandoffLot(handoffLot.id)}
                          className="h-4 w-4 accent-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                        />
                        <div>
                          <div className="font-semibold text-slate-800">{handoffLot.id}</div>
                          <div className="text-xs text-slate-500">
                            {products.map((product) => {
                              const qty = Number(product.quantity_produce ?? product.quantity) || 0;
                              return `${product.name} (${qty} cái)`;
                            }).join(', ')}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500">Từ: {safeStr(handoffLot.source_lot_id) || '-'}</div>
                        <div>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${isReceived ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {isReceived ? 'Đã nhận' : 'Chưa nhận'}
                          </span>
                        </div>
                        <div className="text-right text-xs font-semibold text-slate-700">{totalQty} cái</div>
                        <button
                          type="button"
                          onClick={() => setExpandedHandoffLotId(isExpanded ? null : handoffLot.id)}
                          className="inline-flex h-8 items-center justify-center gap-1 rounded border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          Chi tiết
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50 px-3 py-3">
                          <div className="mb-2 grid grid-cols-[1fr_1fr_90px] gap-3 text-[11px] font-semibold uppercase text-slate-500">
                            <div>Sản phẩm</div>
                            <div>Chi tiết</div>
                            <div className="text-right">Số lượng</div>
                          </div>
                          {detailRowsForLot.length === 0 ? (
                            <div className="rounded border border-dashed border-slate-200 bg-white px-3 py-2 text-center text-xs text-slate-400">
                              Phiếu giao chưa có dòng chi tiết.
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100 rounded border border-slate-200 bg-white">
                              {detailRowsForLot.map((row) => (
                                <div key={row.id} className="grid grid-cols-[1fr_1fr_90px] gap-3 px-3 py-2 text-xs text-slate-700">
                                  <div className="min-w-0 truncate">{row.productName || row.productCode || row.productId || '-'}</div>
                                  <div className="min-w-0 truncate">{row.semiFinishedName || row.name || '-'}</div>
                                  <div className="text-right font-semibold">{Number(row.quantity) || 0}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Ghi nhận theo sản phẩm</h3>
            {NEXT_FINISHING_SLIP[currentSlipType] && (
              <button
                type="button"
                onClick={() => openProductHandoffConfirm(NEXT_FINISHING_SLIP[currentSlipType])}
                disabled={isCompleted || selectedProductHandoffIds.length === 0}
                className={`inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] ${
                  isCompleted || selectedProductHandoffIds.length === 0
                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none scale-100"
                    : "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                }`}
              >
                Tạo phiếu giao
              </button>
            )}
          </div>

          {selectedTargetProducts.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">Chưa chọn sản phẩm.</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-[42px_1.7fr_0.65fr_0.75fr_1fr_1.2fr] gap-3 bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600">
                  <div></div>
                  <div>Sản phẩm</div>
                  <div className="text-center">Cần</div>
                  <div className="text-center">Còn giao</div>
                  <div className="text-center">Đã xong lần này</div>
                  <div>{currentSlipType === 'PAINTING' ? 'Kiểu sơn' : 'Ghi chú'}</div>
                </div>
                {selectedTargetProducts.map((product) => {
                  const requiredQty = getProductRequiredQty(product, detailRows);
                  const completedQty = getProductCompleteQty(product);
                  const recordedCompletedQty = Number(product.quantity_completed) || 0;
                  const completionEntryRemaining = Math.max(0, requiredQty - recordedCompletedQty);
                  const handoffRemaining = getProductHandoffRemaining(product);
                  const canHandoff = Boolean(NEXT_FINISHING_SLIP[currentSlipType]) && handoffRemaining > 0;

                  return (
                    <div key={product.id} className="grid grid-cols-[42px_1.7fr_0.65fr_0.75fr_1fr_1.2fr] items-center gap-3 border-b border-slate-100 px-4 py-2">
                      <div className="flex justify-center">
                        {NEXT_FINISHING_SLIP[currentSlipType] && (
                          <input
                            type="checkbox"
                            checked={selectedProductHandoffIds.includes(product.id)}
                            disabled={!canHandoff}
                            onChange={() => handleToggleProductHandoff(product.id)}
                            className="h-4 w-4 accent-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-800">
                          {(product.code || product.productCode || product.id) && product.name !== (product.code || product.productCode || product.id)
                            ? `${product.code || product.productCode || product.id} - ${product.name}`
                            : product.name}
                        </div>
                        <div className="text-[11px] text-slate-500">{product.orderName || product.orderId || ''}</div>
                      </div>
                      <div className="text-center text-sm font-semibold tabular-nums text-slate-700">{requiredQty}</div>
                      <div className="text-center text-sm font-semibold tabular-nums text-emerald-700">{handoffRemaining}</div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          max={completionEntryRemaining}
                          value={product.quantity_completed_entry ?? ''}
                          disabled={isCompleted}
                          onChange={(e) => handleChangeProductNumber(product.id, 'quantity_completed_entry', e.target.value)}
                          onBlur={() => handleCommitProductCompletionEntry(product.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          className="w-full rounded border border-slate-200 px-2 py-1.5 text-center text-sm font-semibold focus:outline-none focus:border-emerald-400 disabled:bg-gray-100"
                          placeholder="0"
                        />
                        <div className="mt-1 text-center text-[11px] text-slate-400">
                          Đã ghi nhận {completedQty}/{requiredQty}
                        </div>
                      </div>
                      <div>
                        {currentSlipType === 'PAINTING' ? (
                          <select
                            value={product.paintMode || ''}
                            disabled={isCompleted}
                            onChange={(e) => handleChangeProductMeta(product.id, 'paintMode', e.target.value)}
                            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-400 disabled:bg-gray-100"
                          >
                            <option value="">Chọn kiểu sơn</option>
                            <option value="DETAIL">Sơn chi tiết</option>
                            <option value="PRODUCT">Sơn hoàn thiện sản phẩm</option>
                          </select>
                        ) : (
                          <input
                            value={product.note || ''}
                            disabled={isCompleted}
                            onChange={(e) => handleChangeProductMeta(product.id, 'note', e.target.value)}
                            className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-400 disabled:bg-gray-100"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      {!isCompleted && (
        <div className="bg-white border-t border-gray-200 p-3 md:p-4">
          <div className="max-w-[760px] mx-auto">
            {/* Progress indicator - show quantity progress */}
            {detailRows.length > 0 && (
              <div className="mb-2 text-center text-xs text-gray-500">
                <span className="font-medium text-green-600">
                  {detailRows.reduce((sum, r) => sum + getFinalCompleted(r), 0)}
                </span>
                /{detailRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0)} cái hoàn thành
              </div>
            )}
            <div className="flex gap-2 md:gap-3">
              <button
                onClick={handleCancelLot}
                className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2.5 md:py-3 rounded-lg text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 active:scale-[0.98] transition"
                title="Xoá phiếu nháp này khỏi hệ thống"
              >
                Xoá nháp
              </button>
              <button
                onClick={handleSaveDraft}
                className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2.5 md:py-3 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition"
              >
                <Save className="w-4 h-4" /> Lưu nháp
              </button>
              <button
                onClick={handleConfirmProduction}
                className="flex-[2] md:flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2.5 md:py-3 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition"
              >
                <Check className="w-4 h-4" /> Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Selection Modal */}
      {orderModalOpen && !isCompleted && (
        <OrderSelectionModal
          orders={orders}
          selectedTargetProducts={selectedTargetProducts}
          disabledProductIds={[...completedMoldingProductIds]}
          onClose={() => setOrderModalOpen(false)}
          onToggleProductSelection={handleToggleProductSelection}
          onToggleOrderSelection={handleToggleOrderSelection}
        />
      )}

      {/* Inventory Modal - Only SEMIFINISHED and SURPLUS */}
      {inventoryModalOpen && !isCompleted && (
        <MoldingInventoryModal
          groupedInventory={groupedInventory}
          selectedInputs={selectedInputs}
          invSearch={invSearch}
          setInvSearch={setInvSearch}
          onClose={() => setInventoryModalOpen(false)}
          onToggleInputSelection={handleToggleInputSelection}
          onToggleModalBatchSelection={handleToggleModalBatchSelection}
        />
      )}

      {productHandoffConfirm.isOpen && confirmedProductHandoffConfig && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="flex max-h-[88vh] w-full max-w-[600px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
              <h3 className="font-semibold text-gray-800">
                {productHandoffConfirm.mode === 'complete' ? 'Xác nhận hoàn tất và giao công đoạn tiếp theo' : 'Xác nhận tạo phiếu giao'}
              </h3>
              <button
                type="button"
                disabled={isHandoffSubmitting}
                onClick={() => setProductHandoffConfirm({ isOpen: false, toSlipType: null, mode: 'handoff', productIds: null })}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 overflow-auto px-5 py-4 text-sm text-gray-600">
              <div className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                Công đoạn tiếp theo: {confirmedProductHandoffConfig.label}
              </div>
              <p className="mb-3">
                Các sản phẩm dưới đây sẽ được tạo vào {confirmedProductHandoffConfig.autoNamePrefix.toLowerCase()} mới. Số lượng đã giao trước đó đến công đoạn này sẽ không được tạo lại.
              </p>
              <div className="max-h-[320px] overflow-auto rounded-lg border border-gray-200">
                {confirmedProductHandoffs.map(({ product, quantity }) => (
                  <div key={product.id} className="grid grid-cols-[1fr_90px] gap-3 border-b border-gray-100 px-3 py-2 text-xs last:border-b-0">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-800">
                        {(product.code || product.productCode || product.id) && product.name !== (product.code || product.productCode || product.id)
                          ? `${product.code || product.productCode || product.id} - ${product.name}`
                          : product.name}
                      </div>
                      <div className="truncate text-slate-400">{product.orderName || product.orderId || ''}</div>
                    </div>
                    <div className="text-right font-semibold text-slate-800">{quantity} cái</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
              <button
                type="button"
                disabled={isHandoffSubmitting}
                onClick={() => setProductHandoffConfirm({ isOpen: false, toSlipType: null, mode: 'handoff', productIds: null })}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                  isHandoffSubmitting
                    ? "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed shadow-none"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                }`}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={confirmedProductHandoffs.length === 0 || isHandoffSubmitting}
                onClick={async () => {
                  const { toSlipType, mode, productIds } = productHandoffConfirm;
                  setIsHandoffSubmitting(true);
                  try {
                    await createProductHandoffSlip(toSlipType, {
                      productIds,
                      completeSource: mode === 'complete',
                    });
                    setProductHandoffConfirm({ isOpen: false, toSlipType: null, mode: 'handoff', productIds: null });
                  } catch (error) {
                    console.error("Lỗi khi tạo phiếu giao:", error);
                  } finally {
                    setIsHandoffSubmitting(false);
                  }
                }}
                className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                  confirmedProductHandoffs.length === 0 || isHandoffSubmitting
                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none scale-100"
                    : "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                }`}
              >
                {isHandoffSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isHandoffSubmitting 
                  ? (productHandoffConfirm.mode === 'complete' ? 'Đang hoàn tất...' : 'Đang tạo...') 
                  : (productHandoffConfirm.mode === 'complete' ? 'Hoàn tất và tạo phiếu giao' : 'Tạo phiếu giao')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert/Confirm Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[400px] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-800">{modal.title}</h3>
              <button 
                onClick={closeModal} 
                disabled={isModalSubmitting} 
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-6 text-gray-600 text-sm leading-relaxed">{modal.message}</div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
              {modal.cancelText && (
                <button 
                  onClick={() => { if (modal.onCancel) modal.onCancel(); else closeModal(); }} 
                  disabled={isModalSubmitting} 
                  className={`px-4 py-2 text-sm font-medium border rounded-lg transition-all active:scale-[0.98] ${
                    isModalSubmitting
                      ? "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed"
                      : "text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100 cursor-pointer"
                  }`}
                >
                  {modal.cancelText}
                </button>
              )}
              <button
                onClick={async () => {
                  if (modal.onConfirm) {
                    setIsModalSubmitting(true);
                    try {
                      await modal.onConfirm();
                    } finally {
                      setIsModalSubmitting(false);
                      closeModal();
                    }
                  } else {
                    closeModal();
                  }
                }}
                disabled={isModalSubmitting}
                className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-all active:scale-[0.98] ${
                  isModalSubmitting
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "text-white bg-orange-600 hover:bg-orange-700 cursor-pointer"
                }`}
              >
                {isModalSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {modal.confirmText || 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Notification */}
      {toast && toast.show && (
        <div className="fixed bottom-6 right-6 z-[300] bg-gray-900/90 backdrop-blur-sm text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

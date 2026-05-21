import { useState } from 'react';
import { ArrowLeft, Save, Check, X, Loader2 } from 'lucide-react';

import InputTable from '../../production-lot/components/InputTable';
import TargetProductTable from '../../production-lot/components/TargetProductTable';
import MoldingDetailTable from '../components/MoldingDetailTable';
import CustomRequestTable from '../components/CustomRequestTable';
import OrderSelectionModal from '../../production-lot/components/OrderSelectionModal';
import MoldingInventoryModal from '../components/MoldingInventoryModal';
import { FINISHING_SLIP_CONFIGS } from '../../finishing/constants/finishingStages';
import { getFinalCompleted } from '../../shared/utils/productionUtils';
import useMoldingSlip from '../hooks/useMoldingSlip';

const ACTIVE_STATUS = 'Đang sản xuất';

export default function MoldingProductionSlip({ onNavigate, lotId }) {
  const {
    lotName, setLotName,
    slipDate, setSlipDate,
    description, setDescription,
    orders,
    selectedTargetProducts,
    orderModalOpen, setOrderModalOpen,
    inventoryModalOpen, setInventoryModalOpen,
    selectedInputs,
    invSearch, setInvSearch,
    customRequests,
    detailRows,
    selectedStageId, setSelectedStageId,
    stageTickets,
    selectedHandoffRowIds,
    handoffTargetSlipType, setHandoffTargetSlipType,
    handoffConfirm, setHandoffConfirm,
    modal,
    toast,
    isCompleted,
    closeModal,
    groupedInventory,
    completedMoldingProductIds,
    handleToggleProductSelection,
    handleToggleOrderSelection,
    handleChangeProductQuantity,
    handleRemoveProduct,
    handleToggleInputSelection,
    handleToggleModalBatchSelection,
    handleRemoveInputItem,
    handleChangeInputQuantity,
    handleChangeInputVolume,
    handleRemoveInputBatch,
    handleAddCustomRequest,
    handleRemoveCustomRequest,
    handleChangeCustomRequest,
    handleSendCustomRequests,
    handleRemoveDetailRow,
    handleStageCompletedChange,
    handleSaveStageProgress,
    handleCompleteProductStages,
    handleCompleteDetailStages,
    getHandoffRemaining,
    handleToggleHandoffRow,
    handleCreateHandoffSlip,
    handleApplyDetailStages,
    saveLotToDb,
    handleSaveDraft,
    handleBackToList,
    handleCancelLot,
    handleConfirmProduction,
    finalizeProduction,
    getRowsToHandoff,
    groupRowsForHandoff,
    DEFAULT_HANDOFF_TARGET,
    HANDOFF_TARGET_OPTIONS
  } = useMoldingSlip({ lotId, onNavigate });

  const [isModalSubmitting, setIsModalSubmitting] = useState(false);
  const [isHandoffSubmitting, setIsHandoffSubmitting] = useState(false);

  const handoffRowsToConfirm = handoffConfirm.isOpen
    ? getRowsToHandoff(handoffConfirm.rowIds, handoffTargetSlipType)
    : [];
  const handoffGroupsToConfirm = groupRowsForHandoff(handoffRowsToConfirm);
  const handoffTargetConfig = FINISHING_SLIP_CONFIGS[handoffTargetSlipType] || FINISHING_SLIP_CONFIGS[DEFAULT_HANDOFF_TARGET];

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
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-orange-100 text-orange-700">Định hình</span>
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

        {/* Inputs - Only SEMIFINISHED and SURPLUS */}
        <InputTable
          selectedInputs={selectedInputs}
          disabled={isCompleted}
          onOpenInventoryModal={() => {
            setInvSearch('');
            setInventoryModalOpen(true);
          }}
          onChangeInputQuantity={handleChangeInputQuantity}
          onChangeInputVolume={handleChangeInputVolume}
          onRemoveInputBatch={handleRemoveInputBatch}
          onRemoveInputItem={handleRemoveInputItem}
        />

        {/* Custom Requests */}
        <CustomRequestTable
          customRequests={customRequests}
          disabled={isCompleted}
          onAddRequest={handleAddCustomRequest}
          onRemoveRequest={handleRemoveCustomRequest}
          onChangeRequest={handleChangeCustomRequest}
          onSendRequests={handleSendCustomRequests}
        />

        {/* Molding Detail - Stages */}
        <MoldingDetailTable
          detailRows={detailRows}
          disabled={isCompleted}
          selectedStageId={selectedStageId}
          stageTickets={stageTickets}
          onRemoveRow={handleRemoveDetailRow}
          onStageCompletedChange={handleStageCompletedChange}
          onStageChange={setSelectedStageId}
          onSaveStageProgress={handleSaveStageProgress}
          onCompleteProductStages={handleCompleteProductStages}
          onCompleteDetailStages={handleCompleteDetailStages}
          onApplyStages={handleApplyDetailStages}
          selectedHandoffRowIds={selectedHandoffRowIds}
          onToggleHandoffRow={handleToggleHandoffRow}
          getHandoffRemaining={getHandoffRemaining}
          onCreateHandoffSlip={handleCreateHandoffSlip}
        />
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

      {handoffConfirm.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="flex max-h-[88vh] w-full max-w-[640px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
              <h3 className="font-semibold text-gray-800">
                {handoffConfirm.mode === 'complete' ? 'Xác nhận hoàn tất và tạo phiếu giao' : 'Xác nhận tạo phiếu giao'}
              </h3>
              <button
                type="button"
                disabled={isHandoffSubmitting}
                onClick={() => setHandoffConfirm({ isOpen: false, mode: 'handoff', rowIds: [] })}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 overflow-auto px-5 py-4 text-sm text-gray-600">
              <label className="mb-2 block text-xs font-semibold text-slate-600">Công đoạn tiếp theo</label>
              <div className="mb-4 flex flex-wrap gap-2">
                {HANDOFF_TARGET_OPTIONS.map((type) => (
                  <button
                    key={type}
                    type="button"
                    disabled={isHandoffSubmitting}
                    onClick={() => setHandoffTargetSlipType(type)}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      isHandoffSubmitting
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    } ${
                      handoffTargetSlipType === type
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {FINISHING_SLIP_CONFIGS[type].label}
                  </button>
                ))}
              </div>

              <p className="mb-3">
                Các chi tiết dưới đây sẽ được tạo vào {handoffTargetConfig.autoNamePrefix.toLowerCase()} mới. Số lượng đã giao đến công đoạn này trước đó sẽ không được tạo lại.
              </p>

              {handoffRowsToConfirm.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-center text-sm text-slate-400">
                  Không còn chi tiết nào chưa giao đến {handoffTargetConfig.label}.
                </div>
              ) : (
                <div className="max-h-[320px] overflow-auto rounded-lg border border-gray-200">
                  {Object.values(handoffGroupsToConfirm).map((group) => (
                    <div key={`${group.productCode}-${group.productName}`} className="border-b border-gray-100 last:border-b-0">
                      <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-800">
                        {group.productCode && group.productName !== group.productCode
                          ? `${group.productCode} - ${group.productName}`
                          : group.productName}
                      </div>
                      {group.items.map((row) => (
                        <div key={row.id} className="grid grid-cols-[1fr_80px] gap-2 px-3 py-2 text-xs">
                          <span className="truncate">{row.semiFinishedName || 'Chi tiết'}</span>
                          <span className="text-right font-semibold">{row.handoffQuantity} cái</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
              <button
                type="button"
                disabled={isHandoffSubmitting}
                onClick={() => setHandoffConfirm({ isOpen: false, mode: 'handoff', rowIds: [] })}
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
                disabled={handoffRowsToConfirm.length === 0 || isHandoffSubmitting}
                onClick={async () => {
                  const { mode, rowIds } = handoffConfirm;
                  setIsHandoffSubmitting(true);
                  try {
                    if (mode === 'complete') {
                      setHandoffConfirm({ isOpen: false, mode: 'handoff', rowIds: [] });
                      finalizeProduction(handoffTargetSlipType);
                      return;
                    }
                    const sourceLotId = await saveLotToDb(ACTIVE_STATUS);
                    await createHandoffSlip(rowIds, sourceLotId, handoffTargetSlipType);
                    setHandoffConfirm({ isOpen: false, mode: 'handoff', rowIds: [] });
                  } catch (error) {
                    console.error("Lỗi khi tạo phiếu giao:", error);
                  } finally {
                    setIsHandoffSubmitting(false);
                  }
                }}
                className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                  handoffRowsToConfirm.length === 0 || isHandoffSubmitting
                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none scale-100"
                    : "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                }`}
              >
                {isHandoffSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isHandoffSubmitting 
                  ? (handoffConfirm.mode === 'complete' ? 'Đang hoàn tất...' : 'Đang tạo...') 
                  : (handoffConfirm.mode === 'complete' ? 'Hoàn tất và tạo phiếu giao' : 'Tạo phiếu giao')}
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

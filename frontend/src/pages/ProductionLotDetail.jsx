import { useEffect, useState } from 'react';
import { ArrowLeft, Save, Check, CheckCircle, X, Lock } from 'lucide-react';
import { db } from '../services/db';
import { removeVietnameseTones } from '../utils/stringUtils';
import { normalizeInventoryType } from '../utils/inventoryTypes';

import InputTable from '../components/ProductionLot/InputTable';
import TargetProductTable from '../components/ProductionLot/TargetProductTable';
import OrderSelectionModal from '../components/ProductionLot/OrderSelectionModal';
import OutputTable from '../components/ProductionLot/OutputTable';
import InventoryModal from '../components/ProductionLot/InventoryModal';
import LossPrediction from '../components/ProductionLot/LossPrediction';

const ACTIVE_STATUS = 'Đang sản xuất';
const COMPLETED_STATUS = 'Hoàn thành';
const DEFAULT_LOT_NAME = 'Phiếu sản xuất phôi mới';
const LEGACY_DEFAULT_LOT_NAMES = ['Lệnh SX Mới', 'Lệnh sản xuất'];

const createOutputRow = () => ({
  id: `OUT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  name: '',
  thickness: '',
  width: '',
  length: '',
  quantity: '',
  volume: '',
  status: 'Thành phẩm'
});

const createLotId = () => db.createLotId('PHOI_GO');

const getSelectedOrderCodes = (products = []) => {
  const codes = products.map((product) => product.orderName || product.orderId).filter(Boolean);
  return [...new Set(codes)];
};

const shouldUseAutoLotName = (name) => {
  const trimmed = String(name || '').trim();
  if (!trimmed) return true;
  if (trimmed.toLowerCase().startsWith('phiếu bổ sung')) return false;
  return trimmed === DEFAULT_LOT_NAME || LEGACY_DEFAULT_LOT_NAMES.includes(trimmed);
};

const buildAutoLotName = (products = []) => {
  const orderCodes = getSelectedOrderCodes(products);
  return orderCodes.length > 0
    ? `Phiếu sản xuất phôi - ${orderCodes.join(', ')}`
    : DEFAULT_LOT_NAME;
};

export default function ProductionLotDetail({ onNavigate, lotId }) {
  const [newLotId] = useState(createLotId);
  const [lotName, setLotName] = useState(lotId ? `Lệnh SX ${lotId}` : '');
  const [status, setStatus] = useState(ACTIVE_STATUS);
  const [description, setDescription] = useState('');
  const [selectedTargetProducts, setSelectedTargetProducts] = useState([]);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [availableInventory, setAvailableInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedInputs, setSelectedInputs] = useState([]);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [invSearch, setInvSearch] = useState('');
  const [invTab, setInvTab] = useState('ALL');
  const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
  const [showOutputValidation, setShowOutputValidation] = useState(false);
  const [outputs, setOutputs] = useState([createOutputRow()]);

  const closeModal = () => setModal((prev) => ({ ...prev, isOpen: false }));
  const isCompleted = status === COMPLETED_STATUS;

  useEffect(() => {
    setAvailableInventory(db.getInventory());
    setOrders(db.getOrders() || []);
    db.syncFromMcp({ orders: { maxOrders: 30, detailOrderLimit: 10, bomProductLimit: 4 } })
      .then(() => {
        setAvailableInventory(db.getInventory());
        setOrders(db.getOrders() || []);
      })
      .catch(() => {
        setAvailableInventory(db.getInventory());
        setOrders(db.getOrders() || []);
      });

    if (!lotId) {
      setLotName(DEFAULT_LOT_NAME);
      return;
    }

    const lot = db.getLot(lotId);
    if (!lot) return;

    setLotName(lot.name || '');
    setStatus(lot.status || ACTIVE_STATUS);
    setDescription(lot.description || '');
    setSelectedTargetProducts(lot.targetProducts || []);
    setSelectedInputs((lot.inputs || []).map((item) => ({
      ...item,
      quantity_used: item.quantity_used ?? item.quantity,
      volume_used: item.volume_used ?? item.volume
    })));
    setOutputs(lot.outputs && lot.outputs.length > 0 ? lot.outputs : [createOutputRow()]);
  }, [lotId]);

  const handleOpenOrderModal = () => {
    if (isCompleted) return;
    setOrderModalOpen(true);
  };

  const handleToggleProductSelection = (product, order) => {
    const exists = selectedTargetProducts.find((item) => item.id === product.id);
    if (exists) {
      setSelectedTargetProducts(selectedTargetProducts.filter((item) => item.id !== product.id));
      return;
    }

    setSelectedTargetProducts([
      ...selectedTargetProducts,
      { ...product, orderId: order.id, orderName: order.name, quantity_produce: product.quantity }
    ]);
  };

  const handleToggleOrderSelection = (order) => {
    const allSelected = order.products.every((product) => selectedTargetProducts.find((item) => item.id === product.id));
    if (allSelected) {
      const productIds = order.products.map((product) => product.id);
      setSelectedTargetProducts(selectedTargetProducts.filter((item) => !productIds.includes(item.id)));
      return;
    }

    const newProducts = order.products
      .filter((product) => !selectedTargetProducts.find((item) => item.id === product.id))
      .map((product) => ({ ...product, orderId: order.id, orderName: order.name, quantity_produce: product.quantity }));

    setSelectedTargetProducts([...selectedTargetProducts, ...newProducts]);
  };

  const handleChangeProductQuantity = (id, qty) => {
    setSelectedTargetProducts(selectedTargetProducts.map((product) => (
      product.id === id ? { ...product, quantity_produce: qty } : product
    )));
  };

  const handleRemoveProduct = (id) => {
    setSelectedTargetProducts(selectedTargetProducts.filter((product) => product.id !== id));
  };

  const handleOpenInventoryModal = () => {
    if (isCompleted) return;
    setInvSearch('');
    setInvTab('ALL');
    setInventoryModalOpen(true);
  };

  const handleToggleInputSelection = (item) => {
    const exists = selectedInputs.find((input) => input.id === item.id);
    if (exists) {
      setSelectedInputs(selectedInputs.filter((input) => input.id !== item.id));
      return;
    }

    setSelectedInputs([
      ...selectedInputs,
      {
        ...item,
        type: normalizeInventoryType(item),
        quantity_used: item.quantity,
        volume_used: item.volume
      }
    ]);
  };

  const handleToggleModalBatchSelection = (batchItems) => {
    const allSelected = batchItems.every((item) => selectedInputs.find((input) => input.id === item.id));
    if (allSelected) {
      const batchIds = batchItems.map((item) => item.id);
      setSelectedInputs(selectedInputs.filter((input) => !batchIds.includes(input.id)));
      return;
    }

    const newItems = batchItems
      .filter((item) => !selectedInputs.find((input) => input.id === item.id))
      .map((item) => ({
        ...item,
        type: normalizeInventoryType(item),
        quantity_used: item.quantity,
        volume_used: item.volume
      }));

    setSelectedInputs([...selectedInputs, ...newItems]);
  };

  const handleRemoveInputItem = (id) => {
    setSelectedInputs(selectedInputs.filter((item) => item.id !== id));
  };

  const handleRemoveInputBatch = (batchId) => {
    setSelectedInputs(selectedInputs.filter((item) => (item.batchId || item.id) !== batchId));
  };

  const handleChangeInputQuantity = (id, newQty) => {
    setSelectedInputs(selectedInputs.map((item) => {
      if (item.id !== id) return item;

      const qty = newQty === '' ? '' : Number(newQty);
      let volume = item.volume_used;

      if (qty !== '' && item.thickness && item.width && item.length && item.length !== 0) {
        volume = ((Number(item.thickness) * Number(item.width) * Number(item.length) * qty) / 1000000000).toFixed(4);
      }

      return { ...item, quantity_used: qty, volume_used: volume };
    }));
  };

  const handleChangeInputVolume = (id, newVol) => {
    setSelectedInputs(selectedInputs.map((item) => (
      item.id === id ? { ...item, volume_used: newVol } : item
    )));
  };

  const handleAddOutput = () => {
    setOutputs([...outputs, createOutputRow()]);
  };

  const handleRemoveOutput = (id) => {
    setOutputs(outputs.filter((item) => item.id !== id));
  };

  const handleChangeOutput = (id, field, value) => {
    setOutputs(outputs.map((entry) => {
      if (entry.id !== id) return entry;

      const updated = { ...entry, [field]: value };
      if (['length', 'width', 'thickness', 'quantity'].includes(field)) {
        const l = parseFloat(updated.length) || 0;
        const w = parseFloat(updated.width) || 0;
        const t = parseFloat(updated.thickness) || 0;
        const q = parseFloat(updated.quantity) || 0;
        if (l > 0 && w > 0 && t > 0 && q > 0) {
          updated.volume = ((l * w * t * q) / 1000000000).toFixed(4);
        }
      }
      return updated;
    }));
  };

  const findInvalidOutputForCompletion = () => outputs.find((entry) => {
    const requiresVolume = entry.status === 'Phôi dư' || entry.status === 'Phế phẩm';
    if (!requiresVolume) return false;

    const volume = entry.volume === '' ? NaN : Number(entry.volume);
    return !Number.isFinite(volume) || volume <= 0;
  });

  const getCompletionError = () => {
    // Check for missing volume in Phôi dư/Phế phẩm rows
    const invalidOutput = findInvalidOutputForCompletion();
    if (invalidOutput) {
      return 'Các dòng phôi dư hoặc phế phẩm được phép bỏ trống quy cách và số lượng, nhưng bắt buộc phải nhập số khối lớn hơn 0.';
    }

    // Check for invalid input usage
    const invalidInput = selectedInputs.find((item) => {
      const originalQty = Number(item.quantity) || 0;
      const usedQty = item.quantity_used === '' ? NaN : Number(item.quantity_used);
      const originalVol = Number(item.volume) || 0;
      const usedVol = item.volume_used === '' ? NaN : Number(item.volume_used);

      if (!Number.isFinite(usedVol) || usedVol < 0 || usedVol > originalVol) return true;
      if (originalQty > 0 && (!Number.isFinite(usedQty) || usedQty < 0 || usedQty > originalQty)) return true;
      return false;
    });

    if (invalidInput) {
      return 'Nguyên liệu đầu vào đang có dòng dùng vượt quá số lượng hoặc số khối tồn.';
    }

    // Get unique wood types from inputs (for reference, but not strictly required)
    const inputWoodTypes = new Set(
      selectedInputs
        .map((item) => removeVietnameseTones(item.name || ''))
        .filter(Boolean)
    );

    // Filter outputs that have actual data (quantity, volume, or wood type selected)
    // Consider a row valid if it has at least: name + (quantity OR volume)
    const populatedOutputs = outputs.filter((item) => {
      const qty = Number(item.quantity) || 0;
      const vol = Number(item.volume) || 0;
      // Must have wood type AND at least quantity or volume
      return !!item.name && (qty > 0 || vol > 0);
    });

    // If no outputs at all, error
    if (populatedOutputs.length === 0) {
      return 'Kết quả sản xuất chưa có dòng đầu ra hợp lệ. Vui lòng thêm ít nhất một dòng có loại gỗ và số lượng hoặc số khối.';
    }

    // Check for missing wood type in populated outputs (those with quantity or volume)
    const missingWoodType = populatedOutputs.find((item) => !item.name);
    if (missingWoodType) {
      return 'Vui lòng chọn loại gỗ cho tất cả các dòng đầu ra có số lượng hoặc số khối.';
    }

    // Warn if output wood type is not in input, but allow it (flexible)
    const outputWoodNotInInput = populatedOutputs.find((item) => !inputWoodTypes.has(removeVietnameseTones(item.name || '')));
    if (outputWoodNotInInput && selectedInputs.length > 0) {
      // Not an error anymore, just a warning - we allow different wood types
      // This is handled by showing the warning in the UI
    }

    // Check for incomplete finished products - only require quantity OR volume, not all dimensions
    const incompleteFinishedProduct = populatedOutputs.find((item) => {
      if (item.status !== 'Thành phẩm') return false;

      const quantity = Number(item.quantity) || 0;
      const volume = Number(item.volume) || 0;

      // Thành phẩm chỉ cần có số lượng > 0 HOẶC số khối > 0
      return quantity <= 0 && volume <= 0;
    });

    if (incompleteFinishedProduct) {
      return 'Dòng thành phẩm phải có số lượng hoặc số khối lớn hơn 0.';
    }

    // Check total volumes
    const totalInputVolume = selectedInputs.reduce((sum, item) => sum + (Number(item.volume_used) || 0), 0);
    const totalOutputVolume = populatedOutputs.reduce((sum, item) => sum + (Number(item.volume) || 0), 0);

    if (totalOutputVolume <= 0) {
      return 'Kết quả sản xuất phải có tổng số khối lớn hơn 0.';
    }

    if (totalInputVolume > 0 && totalOutputVolume > totalInputVolume) {
      return `Tổng số khối đầu ra (${totalOutputVolume.toFixed(4)} m³) không được lớn hơn tổng số khối nguyên liệu đầu vào (${totalInputVolume.toFixed(4)} m³).`;
    }

    return null;
  };

  const saveLotToDb = (newStatus) => {
    const finalLotId = lotId || newLotId;
    const finalLotName = shouldUseAutoLotName(lotName)
      ? buildAutoLotName(selectedTargetProducts)
      : lotName;
    const lot = {
      id: finalLotId,
      name: finalLotName,
      date: new Date().toISOString().split('T')[0],
      status: newStatus,
      description,
      slip_type: 'PHOI_GO',
      targetProducts: selectedTargetProducts,
      inputs: selectedInputs,
      outputs
    };

    db.saveLot(lot);
    setLotName(finalLotName);
    setStatus(newStatus);
    return finalLotId;
  };

  const handleSaveDraft = () => {
    if (isCompleted) return;
    saveLotToDb(ACTIVE_STATUS);
    setShowOutputValidation(false);
    setModal({
      isOpen: true,
      type: 'alert',
      title: 'Thành công',
      message: 'Đã lưu nháp lệnh sản xuất.'
    });
  };

  const handleBackToList = () => {
    if (isCompleted) {
      onNavigate('lot-list');
      return;
    }

    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Rời khỏi phiếu?',
      message: 'Bạn có muốn lưu nháp phiếu sản xuất phôi trước khi quay lại danh sách không?',
      cancelText: 'Không lưu',
      onCancel: () => onNavigate('lot-list'),
      onConfirm: () => {
        saveLotToDb(ACTIVE_STATUS);
        onNavigate('lot-list');
      }
    });
  };

  const handleCancelLot = () => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Xoá phiếu?',
      message: 'Bạn có chắc muốn huỷ và xoá phiếu sản xuất phôi này không? Hành động này không thể hoàn tác.',
      onConfirm: () => {
        db.deleteLot(lotId || newLotId);
        onNavigate('lot-list');
      }
    });
  };

  const handleConfirmProduction = () => {
    if (isCompleted) return;

    const completionError = getCompletionError();
    if (completionError) {
      setShowOutputValidation(true);
      setModal({
        isOpen: true,
        type: 'alert',
        title: 'Không thể hoàn tất',
        message: completionError
      });
      return;
    }

    setShowOutputValidation(false);
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Xác nhận hoàn tất',
      message: 'Xác nhận hoàn thành sản xuất? Thành phẩm và phôi dư sẽ được tự động nhập kho.',
      onConfirm: () => {
        const finalLotId = saveLotToDb(COMPLETED_STATUS);
        const newInventoryItems = [];

        outputs.forEach((entry) => {
          const actualQty = Number(entry.quantity) || 0;
          const actualVol = Number(entry.volume) || 0;
          if (actualQty <= 0 && actualVol <= 0) return;

          let itemType = 'SEMIFINISHED';
          let itemStatus = 'Sẵn sàng';

          if (entry.status === 'Phôi dư') {
            itemType = 'SURPLUS';
            itemStatus = 'Tồn kho';
          } else if (entry.status === 'Phế phẩm') {
            itemType = 'WASTE';
            itemStatus = 'Loại bỏ';
          }

          newInventoryItems.push({
            name: entry.name || 'Phôi',
            length: Number(entry.length) || 0,
            width: Number(entry.width) || 0,
            thickness: Number(entry.thickness) || 0,
            quantity: actualQty,
            volume: actualVol,
            type: itemType,
            status: itemStatus,
            source_lot_id: finalLotId
          });
        });

        if (selectedInputs.length > 0) {
          const idsToRemove = selectedInputs.map((item) => item.id);
          db.removeInventory(idsToRemove);

          const partials = selectedInputs.filter((item) => {
            const originalQty = Number(item.quantity) || 0;
            const usedQty = Number(item.quantity_used) || 0;
            const originalVol = Number(item.volume) || 0;
            const usedVol = Number(item.volume_used) || 0;

            if (originalQty > 0) return originalQty > usedQty;
            return originalVol > usedVol && usedVol >= 0;
          }).map((item) => {
            const originalQty = Number(item.quantity) || 0;
            const usedQty = Number(item.quantity_used) || 0;
            const originalVol = Number(item.volume) || 0;
            const usedVol = Number(item.volume_used) || 0;

            let remainingQty = 0;
            let remainingVol;

            if (originalQty > 0) {
              remainingQty = originalQty - usedQty;
              const l = parseFloat(item.length) || 0;
              const w = parseFloat(item.width) || 0;
              const t = parseFloat(item.thickness) || 0;
              remainingVol = ((l * w * t * remainingQty) / 1000000000).toFixed(4);
            } else {
              remainingVol = (originalVol - usedVol).toFixed(4);
            }

            return {
              ...item,
              id: `INV-REM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              quantity: remainingQty,
              volume: remainingVol
            };
          });

          if (partials.length > 0) {
            newInventoryItems.push(...partials);
          }
        }

        if (newInventoryItems.length > 0) {
          db.addInventory(newInventoryItems);
        }

        setModal({
          isOpen: true,
          type: 'alert',
          title: 'Thành công',
          message: 'Đã xác nhận hoàn thành và nhập kho thành công.',
          onConfirm: () => onNavigate('lot-list')
        });
      }
    });
  };

  const filteredInventory = availableInventory.filter((item) => {
    const itemType = normalizeInventoryType(item);
    const matchesTab = invTab === 'ALL' || itemType === invTab;
    const term = removeVietnameseTones(invSearch);
    const matchesSearch =
      removeVietnameseTones(item.name || '').includes(term) ||
      removeVietnameseTones(item.batchId || '').includes(term);
    return matchesTab && matchesSearch;
  });

  const groupedInventory = Object.values(filteredInventory.reduce((acc, item) => {
    const batchId = item.batchId || item.id;
    if (!acc[batchId]) {
      acc[batchId] = { batchId, type: normalizeInventoryType(item), items: [] };
    }
    acc[batchId].items.push(item);
    return acc;
  }, {}));

  return (
    <div className="w-full min-h-screen bg-warm-white text-notion-black font-sans pb-8">
      <nav className="flex justify-between items-center h-[48px] px-3 md:px-5 border-b border-whisper bg-notion-white sticky top-0 z-40">
        <button
          onClick={handleBackToList}
          className="flex items-center gap-1.5 text-[14px] font-medium text-warm-gray-500 hover:text-notion-black transition"
        >
          <ArrowLeft size={15} /> Quay lại
        </button>
      </nav>

      <div className="max-w-[1060px] mx-auto px-3 md:px-5 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-bold text-warm-gray-400 uppercase tracking-wider">{lotId || 'Mới'}</span>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 px-2.5 py-[3px] text-[11px] font-semibold tracking-[0.125px] rounded-full bg-success-green/10 text-success-green uppercase">
                <CheckCircle size={12} /> Đã hoàn thành
              </span>
            )}
          </div>
          <input
            type="text"
            value={lotName}
            disabled={isCompleted}
            onChange={(e) => setLotName(e.target.value)}
            className="w-full text-2xl md:text-[32px] font-bold tracking-[-1px] leading-[1.1] text-notion-black bg-transparent border-none focus:outline-none placeholder-warm-gray-300 mb-3 md:mb-4 disabled:text-warm-gray-500"
            placeholder="Tên lệnh sản xuất..."
          />
          <textarea
            value={description}
            disabled={isCompleted}
            onChange={(e) => setDescription(e.target.value)}
            rows={description?.includes('\n') ? 4 : 2}
            className="w-full resize-y text-[14px] text-notion-black bg-notion-white border border-whisper rounded-[6px] px-3 py-2.5 md:py-2 focus:outline-none focus:border-notion-blue placeholder-warm-gray-300 mb-4 disabled:bg-gray-50 disabled:text-warm-gray-500 whitespace-pre-line"
            placeholder="Ghi chú chi tiết lệnh sản xuất..."
          />
          {isCompleted && (
            <div className="flex items-center gap-2 text-[13px] text-warm-gray-500 bg-gray-50 border border-whisper rounded-[8px] px-3 py-2.5">
              <Lock size={14} className="text-warm-gray-400" />
              Lệnh này đã hoàn thành. Các thao tác lưu nháp, hoàn tất và chỉnh sửa dữ liệu đã bị khóa.
            </div>
          )}
        </div>

        <TargetProductTable
          selectedTargetProducts={selectedTargetProducts}
          disabled={isCompleted}
          onChangeProductQuantity={handleChangeProductQuantity}
          onRemoveProduct={handleRemoveProduct}
          onOpenOrderModal={handleOpenOrderModal}
        />

        <InputTable
          selectedInputs={selectedInputs}
          disabled={isCompleted}
          onOpenInventoryModal={handleOpenInventoryModal}
          onChangeInputQuantity={handleChangeInputQuantity}
          onChangeInputVolume={handleChangeInputVolume}
          onRemoveInputBatch={handleRemoveInputBatch}
          onRemoveInputItem={handleRemoveInputItem}
        />

        <LossPrediction inputs={selectedInputs} />

        <OutputTable
          outputs={outputs}
          disabled={isCompleted}
          showValidation={showOutputValidation}
          availableWoodTypes={[...new Set(selectedInputs.map(i => i.name).filter(Boolean))]}
          onAddOutput={handleAddOutput}
          onRemoveOutput={handleRemoveOutput}
          onChangeOutput={handleChangeOutput}
        />
      </div>

      {!isCompleted && (
        <div className="bg-white border-t border-gray-200 p-3 md:p-4">
          <div className="max-w-[760px] mx-auto flex gap-2 md:gap-3">
            <button
              onClick={handleCancelLot}
              className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2.5 md:py-3 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition"
            >
              Huỷ
            </button>
            <button
              onClick={handleSaveDraft}
              className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2.5 md:py-3 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition"
            >
              <Save size={16} /> <span className="hidden sm:inline">Lưu nháp</span><span className="sm:hidden">Lưu</span>
            </button>
            <button
              onClick={handleConfirmProduction}
              className="flex-[2] md:flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2.5 md:py-3 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition"
            >
              <Check size={16} /> <span className="hidden sm:inline">Hoàn tất sản xuất</span><span className="sm:hidden">Hoàn tất</span>
            </button>
          </div>
        </div>
      )}

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
              {modal.cancelText && (
                <button
                  onClick={() => { if (modal.onCancel) modal.onCancel(); else closeModal(); }}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 active:scale-[0.98] transition"
                >
                  {modal.cancelText}
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

      {orderModalOpen && !isCompleted && (
        <OrderSelectionModal
          orders={orders}
          selectedTargetProducts={selectedTargetProducts}
          onClose={() => setOrderModalOpen(false)}
          onToggleProductSelection={handleToggleProductSelection}
          onToggleOrderSelection={handleToggleOrderSelection}
        />
      )}

      {inventoryModalOpen && !isCompleted && (
        <InventoryModal
          groupedInventory={groupedInventory}
          selectedInputs={selectedInputs}
          invTab={invTab}
          setInvTab={setInvTab}
          invSearch={invSearch}
          setInvSearch={setInvSearch}
          onClose={() => setInventoryModalOpen(false)}
          onToggleInputSelection={handleToggleInputSelection}
          onToggleModalBatchSelection={handleToggleModalBatchSelection}
        />
      )}
    </div>
  );
}

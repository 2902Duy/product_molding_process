import React, { useEffect, useState } from 'react';
import { ArrowLeft, Save, Check, Plus, Trash2, X, Package, Send, AlertCircle } from 'lucide-react';
import { db } from '../services/db';

import InputTable from '../components/ProductionLot/InputTable';
import TargetProductTable from '../components/ProductionLot/TargetProductTable';
import OutputTable from '../components/ProductionLot/OutputTable';
import MoldingDetailTable from '../components/Molding/MoldingDetailTable';
import CustomRequestTable from '../components/Molding/CustomRequestTable';
import OrderSelectionModal from '../components/ProductionLot/OrderSelectionModal';
import MoldingInventoryModal from '../components/Molding/MoldingInventoryModal';

const createOutputRow = () => ({
  id: `OUT-DH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  name: '',
  thickness: '',
  width: '',
  length: '',
  quantity: '',
  volume: '',
  status: 'Thành phẩm'
});

const createDetailRow = () => ({
  id: `DETAIL-DH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  productId: '',
  productName: '',
  semiFinishedId: '',
  semiFinishedName: '',
  thickness: '',
  width: '',
  length: '',
  base_quantity: 1,
  quantity: '',
  quantity_completed: 0,
  completedRecords: [],
  stage: 'vao-dinh-hinh'
});

const createCustomRequestRow = () => ({
  id: `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  woodType: '',
  thickness: '',
  width: '',
  length: '',
  quantity: '',
  note: ''
});

const createLotId = () => `DH-${Date.now().toString().slice(-6)}`;

export default function MoldingProductionSlip({ onNavigate, lotId }) {
  const [lotName, setLotName] = useState('');
  const [slipDate, setSlipDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('Đang sản xuất');
  const [description, setDescription] = useState('');

  // Target products from orders
  const [orders, setOrders] = useState([]);
  const [selectedTargetProducts, setSelectedTargetProducts] = useState([]);
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  // Inventory for molding - only SEMIFINISHED and SURPLUS (no RAW, no WASTE)
  const [availableInventory, setAvailableInventory] = useState([]);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [selectedInputs, setSelectedInputs] = useState([]);
  const [invSearch, setInvSearch] = useState('');

  // Custom size request
  const [customRequests, setCustomRequests] = useState([]);

  // Outputs
  const [outputs, setOutputs] = useState([createOutputRow()]);
  const [showOutputValidation, setShowOutputValidation] = useState(false);

  // Detail rows for stages
  const [detailRows, setDetailRows] = useState([createDetailRow()]);

  const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
  const closeModal = () => setModal((prev) => ({ ...prev, isOpen: false }));
  const isCompleted = status === 'Hoàn thành';

  useEffect(() => {
    setAvailableInventory(db.getInventory());
    setOrders(db.getOrders() || []);

    if (!lotId || lotId === 'new') {
      setLotName(`Phiếu SX Định hình - ${createLotId()}`);
      return;
    }

    const lot = db.getLot(lotId);
    if (!lot) return;

    setLotName(lot.name || '');
    setStatus(lot.status || 'Đang sản xuất');
    setDescription(lot.description || '');
    setSlipDate(lot.date || new Date().toISOString().split('T')[0]);
    setSelectedTargetProducts(lot.targetProducts || []);
    setSelectedInputs((lot.inputs || []).map((item) => ({
      ...item,
      quantity_used: item.quantity_used ?? item.quantity,
      volume_used: item.volume_used ?? item.volume
    })));
    setOutputs(lot.outputs && lot.outputs.length > 0 ? lot.outputs : [createOutputRow()]);
    setCustomRequests(lot.customRequests || []);
    setDetailRows(lot.details && lot.details.length > 0 ? lot.details : [createDetailRow()]);
  }, [lotId]);

  // Filter inventory for molding - only SEMIFINISHED and SURPLUS
  const moldingInventory = availableInventory.filter(item =>
    item.type === 'SEMIFINISHED' || item.type === 'SURPLUS'
  );

  const filteredInventory = moldingInventory.filter((item) => {
    const term = (invSearch || '').toLowerCase();
    const matchesSearch =
      (item.name || '').toLowerCase().includes(term) ||
      (item.batchId || item.id || '').toLowerCase().includes(term);
    return matchesSearch;
  });

  const groupedInventory = Object.values(filteredInventory.reduce((acc, item) => {
    const batchId = item.batchId || item.id;
    if (!acc[batchId]) {
      acc[batchId] = { batchId, type: item.type, items: [] };
    }
    acc[batchId].items.push(item);
    return acc;
  }, {}));

  // Handlers for target products
  const handleToggleProductSelection = (product, order) => {
    const exists = selectedTargetProducts.find(item => item.id === product.id);
    if (exists) {
      setSelectedTargetProducts(selectedTargetProducts.filter(item => item.id !== product.id));
      // Also remove all detail rows for this product
      setDetailRows(detailRows.filter(row => row.productId !== product.id));
      return;
    }
    const newProduct = { ...product, orderId: order.id, orderName: order.name, quantity_produce: product.quantity };
    setSelectedTargetProducts([...selectedTargetProducts, newProduct]);

    // Auto-add all items (parts) of this product to detail rows
    const productQty = product.quantity_produce || product.quantity || 0;
    const items = product.items || [];

    if (items.length > 0) {
      // Add each item/part as a detail row
      const newDetailRows = items.map(item => ({
        ...createDetailRow(),
        productId: product.id,
        productName: product.name,
        semiFinishedId: item.id || '',
        semiFinishedName: item.name || item.partName || 'Chi tiết',
        thickness: item.thickness || '',
        width: item.width || '',
        length: item.length || '',
        base_quantity: item.base_quantity || 1,
        quantity: Math.round((item.base_quantity || 1) * productQty),
        quantity_completed: 0
      }));
      setDetailRows([...detailRows, ...newDetailRows]);
    } else {
      // Fallback: add product as single detail row using product name as semiFinishedName
      const newDetailRow = {
        ...createDetailRow(),
        productId: product.id,
        productName: product.name,
        semiFinishedId: product.id,
        semiFinishedName: product.name, // Use product name as detail name
        thickness: product.thickness || '',
        width: product.width || '',
        length: product.length || '',
        base_quantity: 1,
        quantity: productQty,
        quantity_completed: 0
      };
      setDetailRows([...detailRows, newDetailRow]);
    }
  };

  const handleToggleOrderSelection = (order) => {
    // Toggle all products in this order
    const orderProducts = order.products || [];
    const allSelected = orderProducts.every(p => selectedTargetProducts.find(sp => sp.id === p.id));

    if (allSelected) {
      // Remove all products from this order
      const orderProductIds = orderProducts.map(p => p.id);
      setSelectedTargetProducts(selectedTargetProducts.filter(sp => !orderProductIds.includes(sp.id)));
      setDetailRows(detailRows.filter(row => !orderProductIds.includes(row.productId)));
    } else {
      // Add all products from this order
      const newProducts = orderProducts
        .filter(p => !selectedTargetProducts.find(sp => sp.id === p.id))
        .map(p => ({ ...p, orderId: order.id, orderName: order.name, quantity_produce: p.quantity }));

      const newDetailRows = orderProducts
        .filter(p => !selectedTargetProducts.find(sp => sp.id === p.id))
        .flatMap(p => {
          const productQty = p.quantity || 0;
          const items = p.items || [];

          if (items.length > 0) {
            return items.map(item => ({
              ...createDetailRow(),
              productId: p.id,
              productName: p.name,
              semiFinishedId: item.id || '',
              semiFinishedName: item.name || item.partName || 'Chi tiết',
              thickness: item.thickness || '',
              width: item.width || '',
              length: item.length || '',
              base_quantity: item.base_quantity || 1,
              quantity: Math.round((item.base_quantity || 1) * productQty),
              quantity_completed: 0
            }));
          } else {
            return [{
              ...createDetailRow(),
              productId: p.id,
              productName: p.name,
              semiFinishedId: p.id,
              semiFinishedName: p.name, // Use product name as detail name
              thickness: p.thickness || '',
              width: p.width || '',
              length: p.length || '',
              base_quantity: 1,
              quantity: productQty,
              quantity_completed: 0
            }];
          }
        });

      setSelectedTargetProducts([...selectedTargetProducts, ...newProducts]);
      setDetailRows([...detailRows, ...newDetailRows]);
    }
  };

  const handleChangeProductQuantity = (id, qty) => {
    setSelectedTargetProducts(selectedTargetProducts.map(product => (
      product.id === id ? { ...product, quantity_produce: qty } : product
    )));
    // Also update in detail rows
    setDetailRows(detailRows.map(row =>
      row.productId === id ? { ...row, quantity: qty } : row
    ));
  };

  const handleRemoveProduct = (id) => {
    setSelectedTargetProducts(selectedTargetProducts.filter(product => product.id !== id));
    setDetailRows(detailRows.filter(row => row.productId !== id));
  };

  // Handlers for inventory inputs
  const handleToggleInputSelection = (item) => {
    const exists = selectedInputs.find(input => input.id === item.id);
    if (exists) {
      setSelectedInputs(selectedInputs.filter(input => input.id !== item.id));
      return;
    }
    setSelectedInputs([...selectedInputs, { ...item, quantity_used: item.quantity, volume_used: item.volume }]);
  };

  const handleToggleModalBatchSelection = (batchItems) => {
    const allSelected = batchItems.every(item => selectedInputs.find(input => input.id === item.id));
    if (allSelected) {
      const batchIds = batchItems.map(item => item.id);
      setSelectedInputs(selectedInputs.filter(input => !batchIds.includes(input.id)));
      return;
    }
    const newItems = batchItems
      .filter(item => !selectedInputs.find(input => input.id === item.id))
      .map(item => ({ ...item, quantity_used: item.quantity, volume_used: item.volume }));
    setSelectedInputs([...selectedInputs, ...newItems]);
  };

  const handleRemoveInputItem = (id) => {
    setSelectedInputs(selectedInputs.filter(item => item.id !== id));
  };

  const handleChangeInputQuantity = (id, newQty) => {
    setSelectedInputs(selectedInputs.map(item => {
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
    setSelectedInputs(selectedInputs.map(item => (
      item.id === id ? { ...item, volume_used: newVol } : item
    )));
  };

  const handleRemoveInputBatch = (batchId) => {
    setSelectedInputs(selectedInputs.filter(item => (item.batchId || item.id) !== batchId));
  };

  // Custom request handlers
  const handleAddCustomRequest = () => {
    setCustomRequests([...customRequests, createCustomRequestRow()]);
  };

  const handleRemoveCustomRequest = (id) => {
    setCustomRequests(customRequests.filter(req => req.id !== id));
  };

  const handleChangeCustomRequest = (id, field, value) => {
    setCustomRequests(customRequests.map(req => req.id === id ? { ...req, [field]: value } : req));
  };

  const handleSendCustomRequests = () => {
    const validRequests = customRequests.filter(req =>
      req.woodType && req.thickness && req.width && req.length && req.quantity
    );

    if (validRequests.length === 0) {
      setModal({
        isOpen: true,
        type: 'alert',
        title: 'Lỗi',
        message: 'Cần nhập đầy đủ thông tin (loại gỗ, dày, rộng, dài, số lượng) để gửi yêu cầu.'
      });
      return;
    }

    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Gửi yêu cầu',
      message: `Gửi yêu cầu sản xuất ${validRequests.length} quy cách phôi đến bộ phận sản xuất phôi?`,
      onConfirm: () => {
        db.saveCustomRequests(validRequests);
        closeModal();
        setModal({
          isOpen: true,
          type: 'alert',
          title: 'Thành công',
          message: 'Đã gửi yêu cầu sản xuất phôi đến bộ phận phụ trách.'
        });
      }
    });
  };

  // Output handlers
  const handleAddOutput = () => {
    setOutputs([...outputs, createOutputRow()]);
  };

  const handleRemoveOutput = (id) => {
    if (outputs.length <= 1) return;
    setOutputs(outputs.filter(item => item.id !== id));
  };

  const handleChangeOutput = (id, field, value) => {
    setOutputs(outputs.map(entry => {
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

  // Detail row handlers
  const handleAddDetailRow = () => {
    setDetailRows([...detailRows, createDetailRow()]);
  };

  const handleRemoveDetailRow = (id) => {
    if (detailRows.length <= 1) return;
    setDetailRows(detailRows.filter(row => row.id !== id));
  };

  const handleRowChange = (id, field, value) => {
    setDetailRows(detailRows.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const handleCompletePartial = (id, qty) => {
    setDetailRows(detailRows.map(row => {
      if (row.id !== id) return row;

      const currentCompleted = Number(row.quantity_completed) || 0;
      const newCompleted = currentCompleted + qty;
      const neededQty = Number(row.quantity) || 0;
      const finalCompleted = Math.min(newCompleted, neededQty);

      const newRecord = {
        id: `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        quantity: qty,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('vi-VN')
      };

      return {
        ...row,
        quantity_completed: finalCompleted,
        completedRecords: [...(row.completedRecords || []), newRecord]
      };
    }));
  };

  // Save handlers
  const saveLotToDb = (newStatus) => {
    const finalLotId = lotId && lotId !== 'new' ? lotId : `DH-${Date.now().toString().slice(-6)}`;
    const lot = {
      id: finalLotId,
      name: lotName || 'Phiếu SX Định hình',
      date: slipDate,
      status: newStatus,
      description,
      slip_type: 'DINH_HINH',
      targetProducts: selectedTargetProducts,
      inputs: selectedInputs,
      outputs,
      customRequests,
      details: detailRows
    };
    db.saveLot(lot);
    setStatus(newStatus);
    return finalLotId;
  };

  const handleSaveDraft = () => {
    if (isCompleted) return;
    saveLotToDb('Đang sản xuất');
    setModal({
      isOpen: true,
      type: 'alert',
      title: 'Thành công',
      message: 'Đã lưu nháp phiếu sản xuất định hình.'
    });
  };

  const handlePartialComplete = () => {
    // Just save draft - partial completion is now done inline in the table
    saveLotToDb('Đang sản xuất');
    setModal({
      isOpen: true,
      type: 'alert',
      title: 'Đã lưu',
      message: 'Đã lưu tiến độ hoàn thành.'
    });
  };

  const handleConfirmProduction = () => {
    if (isCompleted) return;

    // Calculate total completed vs needed
    const totalNeeded = detailRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    const totalCompleted = detailRows.reduce((sum, r) => sum + (Number(r.quantity_completed) || 0), 0);
    const remaining = totalNeeded - totalCompleted;

    if (remaining > 0) {
      setModal({
        isOpen: true,
        type: 'confirm',
        title: 'Cảnh báo',
        message: `Còn ${remaining} cái chưa hoàn thành. Bạn có muốn hoàn tất phiếu không?`,
        onConfirm: () => finalizeProduction()
      });
      return;
    }

    finalizeProduction();
  };

  const finalizeProduction = () => {
    // Validate that detail rows have at least some data
    const validDetailRows = detailRows.filter(row => {
      const qty = Number(row.quantity) || 0;
      return qty > 0;
    });

    if (validDetailRows.length === 0) {
      setModal({
        isOpen: true,
        type: 'alert',
        title: 'Lỗi',
        message: 'Cần có ít nhất một dòng chi tiết với số lượng lớn hơn 0.'
      });
      return;
    }

    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Xác nhận hoàn tất',
      message: 'Xác nhận hoàn thành phiếu định hình? Thành phẩm sẽ được nhập kho.',
      onConfirm: () => {
        const finalLotId = saveLotToDb('Hoàn thành');
        const newInventoryItems = [];

        // Tạo inventory từ detailRows thay vì outputs
        detailRows.forEach(row => {
          const qty = Number(row.quantity) || 0;
          if (qty <= 0) return;

          const t = Number(row.thickness) || 0;
          const w = Number(row.width) || 0;
          const l = Number(row.length) || 0;
          const vol = (t > 0 && w > 0 && l > 0) ? ((t * w * l * qty) / 1000000000).toFixed(4) : 0;

          newInventoryItems.push({
            name: row.semiFinishedName || row.productName || 'Phôi định hình',
            thickness: t,
            width: w,
            length: l,
            quantity: qty,
            volume: vol,
            type: 'SEMIFINISHED',
            status: 'Sẵn sàng',
            source_lot_id: finalLotId
          });
        });

        // Update input inventory
        if (selectedInputs.length > 0) {
          const idsToRemove = selectedInputs.map(item => item.id);
          db.removeInventory(idsToRemove);

          const partials = selectedInputs.filter(item => {
            const originalQty = Number(item.quantity) || 0;
            const usedQty = Number(item.quantity_used) || 0;
            const originalVol = Number(item.volume) || 0;
            const usedVol = Number(item.volume_used) || 0;
            if (originalQty > 0) return originalQty > usedQty;
            return originalVol > usedVol;
          }).map(item => {
            const originalQty = Number(item.quantity) || 0;
            const usedQty = Number(item.quantity_used) || 0;
            const originalVol = Number(item.volume) || 0;
            const usedVol = Number(item.volume_used) || 0;
            let remainingQty = 0;
            let remainingVol = 0;
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
          if (partials.length > 0) newInventoryItems.push(...partials);
        }

        if (newInventoryItems.length > 0) {
          db.addInventory(newInventoryItems);
        }

        setModal({
          isOpen: true,
          type: 'alert',
          title: 'Thành công',
          message: 'Đã xác nhận hoàn thành và nhập kho.',
          onConfirm: () => onNavigate('lot-list')
        });
      }
    });
  };

  return (
    <div className="w-full min-h-screen bg-warm-white text-notion-black font-sans pb-24">
      {/* Header */}
      <nav className="flex justify-between items-center h-[48px] px-3 md:px-5 border-b border-whisper bg-notion-white sticky top-0 z-40">
        <button
          onClick={() => onNavigate('lot-list')}
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
              <input
                type="text"
                value={description}
                disabled={isCompleted}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ghi chú..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 disabled:bg-gray-50"
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
          onAddRow={handleAddDetailRow}
          onRemoveRow={handleRemoveDetailRow}
          onRowChange={handleRowChange}
          onCompletePartial={handleCompletePartial}
        />
      </div>

      {/* Bottom action bar */}
      {!isCompleted && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 md:p-4 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <div className="max-w-[600px] mx-auto">
            {/* Progress indicator - show quantity progress */}
            {detailRows.length > 0 && (
              <div className="mb-2 text-center text-xs text-gray-500">
                <span className="font-medium text-green-600">
                  {detailRows.reduce((sum, r) => sum + (Number(r.quantity_completed) || 0), 0)}
                </span>
                /{detailRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0)} cái hoàn thành
              </div>
            )}
            <div className="flex gap-2 md:gap-3">
              <button
                onClick={() => onNavigate('lot-list')}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
              >
                Huỷ
              </button>
              <button
                onClick={handleSaveDraft}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
              >
                <Save className="w-4 h-4" /> Lưu nháp
              </button>
              <button
                onClick={handleConfirmProduction}
                className="flex-[2] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition"
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

      {/* Alert/Confirm Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[400px] overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-800">{modal.title}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="px-5 py-6 text-gray-600 text-sm leading-relaxed">{modal.message}</div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
              {modal.cancelText && (
                <button onClick={() => { if (modal.onCancel) modal.onCancel(); else closeModal(); }} className="px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100">{modal.cancelText}</button>
              )}
              {modal.type === 'confirm' && (
                <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Huỷ</button>
              )}
              <button
                onClick={() => { if (modal.onConfirm) modal.onConfirm(); else closeModal(); }}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700"
              >
                {modal.confirmText || 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { db } from '../../../services/db';
import { MOLDING_STAGES } from '../constants/moldingStages';
import { FINISHING_SLIP_CONFIGS } from '../../finishing/constants/finishingStages';
import {
  createStageProgress as utilsCreateStageProgress,
  getFinalCompleted as utilsGetFinalCompleted,
  normalizeDetailRow as utilsNormalizeDetailRow,
  createDetailRow as utilsCreateDetailRow,
  createCustomRequestRow,
  shouldUseAutoLotName as utilsShouldUseAutoLotName,
  buildAutoLotName as utilsBuildAutoLotName,
  calculateRequestVolume,
  mergeTargetProducts
} from '../../shared/utils/productionUtils';

const ACTIVE_STATUS = 'Đang sản xuất';
const COMPLETED_STATUS = 'Hoàn thành';
const DEFAULT_LOT_NAME = 'Phiếu định hình đơn hàng mới';
const LEGACY_DEFAULT_LOT_NAMES = ['Phiếu SX Định hình', 'Phiếu SX Định hình -'];

const createStageProgress = (quantity = '', existingStages = [], legacyStageId = null, legacyCompleted = 0) =>
  utilsCreateStageProgress(quantity, existingStages, legacyStageId, legacyCompleted, MOLDING_STAGES);

const getFinalCompleted = utilsGetFinalCompleted;

const normalizeDetailRow = (row) =>
  utilsNormalizeDetailRow(row, MOLDING_STAGES);

const createDetailRow = (overrides = {}) =>
  utilsCreateDetailRow(overrides, MOLDING_STAGES, 'DETAIL-DH');

const createLotId = () => db.createLotId('DINH_HINH');

const shouldUseAutoLotName = (name) =>
  utilsShouldUseAutoLotName(name, {
    defaultName: DEFAULT_LOT_NAME,
    autoNamePrefix: 'Phiếu định hình',
    legacyDefaultNames: LEGACY_DEFAULT_LOT_NAMES
  });

const buildAutoLotName = (products = []) =>
  utilsBuildAutoLotName(products, {
    defaultName: DEFAULT_LOT_NAME,
    autoNamePrefix: 'Phiếu định hình'
  });

const getHandoffCreatedQty = (row, toSlipType = 'ASSEMBLY') =>
  (row.handoffRecords || [])
    .filter((record) => !toSlipType || record.toSlipType === toSlipType)
    .reduce((sum, record) => sum + (Number(record.quantity) || 0), 0);

const hasHandoffRecords = (row) =>
  (row.handoffRecords || []).some((record) => (Number(record.quantity) || 0) > 0);

const DEFAULT_HANDOFF_TARGET = 'ASSEMBLY';
const HANDOFF_TARGET_OPTIONS = ['ASSEMBLY', 'PAINTING', 'PACKING'];

export default function useMoldingSlip({ lotId, onNavigate }) {
  const [newLotId] = useState(createLotId);
  const [lotName, setLotName] = useState('');
  const [slipDate, setSlipDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState(ACTIVE_STATUS);
  const [description, setDescription] = useState('');

  // Target products from orders
  const [orders, setOrders] = useState([]);
  const [selectedTargetProducts, setSelectedTargetProducts] = useState([]);
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  // Inventory for molding
  const [availableInventory, setAvailableInventory] = useState([]);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [selectedInputs, setSelectedInputs] = useState([]);
  const [invSearch, setInvSearch] = useState('');

  // Custom size request
  const [customRequests, setCustomRequests] = useState([]);

  // Detail rows for stages
  const [detailRows, setDetailRows] = useState([]);
  const [selectedStageId, setSelectedStageId] = useState(MOLDING_STAGES[0].id);
  const [stageTickets, setStageTickets] = useState([]);
  const [lastStageSave, setLastStageSave] = useState(null);
  const [selectedHandoffRowIds, setSelectedHandoffRowIds] = useState([]);
  const [handoffTargetSlipType, setHandoffTargetSlipType] = useState(DEFAULT_HANDOFF_TARGET);
  const [handoffConfirm, setHandoffConfirm] = useState({ isOpen: false, mode: 'handoff', rowIds: [] });

  const [modal, setModal] = useState({ isOpen: false, type: 'alert', title: '', message: '' });
  const [isConfirmingProduction, setIsConfirmingProduction] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 1500);
  };

  const isCompleted = status === COMPLETED_STATUS;

  const closeModal = () => setModal({ isOpen: false, type: 'alert', title: '', message: '' });

  // Load orders & inventory
  useEffect(() => {
    setOrders(db.getOrders());
    setAvailableInventory(db.getInventory());
  }, []);

  // Load slip if editing
  useEffect(() => {
    if (!lotId || lotId === 'new') return;

    const loadData = async () => {
      const lotData = await db.getLotAsync(lotId);
      if (!lotData) {
        onNavigate('lot-list');
        return;
      }
      setLotName(lotData.name || '');
      setStatus(lotData.status || ACTIVE_STATUS);
      setDescription(lotData.description || '');
      setSlipDate(lotData.date || new Date().toISOString().split('T')[0]);
      setSelectedTargetProducts(lotData.targetProducts || []);
      setSelectedInputs((lotData.inputs || []).map((item) => ({
        ...item,
        quantity_used: item.quantity_used ?? item.quantity,
        volume_used: item.volume_used ?? item.volume
      })));
      setCustomRequests(lotData.customRequests || []);
      setStageTickets(lotData.stageTickets || []);
      setDetailRows(lotData.details && lotData.details.length > 0 ? lotData.details.map(normalizeDetailRow) : []);
      setLastStageSave(null);
      setSelectedHandoffRowIds([]);
    };
    loadData();
  }, [lotId, newLotId]);

  const hasValidDimensions = (item) =>
    Number(item.thickness) > 0 && Number(item.width) > 0 && Number(item.length) > 0;

  const isMoldingInput = (item) => {
    const statusVal = String(item.status || '').trim().toUpperCase();
    if (statusVal === 'USED' || statusVal === 'CONSUMED' || statusVal === 'ĐANG DÙNG TRONG SẢN XUẤT' || statusVal === 'LOẠI BỎ' || (item.quantity !== undefined && Number(item.quantity) <= 0)) {
      return false;
    }
    const sourceLotId = String(item.source_lot_id || '');
    const isMoldingOutput = sourceLotId.startsWith('DH-') || sourceLotId.startsWith('DDH-');
    return (
      (item.type === 'SEMIFINISHED' || item.type === 'SURPLUS') &&
      hasValidDimensions(item) &&
      !isMoldingOutput
    );
  };

  const moldingInventory = availableInventory.filter(isMoldingInput);

  const filteredInventory = moldingInventory.filter((item) => {
    const term = (invSearch || '').toLowerCase();
    return (
      (item.name || '').toLowerCase().includes(term) ||
      (item.batchId || item.id || '').toLowerCase().includes(term)
    );
  });

  const groupedInventory = Object.values(filteredInventory.reduce((acc, item) => {
    const batchId = item.batchId || item.id;
    if (!acc[batchId]) {
      acc[batchId] = { batchId, type: item.type, items: [] };
    }
    acc[batchId].items.push(item);
    return acc;
  }, {}));

  const completedMoldingProductIds = new Set(
    db.getLots()
      .filter((lot) => {
        const sameLot = lot.id === lotId || lot.id === newLotId;
        const completedStatus = lot.status === COMPLETED_STATUS || lot.status === 'Ho\u00c3\u00a0n th\u00c3\u00a0nh';
        return !sameLot && lot.slip_type === 'DINH_HINH' && completedStatus;
      })
      .flatMap((lot) => lot.targetProducts || [])
      .map((product) => product.id)
      .filter(Boolean)
  );

  const handleToggleProductSelection = (product, order) => {
    if (completedMoldingProductIds.has(product.id)) return;

    const exists = selectedTargetProducts.find(item => item.id === product.id);
    if (exists) {
      setSelectedTargetProducts(selectedTargetProducts.filter(item => item.id !== product.id));
      setDetailRows(detailRows.filter(row => row.productId !== product.id));
      return;
    }
    const newProduct = { ...product, orderId: order.id, orderName: order.name, quantity_produce: product.quantity };
    setSelectedTargetProducts([...selectedTargetProducts, newProduct]);

    const productQty = product.quantity_produce || product.quantity || 0;
    const items = product.items || [];

    if (items.length > 0) {
      const newDetailRows = items.map(item => createDetailRow({
        productId: product.id,
        productCode: product.code || product.productCode || product.id,
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
      const newDetailRow = createDetailRow({
        productId: product.id,
        productCode: product.code || product.productCode || product.id,
        productName: product.name,
        semiFinishedId: product.id,
        semiFinishedName: product.name,
        thickness: product.thickness || '',
        width: product.width || '',
        length: product.length || '',
        base_quantity: 1,
        quantity: productQty,
        quantity_completed: 0
      });
      setDetailRows([...detailRows, newDetailRow]);
    }
  };

  const handleToggleOrderSelection = (order) => {
    const orderProducts = (order.products || []).filter(product => !completedMoldingProductIds.has(product.id));
    if (orderProducts.length === 0) return;
    const allSelected = orderProducts.every(p => selectedTargetProducts.find(sp => sp.id === p.id));

    if (allSelected) {
      const orderProductIds = orderProducts.map(p => p.id);
      setSelectedTargetProducts(selectedTargetProducts.filter(sp => !orderProductIds.includes(sp.id)));
      setDetailRows(detailRows.filter(row => !orderProductIds.includes(row.productId)));
    } else {
      const newProducts = orderProducts
        .filter(p => !selectedTargetProducts.find(sp => sp.id === p.id))
        .map(p => ({ ...p, orderId: order.id, orderName: order.name, quantity_produce: p.quantity }));

      const newDetailRows = orderProducts
        .filter(p => !selectedTargetProducts.find(sp => sp.id === p.id))
        .flatMap(p => {
          const productQty = p.quantity || 0;
          const items = p.items || [];

          if (items.length > 0) {
            return items.map(item => createDetailRow({
              productId: p.id,
              productCode: p.code || p.productCode || p.id,
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
            return [createDetailRow({
              productId: p.id,
              productCode: p.code || p.productCode || p.id,
              productName: p.name,
              semiFinishedId: p.id,
              semiFinishedName: p.name,
              thickness: p.thickness || '',
              width: p.width || '',
              length: p.length || '',
              base_quantity: 1,
              quantity: productQty,
              quantity_completed: 0
            })];
          }
        });

      setSelectedTargetProducts([...selectedTargetProducts, ...newProducts]);
      setDetailRows([...detailRows, ...newDetailRows]);
    }
  };

  const handleChangeProductQuantity = (id, qty) => {
    const productQty = qty === '' ? '' : Number(qty);
    setSelectedTargetProducts(selectedTargetProducts.map(product => (
      product.id === id ? { ...product, quantity_produce: qty } : product
    )));
    setDetailRows(detailRows.map(row =>
      row.productId === id ? normalizeDetailRow({
        ...row,
        quantity: productQty === '' ? '' : Math.round((Number(row.base_quantity) || 1) * productQty)
      }) : row
    ));
  };

  const handleRemoveProduct = (id) => {
    setSelectedTargetProducts(selectedTargetProducts.filter(product => product.id !== id));
    setDetailRows(detailRows.filter(row => row.productId !== id));
  };

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
      req.woodType && req.thickness && req.width && req.length && req.quantity && req.reason
    );

    if (validRequests.length === 0) {
      setModal({
        isOpen: true,
        type: 'alert',
        title: 'Lỗi',
        message: 'Cần nhập đầy đủ thông tin (loại gỗ, dày, rộng, dài, số lượng, lý do thiếu) để gửi yêu cầu.'
      });
      return;
    }

    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Gửi yêu cầu',
      message: `Gửi yêu cầu sản xuất ${validRequests.length} quy cách phôi đến bộ phận sản xuất phôi?`,
      onConfirm: async () => {
        const sourceLotId = lotId && lotId !== 'new' ? lotId : newLotId;
        const supplementalLotId = db.createLotId('PHOI_GO');
        const requestOutputs = validRequests.map((req) => ({
          id: `OUT-${req.id}`,
          name: req.woodType || 'Phôi bổ sung',
          thickness: req.thickness,
          width: req.width,
          length: req.length,
          quantity: req.quantity,
          volume: calculateRequestVolume(req),
          status: 'Thành phẩm',
          request_reason: req.reason || '',
          source_request_id: req.id
        }));
        const requestReasonLines = validRequests
          .map((req, index) => {
            const dimensions = `${req.thickness} x ${req.width} x ${req.length}`;
            return `${index + 1}. ${req.woodType} ${dimensions}, SL ${req.quantity}: ${req.reason}`;
          })
          .join('\n');

        await db.saveLot({
          id: supplementalLotId,
          name: `Phiếu bổ sung phôi - ${sourceLotId}`,
          date: new Date().toISOString().split('T')[0],
          status: ACTIVE_STATUS,
          description: `Bổ sung phôi cho phiếu định hình ${sourceLotId}.\n${requestReasonLines}`,
          slip_type: 'PHOI_GO',
          source_molding_lot_id: sourceLotId,
          targetProducts: selectedTargetProducts,
          inputs: [],
          outputs: requestOutputs,
          customRequests: validRequests
        });

        db.saveCustomRequests(validRequests.map((req) => ({
          ...req,
          source_molding_lot_id: sourceLotId,
          supplemental_lot_id: supplementalLotId
        })));
        closeModal();
        setModal({
          isOpen: true,
          type: 'alert',
          title: 'Thành công',
          message: `Đã tạo phiếu bổ sung phôi ${supplementalLotId} và gửi yêu cầu đến bộ phận phụ trách.`
        });
      }
    });
  };

  const handleAddDetailRow = () => {
    setDetailRows([...detailRows, createDetailRow()]);
  };

  const handleRemoveDetailRow = (id) => {
    setDetailRows(detailRows.filter(row => row.id !== id || hasHandoffRecords(row)));
  };

  const handleRowChange = (id, field, value) => {
    setDetailRows(detailRows.map(row =>
      row.id === id && !hasHandoffRecords(row) ? normalizeDetailRow({ ...row, [field]: value }) : row
    ));
  };

  const handleStageCompletedChange = (rowId, stageId, value) => {
    setDetailRows(detailRows.map((row) => {
      if (row.id !== rowId) return row;
      if (hasHandoffRecords(row)) return row;

      const updated = {
        ...row,
        stages: createStageProgress(row.quantity, row.stages).map((stage) => {
          if (stage.id !== stageId) return stage;

          const required = Number(stage.required) || Number(row.quantity) || 0;
          const completed = value === ''
            ? 0
            : Math.max(0, Math.min(Number(value) || 0, required));

          return {
            ...stage,
            completed
          };
        })
      };

      return {
        ...updated,
        quantity_completed: getFinalCompleted(updated)
      };
    }));
    setLastStageSave(null);
    setStatus(ACTIVE_STATUS);
  };

  const applyStageProgress = (rows, stageId, entries, ticketId) => {
    return rows.map((row) => {
      if (hasHandoffRecords(row)) return row;
      const entry = entries.find((item) => item.rowId === row.id);
      if (!entry) return row;

      const qty = Number(entry.quantity) || 0;
      if (qty <= 0) return row;

      const newRecord = {
        id: `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        ticketId,
        stageId,
        quantity: qty,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('vi-VN')
      };

      const updated = {
        ...row,
        stages: createStageProgress(row.quantity, row.stages).map((stage) => {
          if (stage.id !== stageId) return stage;

          const required = Number(stage.required) || 0;
          const completed = Math.min(required, (Number(stage.completed) || 0) + qty);
          return {
            ...stage,
            completed,
            records: [...(stage.records || []), newRecord]
          };
        }),
        completedRecords: [...(row.completedRecords || []), newRecord]
      };

      return {
        ...updated,
        quantity_completed: getFinalCompleted(updated)
      };
    });
  };

  const handleSaveStageProgress = (stageId, entries) => {
    if (!entries || entries.length === 0) return;

    const previousRows = detailRows;
    const previousTickets = stageTickets;
    const ticketId = `TICKET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const ticket = {
      id: ticketId,
      stageId,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('vi-VN'),
      items: entries.map((entry) => ({ ...entry }))
    };

    const updatedRows = applyStageProgress(detailRows, stageId, entries, ticketId);
    const updatedTickets = [...stageTickets, ticket];
    setDetailRows(updatedRows);
    setStageTickets(updatedTickets);
    setLastStageSave({ detailRows: previousRows, stageTickets: previousTickets });
    setStatus(ACTIVE_STATUS);
  };

  const handleUndoStageProgress = () => {
    if (!lastStageSave) return;

    setDetailRows(lastStageSave.detailRows);
    setStageTickets(lastStageSave.stageTickets);
    setLastStageSave(null);
    setStatus(ACTIVE_STATUS);
  };

  const handleCompleteRowsStages = (targetRowIds, emptyMessage) => {
    const targetIds = new Set(targetRowIds || []);
    if (targetIds.size === 0) return;

    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString('vi-VN');
    const batchId = Date.now();
    const ticketItemsByStage = {};

    const updatedRows = detailRows.map((row) => {
      if (!targetIds.has(row.id) || hasHandoffRecords(row)) return row;

      const rowRecords = [];
      const updatedStages = createStageProgress(row.quantity, row.stages).map((stage) => {
        const required = Number(stage.required) || Number(row.quantity) || 0;
        const completed = Number(stage.completed) || 0;
        const remaining = Math.max(0, required - completed);
        if (remaining <= 0) return stage;

        const ticketId = `TICKET-${batchId}-${stage.id}`;
        const newRecord = {
          id: `REC-${batchId}-${row.id}-${stage.id}`,
          ticketId,
          stageId: stage.id,
          quantity: remaining,
          date,
          time
        };

        ticketItemsByStage[stage.id] = [
          ...(ticketItemsByStage[stage.id] || []),
          { rowId: row.id, quantity: remaining }
        ];
        rowRecords.push(newRecord);

        return {
          ...stage,
          required,
          completed: required,
          records: [...(stage.records || []), newRecord]
        };
      });

      const updated = {
        ...row,
        stages: updatedStages,
        completedRecords: [...(row.completedRecords || []), ...rowRecords]
      };

      return {
        ...updated,
        quantity_completed: getFinalCompleted(updated)
      };
    });

    const quickTickets = MOLDING_STAGES
      .filter((stage) => ticketItemsByStage[stage.id]?.length > 0)
      .map((stage) => ({
        id: `TICKET-${batchId}-${stage.id}`,
        stageId: stage.id,
        date,
        time,
        items: ticketItemsByStage[stage.id]
      }));

    if (quickTickets.length === 0) {
      setModal({
        isOpen: true,
        type: 'alert',
        title: 'Đã hoàn thành',
        message: emptyMessage || 'Tất cả công đoạn đã được hoàn thành trước đó.'
      });
      return;
    }

    const updatedTickets = [...stageTickets, ...quickTickets];
    setDetailRows(updatedRows);
    setStageTickets(updatedTickets);
    setStatus(ACTIVE_STATUS);
  };

  const handleCompleteProductStages = (productId) => {
    const targetProductId = productId || 'no-product';
    const productRows = detailRows.filter((row) => (row.productId || 'no-product') === targetProductId);
    handleCompleteRowsStages(productRows.map((row) => row.id));
  };

  const handleCompleteDetailStages = (rowId) => {
    handleCompleteRowsStages([rowId]);
  };

  const getHandoffRemaining = (row, toSlipType = handoffTargetSlipType) => {
    const requiredQty = Number(row.quantity) || 0;
    return Math.max(0, requiredQty - getHandoffCreatedQty(row, toSlipType));
  };

  const handleToggleHandoffRow = (rowId) => {
    const row = detailRows.find((item) => item.id === rowId);
    if (!row || getHandoffRemaining(row) <= 0) return;

    setSelectedHandoffRowIds((prev) => (
      prev.includes(rowId)
        ? prev.filter((id) => id !== rowId)
        : [...prev, rowId]
    ));
  };

  const getRowsToHandoff = (rowIds, toSlipType = handoffTargetSlipType) => {
    const selectedIds = new Set(rowIds || []);
    return detailRows
      .filter((row) => selectedIds.has(row.id))
      .map((row) => ({ row, quantity: getHandoffRemaining(row, toSlipType) }))
      .filter((item) => item.quantity > 0);
  };

  const groupRowsForHandoff = (rowsToHandoff) => rowsToHandoff.reduce((acc, { row, quantity }) => {
    const key = row.productId || 'no-product';
    if (!acc[key]) {
      acc[key] = {
        productCode: row.productCode || row.productId || '',
        productName: row.productName || 'Sản phẩm tự do',
        items: []
      };
    }
    acc[key].items.push({ ...row, handoffQuantity: quantity });
    return acc;
  }, {});

  const createHandoffSlip = async (rowIds, sourceLotId, toSlipType = handoffTargetSlipType, { silent = false } = {}) => {
    const targetConfig = FINISHING_SLIP_CONFIGS[toSlipType] || FINISHING_SLIP_CONFIGS.ASSEMBLY;
    if (!rowIds || rowIds.length === 0) return null;

    const rowsToHandoff = getRowsToHandoff(rowIds, toSlipType);

    if (rowsToHandoff.length === 0) {
      if (!silent) {
        setModal({
          isOpen: true,
          type: 'alert',
          title: 'Không có chi tiết cần giao',
          message: 'Các chi tiết đã chọn đã được tạo phiếu giao đủ số lượng trước đó.'
        });
      }
      return null;
    }

    const allLots = await db.getLotsAsync();
    const existingProductionLot = allLots.find((lot) => (
      !lot.is_handoff &&
      lot.slip_type === toSlipType &&
      lot.source_lot_id === sourceLotId &&
      lot.source_slip_type === 'DINH_HINH'
    ));
    const productionLotId = existingProductionLot?.id || db.createLotId(toSlipType);
    const existingHandoffCount = allLots.filter((lot) => (
      (lot.is_handoff || (lot.source_lot_id && lot.handoff_lot_id === lot.id)) &&
      lot.target_lot_id === productionLotId
    )).length;
    const handoffLotId = `GIAO-${productionLotId}-${String(existingHandoffCount + 1).padStart(3, '0')}`;
    const date = new Date().toISOString().split('T')[0];
    const handoffProducts = selectedTargetProducts
      .filter((product) => rowsToHandoff.some(({ row }) => row.productId === product.id))
      .map((product) => {
        const productRows = rowsToHandoff.filter(({ row }) => row.productId === product.id);
        const productQtyCandidates = productRows
          .map(({ row, quantity }) => {
            const baseQty = Number(row.base_quantity) || 1;
            return baseQty > 0 ? Math.floor(quantity / baseQty) : quantity;
          })
          .filter((qty) => qty > 0);
        const handoffQty = productQtyCandidates.length > 0
          ? Math.min(...productQtyCandidates)
          : Number(product.quantity_produce ?? product.quantity) || 0;

        return {
          ...product,
          quantity: handoffQty,
          quantity_produce: handoffQty,
          quantity_completed: 0,
          source_lot_id: sourceLotId,
          input_handoff_lot_ids: [handoffLotId],
          handoffRecords: []
        };
      });
    const handoffDetails = rowsToHandoff.map(({ row, quantity }) => ({
      ...row,
      id: `DETAIL-LR-${Date.now()}-${Math.floor(Math.random() * 1000)}-${row.id}`,
      quantity,
      quantity_completed: 0,
      source_detail_id: row.id,
      source_lot_id: sourceLotId,
      input_handoff_lot_id: handoffLotId,
      handoffRecords: [],
      completedRecords: [],
      stages: targetConfig.stages.map((stage) => ({
        ...stage,
        required: quantity,
        completed: 0,
        records: []
      }))
    }));

    await db.saveLot({
      id: handoffLotId,
      name: `Phiếu giao - ${sourceLotId} -> ${productionLotId}`,
      date,
      status: ACTIVE_STATUS,
      description: `Phiếu giao từ phiếu định hình ${sourceLotId}.`,
      is_handoff: true,
      slip_type: toSlipType,
      source_lot_id: sourceLotId,
      source_slip_type: 'DINH_HINH',
      handoff_lot_id: handoffLotId,
      target_lot_id: productionLotId,
      input_handoff_lot_ids: [handoffLotId],
      targetProducts: handoffProducts,
      inputs: [],
      customRequests: [],
      stageTickets: [],
      details: handoffDetails
    });

    const productionProducts = handoffProducts.map((product) => ({
      ...product,
      input_handoff_lot_ids: []
    }));
    await db.saveLot({
      ...(existingProductionLot || {}),
      id: productionLotId,
      name: existingProductionLot?.name || `${targetConfig.autoNamePrefix} - ${sourceLotId}`,
      date: existingProductionLot?.date || date,
      status: ACTIVE_STATUS,
      description: existingProductionLot?.description || `${targetConfig.autoNamePrefix} tự tạo từ phiếu định hình ${sourceLotId}.`,
      is_handoff: false,
      slip_type: toSlipType,
      source_lot_id: sourceLotId,
      source_slip_type: 'DINH_HINH',
      pending_handoff_lot_ids: [
        ...new Set([...(existingProductionLot?.pending_handoff_lot_ids || []), handoffLotId])
      ],
      targetProducts: mergeTargetProducts(existingProductionLot?.targetProducts || [], productionProducts),
      inputs: existingProductionLot?.inputs || [],
      customRequests: existingProductionLot?.customRequests || [],
      stageTickets: existingProductionLot?.stageTickets || [],
      details: existingProductionLot?.details || []
    });

    const updatedRows = detailRows.map((row) => {
      const handoff = rowsToHandoff.find((item) => item.row.id === row.id);
      if (!handoff) return row;

      const completedStages = createStageProgress(row.quantity, row.stages).map((stage) => {
        const required = Number(stage.required) || Number(row.quantity) || 0;
        return {
          ...stage,
          required,
          completed: required
        };
      });
      const completedRow = {
        ...row,
        stages: completedStages
      };

      return {
        ...completedRow,
        quantity_completed: getFinalCompleted(completedRow),
        handoffRecords: [
          ...(row.handoffRecords || []),
          {
            id: `HANDOFF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            toLotId: productionLotId,
            handoffLotId,
            toSlipType,
            quantity: handoff.quantity,
            date
          }
        ]
      };
    });

    setDetailRows(updatedRows);
    setSelectedHandoffRowIds([]);

    const currentLotId = sourceLotId || (lotId && lotId !== 'new' ? lotId : newLotId);
    const currentLot = await db.getLot(currentLotId);
    if (currentLot) {
      await db.saveLot({
        ...currentLot,
        id: currentLotId,
        details: updatedRows.map(normalizeDetailRow)
      });
    }

    if (!silent) {
      setModal({
        isOpen: true,
        type: 'alert',
        title: 'Đã tạo phiếu giao',
        message: `Đã tạo ${targetConfig.autoNamePrefix.toLowerCase()} ${productionLotId} và phiếu giao ${handoffLotId}.`
      });
    }

    return productionLotId;
  };

  const handleCreateHandoffSlip = () => {
    const selectedRows = getRowsToHandoff(selectedHandoffRowIds, DEFAULT_HANDOFF_TARGET);

    if (selectedRows.length === 0) {
      setModal({
        isOpen: true,
        type: 'alert',
        title: 'Không có chi tiết cần giao',
        message: 'Chọn ít nhất một chi tiết còn số lượng chưa tạo phiếu giao.'
      });
      return;
    }

    setHandoffTargetSlipType(DEFAULT_HANDOFF_TARGET);
    setHandoffConfirm({ isOpen: true, mode: 'handoff', rowIds: selectedHandoffRowIds });
  };

  const handleToggleDetailStage = (id, stageId) => {
    setDetailRows(detailRows.map((row) => {
      if (row.id !== id) return row;

      const currentStages = createStageProgress(row.quantity, row.stages);
      const existing = currentStages.find((stage) => stage.id === stageId);

      if (existing) {
        const stageIndex = currentStages.findIndex((stage) => stage.id === stageId);
        const hasDownstreamProgress = currentStages
          .slice(Math.max(0, stageIndex))
          .some((stage) => (Number(stage.completed) || 0) > 0);

        if (currentStages.length <= 1 || hasDownstreamProgress) return row;
        return normalizeDetailRow({
          ...row,
          stages: currentStages.filter((stage) => stage.id !== stageId)
        });
      }

      const stageMeta = MOLDING_STAGES.find((stage) => stage.id === stageId);
      if (!stageMeta) return row;

      return normalizeDetailRow({
        ...row,
        stages: [
          ...currentStages,
          {
            ...stageMeta,
            required: Number(row.quantity) || 0,
            completed: 0,
            records: []
          }
        ].sort((a, b) => a.order - b.order)
      });
    }));
  };

  const handleApplyDetailStages = (stageIdsByRowId) => {
    setDetailRows(detailRows.map((row) => {
      if (!stageIdsByRowId[row.id]) return row;

      const currentStages = createStageProgress(row.quantity, row.stages);
      const selectedIds = new Set(stageIdsByRowId[row.id]);
      const lockedIds = new Set();

      currentStages.forEach((stage, index) => {
        const hasProgressAtOrAfter = currentStages
          .slice(index)
          .some((item) => (Number(item.completed) || 0) > 0);
        if (hasProgressAtOrAfter) lockedIds.add(stage.id);
      });

      const orderedStageIds = [
        ...stageIdsByRowId[row.id],
        ...[...lockedIds].filter((stageId) => !selectedIds.has(stageId))
      ];
      const nextStages = orderedStageIds
        .map((stageId) => MOLDING_STAGES.find((stage) => stage.id === stageId) || currentStages.find((stage) => stage.id === stageId))
        .filter(Boolean)
        .map((stageMeta) => {
          const existing = currentStages.find((stage) => stage.id === stageMeta.id);
          return {
            ...stageMeta,
            required: Number(row.quantity) || 0,
            completed: Math.min(Number(row.quantity) || 0, Number(existing?.completed) || 0),
            records: existing?.records || []
          };
        });

      return normalizeDetailRow({
        ...row,
        stages: nextStages
      });
    }));
  };

  const getInputUsageError = () => {
    const invalidInput = selectedInputs.find((item) => {
      const originalQty = Number(item.quantity) || 0;
      const usedQty = item.quantity_used === '' ? NaN : Number(item.quantity_used);
      const originalVol = Number(item.volume) || 0;
      const usedVol = item.volume_used === '' ? NaN : Number(item.volume_used);

      if (!Number.isFinite(usedVol) || usedVol < 0 || usedVol > originalVol) return true;
      if (originalQty > 0 && (!Number.isFinite(usedQty) || usedQty < 0 || usedQty > originalQty)) return true;
      return false;
    });

    return invalidInput
      ? 'Nguyên liệu đầu vào đang có dòng dùng vượt quá số lượng hoặc số khối tồn.'
      : null;
  };

  const saveLotToDb = async (newStatus) => {
    const finalLotId = lotId && lotId !== 'new' ? lotId : newLotId;
    const finalLotName = shouldUseAutoLotName(lotName)
      ? buildAutoLotName(selectedTargetProducts)
      : lotName;
    const lot = {
      id: finalLotId,
      name: finalLotName,
      date: slipDate,
      status: newStatus,
      description,
      slip_type: 'DINH_HINH',
      targetProducts: selectedTargetProducts,
      inputs: selectedInputs,
      customRequests,
      stageTickets,
      details: detailRows.map(normalizeDetailRow)
    };
    await db.saveLot(lot);
    setLotName(finalLotName);
    setStatus(newStatus);
    return finalLotId;
  };

  const handleSaveDraft = async () => {
    if (isCompleted) return;
    const savedId = await saveLotToDb(ACTIVE_STATUS);
    showToast('Đã lưu nháp phiếu sản xuất!');
    if (!lotId || lotId === 'new') {
      setTimeout(() => {
        onNavigate('molding-production-slip', { lotId: savedId });
      }, 500);
    }
  };

  const handleBackToList = async () => {
    if (isCompleted) {
      onNavigate('lot-list');
      return;
    }
    // Tự động lưu nháp êm ái khi thoát
    await saveLotToDb(ACTIVE_STATUS);
    onNavigate('lot-list');
  };

  const handleCancelLot = () => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Xoá phiếu nháp?',
      message: 'Bạn có chắc chắn muốn xoá hoàn toàn phiếu nháp định hình này? Hành động này sẽ xoá sạch dữ liệu phiếu khỏi hệ thống và không thể hoàn tác.',
      confirmText: 'Xoá phiếu',
      cancelText: 'Quay lại',
      onConfirm: async () => {
        const finalLotId = lotId && lotId !== 'new' ? lotId : newLotId;
        await db.deleteLot(finalLotId);
        onNavigate('lot-list');
      }
    });
  };

  const handleConfirmProduction = () => {
    if (isCompleted || isConfirmingProduction) return;

    const inputUsageError = getInputUsageError();
    if (inputUsageError) {
      setModal({
        isOpen: true,
        type: 'alert',
        title: 'Không thể hoàn tất',
        message: inputUsageError
      });
      return;
    }

    const totalNeeded = detailRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    const totalCompleted = detailRows.reduce((sum, r) => sum + getFinalCompleted(r), 0);
    const remaining = Math.max(0, totalNeeded - totalCompleted);

    if (remaining > 0) {
      setModal({
        isOpen: true,
        type: 'alert',
        title: 'Không thể hoàn tất',
        message: `Còn ${remaining} cái chưa hoàn thành đủ các công đoạn đã cấu hình. Cần hoàn thành tất cả công đoạn trước khi hoàn tất phiếu.`
      });
      return;
    }

    const rowIdsToHandoff = detailRows
      .filter((row) => getHandoffRemaining(row, DEFAULT_HANDOFF_TARGET) > 0)
      .map((row) => row.id);

    if (rowIdsToHandoff.length > 0) {
      setHandoffTargetSlipType(DEFAULT_HANDOFF_TARGET);
      setHandoffConfirm({ isOpen: true, mode: 'complete', rowIds: rowIdsToHandoff });
      return;
    }

    setIsConfirmingProduction(true);
    finalizeProduction(DEFAULT_HANDOFF_TARGET);
  };

  const finalizeProduction = (toSlipType = DEFAULT_HANDOFF_TARGET) => {
    const targetConfig = FINISHING_SLIP_CONFIGS[toSlipType] || FINISHING_SLIP_CONFIGS[DEFAULT_HANDOFF_TARGET];

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

    const incompleteRows = validDetailRows.filter(row => getFinalCompleted(row) < (Number(row.quantity) || 0));
    if (incompleteRows.length > 0) {
      setModal({
        isOpen: true,
        type: 'alert',
        title: 'Không thể hoàn tất',
        message: `Còn ${incompleteRows.length} dòng chi tiết chưa hoàn thành đủ các công đoạn.`
      });
      return;
    }

    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Xác nhận hoàn tất phiếu định hình',
      message: 'Hệ thống sẽ chuyển phiếu định hình này sang trạng thái Hoàn thành và tự động nhập các chi tiết thành phẩm vào kho. Bạn có chắc chắn muốn hoàn tất không?',
      confirmText: 'Hoàn tất & Nhập kho',
      cancelText: 'Quay lại',
      onCancel: () => setIsConfirmingProduction(false),
      onConfirm: async () => {
        try {
          const finalLotId = await saveLotToDb(COMPLETED_STATUS);
          await createHandoffSlip(detailRows.map((row) => row.id), finalLotId, toSlipType, { silent: true });

          const existingInventory = availableInventory.filter((item) => item.source_lot_id === finalLotId);

          if (existingInventory.length > 0) {
            setModal({
              isOpen: true,
              type: 'alert',
              title: 'Đã hoàn tất trước đó',
              message: 'Lô sản xuất này đã được xác nhận hoàn tất và nhập kho trước đó. Không tạo lại dữ liệu.',
              onConfirm: () => {
                setIsConfirmingProduction(false);
                onNavigate('lot-list');
              }
            });
            return;
          }

          const newInventoryItems = [];

          const firstInput = selectedInputs[0] || {};
          const firstInputData = firstInput.data || {};
          const inheritedBatchId = firstInput.batchId || firstInputData.batchId || null;
          const inheritedMalo = firstInputData.malo_nguyenlieu || null;
          const inheritedPid = firstInputData.p_id || null;
          const inheritedOrderId = firstInputData.orderId || null;
          const inheritedOrderName = firstInputData.orderName || null;
          const inheritedOrigin = firstInputData.origin || null;
          const inheritedFsc = firstInputData.fsc_name || null;
          const inheritedWoodType = firstInput.wood_type || firstInputData.wood_type || null;

          detailRows.forEach(row => {
            const qty = Math.min(getFinalCompleted(row), Number(row.quantity) || 0);
            if (qty <= 0) return;

            const t = Number(row.thickness) || 0;
            const w = Number(row.width) || 0;
            const l = Number(row.length) || 0;
            const vol = (t > 0 && w > 0 && l > 0) ? ((t * w * l * qty) / 1000000000).toFixed(4) : 0;

            newInventoryItems.push({
              name: row.semiFinishedName || row.productName || 'Thành phẩm định hình',
              source_detail_id: row.id,
              product_id: row.productId || null,
              thickness: t,
              width: w,
              length: l,
              quantity: qty,
              volume: vol,
              type: 'SEMIFINISHED',
              stock_category: 'DETAIL',
              stock_status: getHandoffCreatedQty(row, toSlipType) >= qty ? 'allocated' : 'available',
              status: getHandoffCreatedQty(row, toSlipType) >= qty ? 'Đang dùng trong sản xuất' : 'Sẵn sàng',
              source_lot_id: finalLotId,
              wood_type: inheritedWoodType || row.semiFinishedName || row.productName,
              data: {
                batchId: inheritedBatchId,
                malo_nguyenlieu: inheritedMalo,
                p_id: inheritedPid,
                orderId: inheritedOrderId,
                orderName: inheritedOrderName,
                origin: inheritedOrigin,
                fsc_name: inheritedFsc,
                source: 'produced',
              }
            });
          });

          const parallelOps = [];
          if (selectedInputs.length > 0) {
            parallelOps.push(db.consumeInventoryForLot(finalLotId, selectedInputs));
          }
          if (newInventoryItems.length > 0) {
            parallelOps.push(db.addInventory(newInventoryItems));
          }
          if (parallelOps.length > 0) {
            await Promise.all(parallelOps);
          }

          setModal({
            isOpen: true,
            type: 'alert',
            title: 'Thành công',
            message: `Đã hoàn tất phiếu định hình và tạo phiếu giao sang ${targetConfig.label}.`,
            onConfirm: () => onNavigate('lot-list')
          });
        } catch (error) {
          console.error('Error finalizing production:', error);
          setModal({
            isOpen: true,
            type: 'alert',
            title: 'Lỗi',
            message: `Có lỗi xảy ra: ${error.message || 'Vui lòng thử lại'}`,
            onConfirm: () => setIsConfirmingProduction(false)
          });
        } finally {
          setIsConfirmingProduction(false);
        }
      }
    });
  };

  return {
    newLotId,
    lotName, setLotName,
    slipDate, setSlipDate,
    status, setStatus,
    description, setDescription,
    orders,
    selectedTargetProducts, setSelectedTargetProducts,
    orderModalOpen, setOrderModalOpen,
    availableInventory,
    inventoryModalOpen, setInventoryModalOpen,
    selectedInputs, setSelectedInputs,
    invSearch, setInvSearch,
    customRequests, setCustomRequests,
    detailRows, setDetailRows,
    selectedStageId, setSelectedStageId,
    stageTickets, setStageTickets,
    lastStageSave, setLastStageSave,
    selectedHandoffRowIds, setSelectedHandoffRowIds,
    handoffTargetSlipType, setHandoffTargetSlipType,
    handoffConfirm, setHandoffConfirm,
    modal, setModal,
    isConfirmingProduction, setIsConfirmingProduction,
    isCompleted,
    closeModal,
    moldingInventory,
    filteredInventory,
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
    handleAddDetailRow,
    handleRemoveDetailRow,
    handleRowChange,
    handleStageCompletedChange,
    handleSaveStageProgress,
    handleUndoStageProgress,
    handleCompleteRowsStages,
    handleCompleteProductStages,
    handleCompleteDetailStages,
    getHandoffRemaining,
    handleToggleHandoffRow,
    getRowsToHandoff,
    groupRowsForHandoff,
    createHandoffSlip,
    handleCreateHandoffSlip,
    handleToggleDetailStage,
    handleApplyDetailStages,
    getInputUsageError,
    toast,
    saveLotToDb,
    handleSaveDraft,
    handleBackToList,
    handleCancelLot,
    handleConfirmProduction,
    finalizeProduction,
    getHandoffCreatedQty,
    hasHandoffRecords,
    DEFAULT_HANDOFF_TARGET,
    HANDOFF_TARGET_OPTIONS
  };
}

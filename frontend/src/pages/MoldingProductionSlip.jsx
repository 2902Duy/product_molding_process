import { useEffect, useState } from 'react';
import { ArrowLeft, Save, Check, X } from 'lucide-react';
import { db } from '../services/db';

import InputTable from '../components/ProductionLot/InputTable';
import TargetProductTable from '../components/ProductionLot/TargetProductTable';
import MoldingDetailTable from '../components/Molding/MoldingDetailTable';
import CustomRequestTable from '../components/Molding/CustomRequestTable';
import OrderSelectionModal from '../components/ProductionLot/OrderSelectionModal';
import MoldingInventoryModal from '../components/Molding/MoldingInventoryModal';
import { MOLDING_STAGES } from '../constants/moldingStages';

const ACTIVE_STATUS = 'Đang sản xuất';
const COMPLETED_STATUS = 'Hoàn thành';
const DEFAULT_LOT_NAME = 'Phiếu định hình đơn hàng mới';
const LEGACY_DEFAULT_LOT_NAMES = ['Phiếu SX Định hình', 'Phiếu SX Định hình -'];

const createStageProgress = (quantity = '', existingStages = [], legacyStageId = null, legacyCompleted = 0) => {
  const required = Number(quantity) || 0;
  const selectedStageIds = existingStages.length > 0
    ? existingStages.map((stage) => stage.id)
    : MOLDING_STAGES.map((stage) => stage.id);

  return MOLDING_STAGES
    .filter((stage) => selectedStageIds.includes(stage.id))
    .map((stage) => {
    const existing = existingStages.find((item) => item.id === stage.id);
    const completed = existing
      ? Number(existing.completed) || 0
      : stage.id === legacyStageId ? Number(legacyCompleted) || 0 : 0;

    return {
      ...stage,
      required,
      completed: Math.min(required, completed),
      records: existing?.records || []
    };
  });
};

const getFinalCompleted = (row) => {
  if (!Array.isArray(row.stages) || row.stages.length === 0) {
    return Number(row.quantity_completed) || 0;
  }

  return row.stages.reduce(
    (min, stage) => Math.min(min, Number(stage.completed) || 0),
    Number(row.quantity) || 0
  );
};

const normalizeDetailRow = (row) => {
  const quantity = row.quantity ?? '';
  const legacyCompleted = Number(row.quantity_completed) || 0;
  const existingStages = Array.isArray(row.stages) ? row.stages : [];
  const legacyIsFullyCompleted = !existingStages.length && legacyCompleted >= (Number(quantity) || 0) && Number(quantity) > 0;
  const stages = legacyIsFullyCompleted
    ? createStageProgress(quantity, MOLDING_STAGES.map((stage) => ({ ...stage, completed: Number(quantity) || 0 })))
    : createStageProgress(quantity, existingStages, row.stage, legacyCompleted);

  const normalized = {
    ...row,
    quantity,
    stages
  };

  return {
    ...normalized,
    quantity_completed: getFinalCompleted(normalized)
  };
};

const createDetailRow = (overrides = {}) => normalizeDetailRow({
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
  ...overrides
});

const createCustomRequestRow = () => ({
  id: `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  woodType: '',
  thickness: '',
  width: '',
  length: '',
  quantity: '',
  reason: '',
  note: ''
});

const createLotId = () => db.createLotId('DINH_HINH');

const getSelectedOrderCodes = (products = []) => {
  const codes = products.map((product) => product.orderName || product.orderId).filter(Boolean);
  return [...new Set(codes)];
};

const shouldUseAutoLotName = (name) => {
  const trimmed = String(name || '').trim();
  if (!trimmed) return true;
  if (trimmed.toLowerCase().startsWith('phiếu bổ sung')) return false;
  return trimmed === DEFAULT_LOT_NAME || LEGACY_DEFAULT_LOT_NAMES.some((defaultName) => trimmed === defaultName || trimmed.startsWith(`${defaultName} `));
};

const buildAutoLotName = (products = []) => {
  const orderCodes = getSelectedOrderCodes(products);
  return orderCodes.length > 0
    ? `Phiếu định hình - ${orderCodes.join(', ')}`
    : DEFAULT_LOT_NAME;
};

const calculateRequestVolume = (request) => {
  const thickness = Number(request.thickness) || 0;
  const width = Number(request.width) || 0;
  const length = Number(request.length) || 0;
  const quantity = Number(request.quantity) || 0;
  if (thickness <= 0 || width <= 0 || length <= 0 || quantity <= 0) return '';
  return Number(((thickness * width * length * quantity) / 1000000000).toFixed(4));
};

export default function MoldingProductionSlip({ onNavigate, lotId }) {
  const [newLotId] = useState(createLotId);
  const [lotName, setLotName] = useState('');
  const [slipDate, setSlipDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState(ACTIVE_STATUS);
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

  // Detail rows for stages
  const [detailRows, setDetailRows] = useState([]);
  const [selectedStageId, setSelectedStageId] = useState(MOLDING_STAGES[0].id);
  const [stageTickets, setStageTickets] = useState([]);

  const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
  const closeModal = () => setModal((prev) => ({ ...prev, isOpen: false }));
  const isCompleted = status === COMPLETED_STATUS || status === 'Ho\u00c3\u00a0n th\u00c3\u00a0nh';

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

    if (!lotId || lotId === 'new') {
      setLotName(DEFAULT_LOT_NAME);
      return;
    }

    const lot = db.getLot(lotId);
    if (!lot) return;

    setLotName(lot.name || '');
    setStatus(lot.status || ACTIVE_STATUS);
    setDescription(lot.description || '');
    setSlipDate(lot.date || new Date().toISOString().split('T')[0]);
    setSelectedTargetProducts(lot.targetProducts || []);
    setSelectedInputs((lot.inputs || []).map((item) => ({
      ...item,
      quantity_used: item.quantity_used ?? item.quantity,
      volume_used: item.volume_used ?? item.volume
    })));
    setCustomRequests(lot.customRequests || []);
    setStageTickets(lot.stageTickets || []);
    setDetailRows(lot.details && lot.details.length > 0 ? lot.details.map(normalizeDetailRow) : []);
  }, [lotId, newLotId]);

  const hasValidDimensions = (item) =>
    Number(item.thickness) > 0 && Number(item.width) > 0 && Number(item.length) > 0;

  const isMoldingInput = (item) => {
    const sourceLotId = String(item.source_lot_id || '');
    const isMoldingOutput = sourceLotId.startsWith('DH-') || sourceLotId.startsWith('DDH-');
    return (
      (item.type === 'SEMIFINISHED' || item.type === 'SURPLUS') &&
      hasValidDimensions(item) &&
      !isMoldingOutput
    );
  };

  // Filter inventory for molding: only sized blanks, not outputs from molding slips.
  const moldingInventory = availableInventory.filter(isMoldingInput);

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

  // Handlers for target products
  const handleToggleProductSelection = (product, order) => {
    if (completedMoldingProductIds.has(product.id)) return;

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
      const newDetailRows = items.map(item => createDetailRow({
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
      const newDetailRow = createDetailRow({
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
      });
      setDetailRows([...detailRows, newDetailRow]);
    }
  };

  const handleToggleOrderSelection = (order) => {
    // Toggle all products in this order
    const orderProducts = (order.products || []).filter(product => !completedMoldingProductIds.has(product.id));
    if (orderProducts.length === 0) return;
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
            return items.map(item => createDetailRow({
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
            return [createDetailRow({
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
    // Also update detail rows using each part's base quantity.
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
      onConfirm: () => {
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

        db.saveLot({
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

  // Detail row handlers
  const handleAddDetailRow = () => {
    setDetailRows([...detailRows, createDetailRow()]);
  };

  const handleRemoveDetailRow = (id) => {
    setDetailRows(detailRows.filter(row => row.id !== id));
  };

  const handleRowChange = (id, field, value) => {
    setDetailRows(detailRows.map(row =>
      row.id === id ? normalizeDetailRow({ ...row, [field]: value }) : row
    ));
  };

  const applyStageProgress = (rows, stageId, entries, ticketId) => {
    return rows.map((row) => {
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
    setStatus(ACTIVE_STATUS);

  };

  const handleCompleteAllStages = () => {
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString('vi-VN');
    const batchId = Date.now();
    const ticketItemsByStage = {};

    const updatedRows = detailRows.map((row) => {
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
        message: 'Tất cả công đoạn đã được hoàn thành trước đó.'
      });
      return;
    }

    const updatedTickets = [...stageTickets, ...quickTickets];
    setDetailRows(updatedRows);
    setStageTickets(updatedTickets);
    setStatus(ACTIVE_STATUS);
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

      const nextStageIds = new Set([...selectedIds, ...lockedIds]);
      const nextStages = MOLDING_STAGES
        .filter((stage) => nextStageIds.has(stage.id))
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

  // Save handlers
  const saveLotToDb = (newStatus) => {
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
    db.saveLot(lot);
    setLotName(finalLotName);
    setStatus(newStatus);
    return finalLotId;
  };

  const handleSaveDraft = () => {
    if (isCompleted) return;
    saveLotToDb(ACTIVE_STATUS);
    setModal({
      isOpen: true,
      type: 'alert',
      title: 'Thành công',
      message: 'Đã lưu nháp phiếu sản xuất định hình.'
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
      message: 'Bạn có muốn lưu nháp phiếu sản xuất định hình trước khi quay lại danh sách không?',
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
      message: 'Bạn có chắc muốn huỷ và xoá phiếu sản xuất định hình này không? Hành động này không thể hoàn tác.',
      onConfirm: () => {
        const finalLotId = lotId && lotId !== 'new' ? lotId : newLotId;
        db.deleteLot(finalLotId);
        onNavigate('lot-list');
      }
    });
  };

  const handleConfirmProduction = () => {
    if (isCompleted) return;

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
      title: 'Xác nhận hoàn tất',
      message: 'Xác nhận hoàn thành phiếu định hình? Tất cả chi tiết đã hoàn thành đủ các công đoạn sẽ được nhập kho.',
      onConfirm: () => {
        const finalLotId = saveLotToDb(COMPLETED_STATUS);
        const newInventoryItems = [];

        // Create inventory from completed detail rows.
        detailRows.forEach(row => {
          const qty = Math.min(getFinalCompleted(row), Number(row.quantity) || 0);
          if (qty <= 0) return;

          const t = Number(row.thickness) || 0;
          const w = Number(row.width) || 0;
          const l = Number(row.length) || 0;
          const vol = (t > 0 && w > 0 && l > 0) ? ((t * w * l * qty) / 1000000000).toFixed(4) : 0;

          newInventoryItems.push({
            name: row.semiFinishedName || row.productName || 'Thành phẩm định hình',
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
          onAddRow={handleAddDetailRow}
          onRemoveRow={handleRemoveDetailRow}
          onRowChange={handleRowChange}
          onStageChange={setSelectedStageId}
          onSaveStageProgress={handleSaveStageProgress}
          onCompleteAllStages={handleCompleteAllStages}
          onToggleStage={handleToggleDetailStage}
          onApplyStages={handleApplyDetailStages}
        />
      </div>

      {/* Bottom action bar */}
      {!isCompleted && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 md:p-4 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
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
                className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2.5 md:py-3 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition"
              >
                Huỷ
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

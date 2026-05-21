import { useEffect, useState } from 'react';
import { ArrowLeft, Save, Check, ChevronDown, ChevronUp, X, Loader2 } from 'lucide-react';
import { db } from '../services/db';

import TargetProductTable from '../components/ProductionLot/TargetProductTable';
import OrderSelectionModal from '../components/ProductionLot/OrderSelectionModal';
import MoldingInventoryModal from '../components/Molding/MoldingInventoryModal';
import { FINISHING_SLIP_CONFIGS, FINISHING_STAGES } from '../constants/finishingStages';

const ACTIVE_STATUS = 'Đang sản xuất';
const COMPLETED_STATUS = 'Hoàn thành';
const DEFAULT_SLIP_TYPE = 'ASSEMBLY';

// Safely convert a value to a string for rendering. Prevents React crash when
// database contains corrupted object values (e.g., {} instead of a string).
const safeStr = (v) => (v != null && typeof v === 'object' ? '' : (v ?? ''));
const safeArray = (value) => (Array.isArray(value) ? value : []);

const createStageProgress = (quantity = '', existingStages = [], legacyStageId = null, legacyCompleted = 0, stageOptions = FINISHING_STAGES) => {
  const required = Number(quantity) || 0;
  const normalizedExistingStages = safeArray(existingStages);
  const selectedStageIds = normalizedExistingStages.length > 0
    ? normalizedExistingStages.map((stage) => stage.id)
    : stageOptions.map((stage) => stage.id);

  return selectedStageIds
    .map((stageId) => stageOptions.find((stage) => stage.id === stageId) || normalizedExistingStages.find((stage) => stage.id === stageId))
    .filter(Boolean)
    .map((stage) => {
    const existing = normalizedExistingStages.find((item) => item.id === stage.id);
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
  const stages = safeArray(row.stages);
  if (stages.length === 0) {
    return Number(row.quantity_completed) || 0;
  }

  return stages.reduce(
    (min, stage) => Math.min(min, Number(stage.completed) || 0),
    Number(row.quantity) || 0
  );
};

const normalizeDetailRow = (row, stageOptions = FINISHING_STAGES) => {
  const quantity = row.quantity ?? '';
  const legacyCompleted = Number(row.quantity_completed) || 0;
  const existingStages = safeArray(row.stages);
  const legacyIsFullyCompleted = !existingStages.length && legacyCompleted >= (Number(quantity) || 0) && Number(quantity) > 0;
  const stages = legacyIsFullyCompleted
    ? createStageProgress(quantity, stageOptions.map((stage) => ({ ...stage, completed: Number(quantity) || 0 })), null, 0, stageOptions)
    : createStageProgress(quantity, existingStages, row.stage, legacyCompleted, stageOptions);

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

const createDetailRow = (overrides = {}, stageOptions = FINISHING_STAGES) => normalizeDetailRow({
  id: `DETAIL-HT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
}, stageOptions);

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

const getSelectedOrderCodes = (products = []) => {
  const codes = products.map((product) => product.orderName || product.orderId).filter(Boolean);
  return [...new Set(codes)];
};

const shouldUseAutoLotName = (name, config) => {
  const trimmed = String(name || '').trim();
  if (!trimmed) return true;
  if (trimmed.toLowerCase().startsWith('phiếu bổ sung')) return false;
  return trimmed === config.defaultName || trimmed === 'Phiếu hoàn thiện đơn hàng mới' || trimmed.startsWith(`${config.autoNamePrefix} -`);
};

const buildAutoLotName = (products = [], config) => {
  const orderCodes = getSelectedOrderCodes(products);
  return orderCodes.length > 0
    ? `${config.autoNamePrefix} - ${orderCodes.join(', ')}`
    : config.defaultName;
};

const calculateRequestVolume = (request) => {
  const thickness = Number(request.thickness) || 0;
  const width = Number(request.width) || 0;
  const length = Number(request.length) || 0;
  const quantity = Number(request.quantity) || 0;
  if (thickness <= 0 || width <= 0 || length <= 0 || quantity <= 0) return '';
  return Number(((thickness * width * length * quantity) / 1000000000).toFixed(4));
};

const firstPositiveNumber = (source, keys = []) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value === null || value === undefined || value === '') continue;
    const numeric = Number(typeof value === 'string' ? value.replace(',', '.') : value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }
  return 0;
};

const getProductDimensions = (product = {}) => ({
  length: firstPositiveNumber(product, ['length', 'dai', 'dai_sp', 'dai_tp', 'chieudai', 'chieu_dai', 'product_length']),
  width: firstPositiveNumber(product, ['width', 'rong', 'rong_sp', 'rong_tp', 'chieurong', 'chieu_rong', 'product_width']),
  thickness: firstPositiveNumber(product, ['thickness', 'height', 'cao', 'cao_sp', 'cao_tp', 'chieu_cao', 'chieucao', 'day', 'day_sp', 'day_tp', 'product_height']),
});

const getProductInventoryVolume = (product = {}, quantity = 0) => {
  const explicitVolume = firstPositiveNumber(product, ['volume', 'm3', 'm3_sp', 'm3_tp', 'sokhoi', 'the_tich', 'thetich', 'product_volume']);
  if (explicitVolume > 0) return Number(explicitVolume.toFixed(4));

  const { length, width, thickness } = getProductDimensions(product);
  if (length > 0 && width > 0 && thickness > 0 && quantity > 0) {
    return Number(((length * width * thickness * quantity) / 1000000000).toFixed(4));
  }

  return 0;
};

const NEXT_FINISHING_SLIP = {
  ASSEMBLY: 'PAINTING',
  PAINTING: 'PACKING'
};

const getProductRequiredQty = (product, detailRows = []) => {
  const rows = detailRows.filter((row) => row.productId === product.id);
  const quantityByDetail = rows.reduce((acc, row) => {
    const detailKey = row.source_detail_id || row.semiFinishedId || row.id;
    if (!acc[detailKey]) {
      acc[detailKey] = {
        baseQty: Number(row.base_quantity) || 1,
        quantity: 0
      };
    }
    acc[detailKey].quantity += Number(row.quantity) || 0;
    return acc;
  }, {});

  const candidates = Object.values(quantityByDetail)
    .map(({ baseQty, quantity }) => (baseQty > 0 ? Math.floor(quantity / baseQty) : quantity))
    .filter((qty) => qty > 0);

  if (candidates.length > 0) return Math.min(...candidates);
  return Number(product.quantity_produce ?? product.quantity) || 0;
};

const normalizeHandoffTargetProducts = (products = [], detailRows = []) =>
  products.map((product) => {
    const requiredQty = getProductRequiredQty(product, detailRows);
    if (requiredQty <= 0) return product;

    return {
      ...product,
      quantity: requiredQty,
      quantity_produce: requiredQty
    };
  });

const getReceivedDetailKey = (row, handoffLotId = row.input_handoff_lot_id || '') =>
  `${handoffLotId || 'local'}::${row.source_detail_id || row.id}`;

const getDetailGroupKey = (row) => row.source_detail_id || row.semiFinishedId || row.id;

const getProductHandoffQty = (product, toSlipType) =>
  safeArray(product.handoffRecords)
    .filter((record) => record.toSlipType === toSlipType)
    .reduce((sum, record) => sum + (Number(record.quantity) || 0), 0);

const mergeTargetProducts = (existingProducts = [], incomingProducts = []) => {
  const productMap = new Map(existingProducts.map((product) => [product.id, product]));

  incomingProducts.forEach((product) => {
    const existing = productMap.get(product.id);
    if (!existing) {
      productMap.set(product.id, product);
      return;
    }

    const existingQty = Number(existing.quantity_produce ?? existing.quantity) || 0;
    const incomingQty = Number(product.quantity_produce ?? product.quantity) || 0;
    productMap.set(product.id, {
      ...existing,
      ...product,
      quantity: existingQty + incomingQty,
      quantity_produce: existingQty + incomingQty,
      quantity_completed: Number(existing.quantity_completed) || 0,
      input_handoff_lot_ids: [
        ...new Set([...safeArray(existing.input_handoff_lot_ids), ...safeArray(product.input_handoff_lot_ids)])
      ],
    });
  });

  return [...productMap.values()];
};

export default function FinishingProductionSlip({ onNavigate, lotId, slipType = DEFAULT_SLIP_TYPE }) {
  const requestedSlipType = FINISHING_SLIP_CONFIGS[slipType] ? slipType : DEFAULT_SLIP_TYPE;
  const [currentSlipType, setCurrentSlipType] = useState(requestedSlipType);
  const slipConfig = FINISHING_SLIP_CONFIGS[currentSlipType] || FINISHING_SLIP_CONFIGS[DEFAULT_SLIP_TYPE];
  const processStages = slipConfig.stages;
  const [newLotId] = useState(() => db.createLotId(requestedSlipType));
  const [lotName, setLotName] = useState('');
  const [slipDate, setSlipDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState(ACTIVE_STATUS);
  const [description, setDescription] = useState('');
  const [linkedHandoffMeta, setLinkedHandoffMeta] = useState(null);

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
  const [selectedStageId, setSelectedStageId] = useState(processStages[0].id);
  const [stageTickets, setStageTickets] = useState([]);
  const [lastStageSave, setLastStageSave] = useState(null);
  const [selectedProductHandoffIds, setSelectedProductHandoffIds] = useState([]);
  const [selectedInputHandoffLotIds, setSelectedInputHandoffLotIds] = useState([]);
  const [expandedHandoffLotId, setExpandedHandoffLotId] = useState(null);
  const [productHandoffConfirm, setProductHandoffConfirm] = useState({
    isOpen: false,
    toSlipType: null,
    mode: 'handoff',
    productIds: null,
  });

  const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
  const [isConfirmingProduction, setIsConfirmingProduction] = useState(false);
  const [isModalSubmitting, setIsModalSubmitting] = useState(false);
  const closeModal = () => {
    if (isModalSubmitting) return;
    setModal((prev) => ({ ...prev, isOpen: false }));
  };
  const isCompleted = status === COMPLETED_STATUS || status === 'Hoàn thành';

  useEffect(() => {
    if (!processStages.some((stage) => stage.id === selectedStageId)) {
      setSelectedStageId(processStages[0].id);
    }
  }, [currentSlipType, processStages, selectedStageId]);

  useEffect(() => {
    const loadData = async () => {
      const [inv, ord] = await Promise.all([
        db.getInventoryAsync(),
        db.getOrdersAsync(),
      ]);
      setAvailableInventory(safeArray(inv));
      setOrders(safeArray(ord));

      db.syncFromMcp({ orders: { maxOrders: 30, detailOrderLimit: 10, bomProductLimit: 4 } })
        .then(async () => {
          const [inv2, ord2] = await Promise.all([
            db.getInventoryAsync(),
            db.getOrdersAsync(),
          ]);
          setAvailableInventory(safeArray(inv2));
          setOrders(safeArray(ord2));
        })
        .catch(async () => {
          const [inv2, ord2] = await Promise.all([
            db.getInventoryAsync(),
            db.getOrdersAsync(),
          ]);
          setAvailableInventory(safeArray(inv2));
          setOrders(safeArray(ord2));
        });

      if (!lotId || lotId === 'new') {
        setLotName(slipConfig.defaultName);
        setLinkedHandoffMeta(null);
        return;
      }

      const lotRaw = await db.getLotAsync(lotId);
      if (!lotRaw) return;
      const lot = lotRaw;
      const loadedSlipType = FINISHING_SLIP_CONFIGS[lot.slip_type] ? lot.slip_type : requestedSlipType;
      setCurrentSlipType(loadedSlipType);
      const loadedStages = FINISHING_SLIP_CONFIGS[loadedSlipType]?.stages || processStages;

      setLotName(lot.name || '');
      setStatus(lot.status || ACTIVE_STATUS);
      setDescription(lot.description || '');
      const srcLotId = safeStr(lot.source_lot_id);
      setLinkedHandoffMeta(srcLotId ? {
        id: safeStr(lot.handoff_lot_id) || safeArray(lot.pending_handoff_lot_ids).map(safeStr).filter(Boolean).join(', ') || lotRaw.id,
        sourceLotId: srcLotId,
        sourceSlipType: safeStr(lot.source_slip_type),
      } : null);
      setSlipDate(lot.date || new Date().toISOString().split('T')[0]);
      const rawDetails = safeArray(lot.details);
      const rawProducts = safeArray(lot.targetProducts);
      const loadedDetails = rawDetails.length > 0 ? rawDetails.map((row) => normalizeDetailRow(row, loadedStages)) : [];
      const loadedProducts = safeArray(lot.input_handoff_lot_ids).length > 0 || lot.source_lot_id
        ? normalizeHandoffTargetProducts(rawProducts, loadedDetails)
        : rawProducts;
      setSelectedTargetProducts(loadedProducts);
      setSelectedInputs(safeArray(lot.inputs).map((item) => ({
        ...item,
        quantity_used: item.quantity_used ?? item.quantity,
        volume_used: item.volume_used ?? item.volume
      })));
      setCustomRequests(safeArray(lot.customRequests));
      setStageTickets(safeArray(lot.stageTickets));
      setDetailRows(loadedDetails);
      setLastStageSave(null);
    };
    loadData();
  }, [lotId, newLotId]);

  const hasValidDimensions = (item) =>
    Number(item.thickness) > 0 && Number(item.width) > 0 && Number(item.length) > 0;

  const isMoldingInput = (item) => {
    const status = String(item.status || '').trim().toUpperCase();
    if (status === 'USED' || status === 'CONSUMED' || status === 'ĐANG DÙNG TRONG SẢN XUẤT' || status === 'LOẠI BỎ' || (item.quantity !== undefined && Number(item.quantity) <= 0)) {
      return false;
    }
    const sourceLotId = String(item.source_lot_id || '');
    const isMoldingOutput = sourceLotId.startsWith('DH-') || sourceLotId.startsWith('HT-');
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

  const selectedProductIds = new Set(selectedTargetProducts.map((product) => product.id));
  const linkedHandoffQty = selectedTargetProducts.reduce(
    (sum, product) => sum + (Number(product.quantity_produce ?? product.quantity) || 0),
    0
  );
  const currentReceivingLotId = lotId && lotId !== 'new' ? lotId : newLotId;
  const handoffLotsForCurrentSlip = db.getLots()
    .filter((lot) => {
      const isHandoffLot = lot.is_handoff || (safeStr(lot.source_lot_id) && lot.handoff_lot_id === lot.id);
      const receivedByLotIds = safeArray(lot.received_by_lot_ids);
      const isReceivedByCurrentLot = receivedByLotIds.includes(currentReceivingLotId);
      if (lot.id === lotId || lot.id === newLotId) return false;
      if (!isHandoffLot) return false;
      if (receivedByLotIds.length > 0 && !isReceivedByCurrentLot) return false;
      if (lot.slip_type !== currentSlipType) return false;
      if (!safeStr(lot.source_lot_id)) return false;
      if (linkedHandoffMeta?.sourceLotId && safeStr(lot.source_lot_id) !== linkedHandoffMeta.sourceLotId) return false;
      if (lot.target_lot_id && lot.target_lot_id !== currentReceivingLotId && !isReceivedByCurrentLot) return false;
      const products = safeArray(lot.targetProducts);
      return products.some((product) => selectedProductIds.size === 0 || selectedProductIds.has(product.id));
    });
  const availableHandoffLots = handoffLotsForCurrentSlip.filter(
    (lot) => !safeArray(lot.received_by_lot_ids).includes(currentReceivingLotId)
  );

  const isHandoffLotReceivedByCurrent = (handoffLot) =>
    safeArray(handoffLot.received_by_lot_ids).includes(currentReceivingLotId);

  const handleToggleInputHandoffLot = (handoffLotId) => {
    const handoffLot = handoffLotsForCurrentSlip.find((lot) => lot.id === handoffLotId);
    if (!handoffLot || isHandoffLotReceivedByCurrent(handoffLot)) return;

    setSelectedInputHandoffLotIds((prev) => (
      prev.includes(handoffLotId)
        ? prev.filter((id) => id !== handoffLotId)
        : [...prev, handoffLotId]
    ));
  };

  const handleImportHandoffLots = async () => {
    const selectedLots = availableHandoffLots.filter((lot) => selectedInputHandoffLotIds.includes(lot.id));
    if (selectedLots.length === 0) return;
    const receivingLotId = lotId && lotId !== 'new' ? lotId : newLotId;

    const productMap = new Map(selectedTargetProducts.map((product) => [product.id, product]));
    const detailMap = new Map(detailRows.map((row) => [getReceivedDetailKey(row), row]));

    for (const lot of selectedLots) {
      safeArray(lot.targetProducts).forEach((product) => {
        const existing = productMap.get(product.id);
        productMap.set(product.id, {
          ...(existing || product),
          ...(!existing ? product : {}),
          input_handoff_lot_ids: [...new Set([...safeArray(existing?.input_handoff_lot_ids), lot.id])]
        });
      });

      safeArray(lot.details).forEach((row) => {
        const key = getReceivedDetailKey(row, lot.id);
        if (!detailMap.has(key)) {
          detailMap.set(key, {
            ...row,
            input_handoff_lot_id: lot.id
          });
        }
      });

      await db.saveLot({
        ...lot,
        received_by_lot_ids: [...new Set([...safeArray(lot.received_by_lot_ids), receivingLotId])],
        received_at: new Date().toISOString()
      });
    }

    const nextDetailRows = [...detailMap.values()].map((row) => normalizeDetailRow(row, processStages));
    const nextTargetProducts = normalizeHandoffTargetProducts([...productMap.values()], nextDetailRows);
    setSelectedTargetProducts(nextTargetProducts);
    setDetailRows(nextDetailRows);
    setLinkedHandoffMeta({
      id: selectedLots.map((lot) => lot.id).join(', '),
      sourceLotId: [...new Set(selectedLots.map((lot) => lot.source_lot_id).filter(Boolean))].join(', '),
      sourceSlipType: selectedLots[0]?.source_slip_type || '',
    });
    const existingReceivingLot = await db.getLotAsync(receivingLotId);
    const existingData = existingReceivingLot || {};
    await db.saveLot({
      ...existingData,
      id: receivingLotId,
      name: lotName || slipConfig.defaultName,
      date: slipDate,
      status: ACTIVE_STATUS,
      description,
      slip_type: currentSlipType,
      source_lot_id: selectedLots[0]?.source_lot_id || linkedHandoffMeta?.sourceLotId || null,
      source_slip_type: selectedLots[0]?.source_slip_type || linkedHandoffMeta?.sourceSlipType || null,
      input_handoff_lot_ids: [
        ...new Set([
          ...safeArray(existingData.input_handoff_lot_ids),
          ...selectedLots.map((lot) => lot.id)
        ])
      ],
      targetProducts: nextTargetProducts,
      inputs: selectedInputs,
      customRequests,
      stageTickets,
      details: nextDetailRows
    });
    setSelectedInputHandoffLotIds([]);
    setExpandedHandoffLotId(selectedLots[0]?.id || null);
  };

  const completedMoldingProductIds = new Set(
    db.getLots()
      .filter((lot) => {
        const sameLot = lot.id === lotId || lot.id === newLotId;
        const completedStatus = lot.status === COMPLETED_STATUS || lot.status === 'Ho\u00c3\u00a0n th\u00c3\u00a0nh';
        return !sameLot && lot.slip_type === currentSlipType && completedStatus;
      })
      .flatMap((lot) => safeArray(lot.targetProducts))
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
    const items = safeArray(product.items);

    if (items.length > 0) {
      // Add each item/part as a detail row
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
      }, processStages));
      setDetailRows([...detailRows, ...newDetailRows]);
    } else {
      // Fallback: add product as single detail row using product name as semiFinishedName
      const newDetailRow = createDetailRow({
        productId: product.id,
        productCode: product.code || product.productCode || product.id,
        productName: product.name,
        semiFinishedId: product.id,
        semiFinishedName: product.name, // Use product name as detail name
        thickness: product.thickness || '',
        width: product.width || '',
        length: product.length || '',
        base_quantity: 1,
        quantity: productQty,
        quantity_completed: 0
      }, processStages);
      setDetailRows([...detailRows, newDetailRow]);
    }
  };

  const handleToggleOrderSelection = (order) => {
    // Toggle all products in this order
    const orderProducts = safeArray(order.products).filter(product => !completedMoldingProductIds.has(product.id));
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
          const items = safeArray(p.items);

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
            }, processStages));
          } else {
            return [createDetailRow({
              productId: p.id,
              productCode: p.code || p.productCode || p.id,
              productName: p.name,
              semiFinishedId: p.id,
              semiFinishedName: p.name, // Use product name as detail name
              thickness: p.thickness || '',
              width: p.width || '',
              length: p.length || '',
              base_quantity: 1,
              quantity: productQty,
              quantity_completed: 0
            }, processStages)];
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
      }, processStages) : row
    ));
  };

  const handleRemoveProduct = (id) => {
    setSelectedTargetProducts(selectedTargetProducts.filter(product => product.id !== id));
    setDetailRows(detailRows.filter(row => row.productId !== id));
  };

  const handleChangeProductMeta = (id, field, value) => {
    setSelectedTargetProducts(selectedTargetProducts.map(product => (
      product.id === id ? { ...product, [field]: value } : product
    )));
  };

  const handleChangeProductNumber = (id, field, value) => {
    const normalized = value === '' ? '' : Math.max(0, Number(value) || 0);
    setSelectedTargetProducts(selectedTargetProducts.map(product => (
      product.id === id ? {
        ...product,
        [field]: field === 'quantity_completed_entry' && normalized !== ''
          ? Math.min(normalized, Math.max(0, getProductRequiredQty(product, detailRows) - (Number(product.quantity_completed) || 0)))
          : normalized
      } : product
    )));
  };

  const handleCommitProductCompletionEntry = (id) => {
    setSelectedTargetProducts((products) => products.map((product) => {
      if (product.id !== id) return product;

      const entryQty = Number(product.quantity_completed_entry) || 0;
      if (entryQty <= 0) return { ...product, quantity_completed_entry: '' };

      const requiredQty = getProductRequiredQty(product, detailRows);
      const currentCompleted = Number(product.quantity_completed) || 0;
      const nextCompleted = Math.min(requiredQty, currentCompleted + entryQty);

      return {
        ...product,
        quantity_completed: nextCompleted,
        quantity_completed_entry: ''
      };
    }));
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

  // Detail row handlers
  const handleAddDetailRow = () => {
    setDetailRows([...detailRows, createDetailRow({}, processStages)]);
  };

  const handleRemoveDetailRow = (id) => {
    setDetailRows(detailRows.filter(row => row.id !== id));
  };

  const handleRowChange = (id, field, value) => {
    setDetailRows(detailRows.map(row =>
      row.id === id ? normalizeDetailRow({ ...row, [field]: value }, processStages) : row
    ));
  };

  const handleChangeDetailMeta = (id, field, value) => {
    setDetailRows(detailRows.map(row => (
      row.id === id ? { ...row, [field]: value } : row
    )));
  };

  const handleChangeDetailNumber = (id, field, value) => {
    const normalized = value === '' ? '' : Math.max(0, Number(value) || 0);
    handleChangeDetailMeta(id, field, normalized);
  };

  const handleStageCompletedChange = (rowId, stageId, value) => {
    setDetailRows(detailRows.map((row) => {
      if (row.id !== rowId) return row;

      const updated = {
        ...row,
        stages: createStageProgress(row.quantity, row.stages, null, 0, processStages).map((stage) => {
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
        stages: createStageProgress(row.quantity, row.stages, null, 0, processStages).map((stage) => {
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
      if (!targetIds.has(row.id)) return row;

      const rowRecords = [];
      const updatedStages = createStageProgress(row.quantity, row.stages, null, 0, processStages).map((stage) => {
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

    const quickTickets = processStages
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

  const handleToggleDetailStage = (id, stageId) => {
    setDetailRows(detailRows.map((row) => {
      if (row.id !== id) return row;

      const currentStages = createStageProgress(row.quantity, row.stages, null, 0, processStages);
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
        }, processStages);
      }

      const stageMeta = processStages.find((stage) => stage.id === stageId);
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
      }, processStages);
    }));
  };

  const handleApplyDetailStages = (stageIdsByRowId) => {
    setDetailRows(detailRows.map((row) => {
      if (!stageIdsByRowId[row.id]) return row;

      const currentStages = createStageProgress(row.quantity, row.stages, null, 0, processStages);
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
        .map((stageId) => processStages.find((stage) => stage.id === stageId) || currentStages.find((stage) => stage.id === stageId))
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
      }, processStages);
    }));
  };

  const getProductCompleteQty = (product) => Math.min(
    (Number(product.quantity_completed) || 0) + (Number(product.quantity_completed_entry) || 0),
    getProductRequiredQty(product, detailRows)
  );

  const getProductHandoffRemaining = (product, toSlipType = NEXT_FINISHING_SLIP[currentSlipType]) => {
    if (!toSlipType) return 0;
    return Math.max(0, getProductCompleteQty(product) - getProductHandoffQty(product, toSlipType));
  };

  const handleToggleProductHandoff = (productId) => {
    const product = selectedTargetProducts.find((item) => item.id === productId);
    if (!product || getProductHandoffRemaining(product) <= 0) return;

    setSelectedProductHandoffIds((prev) => (
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    ));
  };

  const getProductsToHandoff = (toSlipType, productIds = selectedProductHandoffIds) => {
    const selectedIds = new Set(productIds || []);
    return selectedTargetProducts
      .filter((product) => selectedIds.has(product.id))
      .map((product) => ({ product, quantity: getProductHandoffRemaining(product, toSlipType) }))
      .filter((item) => item.quantity > 0);
  };

  const openProductHandoffConfirm = (toSlipType, options = {}) => {
    const productIds = options.productIds || selectedProductHandoffIds;
    const productsToHandoff = getProductsToHandoff(toSlipType, productIds);
    if (productsToHandoff.length === 0) {
      setModal({
        isOpen: true,
        type: 'alert',
        title: 'Không có sản phẩm cần giao',
        message: 'Chọn sản phẩm còn số lượng chưa giao sang công đoạn tiếp theo.'
      });
      return;
    }
    setProductHandoffConfirm({
      isOpen: true,
      toSlipType,
      mode: options.mode || 'handoff',
      productIds,
    });
  };

  const createProductHandoffSlip = async (toSlipType, options = {}) => {
    const nextConfig = FINISHING_SLIP_CONFIGS[toSlipType];
    if (!nextConfig) return;

    const productsToHandoff = getProductsToHandoff(toSlipType, options.productIds);

    if (productsToHandoff.length === 0) {
      setModal({
        isOpen: true,
        type: 'alert',
        title: 'Không có sản phẩm cần giao',
        message: 'Chọn sản phẩm đã có số lượng hoàn thành và còn số lượng chưa giao.'
      });
      return;
    }

    const sourceLotId = await saveLotToDb(options.completeSource ? COMPLETED_STATUS : ACTIVE_STATUS);
    const allLots = await db.getLotsAsync();
    const existingProductionLot = allLots.find((lot) => (
      !lot.is_handoff &&
      lot.slip_type === toSlipType &&
      lot.source_lot_id === sourceLotId &&
      lot.source_slip_type === currentSlipType
    ));
    const nextProductionLotId = existingProductionLot?.id || db.createLotId(toSlipType);
    const existingHandoffCount = allLots.filter((lot) => (
      (lot.is_handoff || (lot.source_lot_id && lot.handoff_lot_id === lot.id)) &&
      lot.target_lot_id === nextProductionLotId
    )).length;
    const nextLotId = `GIAO-${nextProductionLotId}-${String(existingHandoffCount + 1).padStart(3, '0')}`;
    const date = new Date().toISOString().split('T')[0];
    const nextProducts = productsToHandoff.map(({ product, quantity }) => ({
      ...product,
      quantity,
      quantity_produce: quantity,
      quantity_completed: 0,
      source_lot_id: sourceLotId,
      input_handoff_lot_ids: [nextLotId],
      handoffRecords: []
    }));
    const detailsToHandoff = Object.values(detailRows
      .filter((row) => productsToHandoff.some(({ product }) => product.id === row.productId))
      .reduce((acc, row) => {
        const key = `${row.productId || ''}::${getDetailGroupKey(row)}`;
        if (!acc[key]) acc[key] = row;
        return acc;
      }, {}));
    const nextDetails = detailsToHandoff
      .map((row) => {
        const handoff = productsToHandoff.find(({ product }) => product.id === row.productId);
        const baseQty = Number(row.base_quantity) || 1;
        const quantity = Math.round(baseQty * handoff.quantity);
        return normalizeDetailRow({
          ...row,
          id: `DETAIL-${toSlipType}-${Date.now()}-${Math.floor(Math.random() * 1000)}-${row.id}`,
          quantity,
          quantity_completed: 0,
          source_detail_id: getDetailGroupKey(row),
          source_lot_id: sourceLotId,
          input_handoff_lot_id: nextLotId,
          handoffRecords: [],
          completedRecords: []
        }, nextConfig.stages);
      });

    await db.saveLot({
      id: nextLotId,
      name: `Phiếu giao - ${sourceLotId} -> ${nextProductionLotId}`,
      date,
      status: ACTIVE_STATUS,
      description: `Phiếu giao từ ${slipConfig.label} ${sourceLotId}.`,
      is_handoff: true,
      slip_type: toSlipType,
      source_lot_id: sourceLotId,
      source_slip_type: currentSlipType,
      handoff_lot_id: nextLotId,
      target_lot_id: nextProductionLotId,
      input_handoff_lot_ids: [nextLotId],
      targetProducts: nextProducts,
      inputs: [],
      customRequests: [],
      stageTickets: [],
      details: nextDetails
    });

    const productionProducts = nextProducts.map((product) => ({
      ...product,
      input_handoff_lot_ids: []
    }));
    await db.saveLot({
      ...(existingProductionLot || {}),
      id: nextProductionLotId,
      name: existingProductionLot?.name || `${nextConfig.autoNamePrefix} - ${sourceLotId}`,
      date: existingProductionLot?.date || date,
      status: ACTIVE_STATUS,
      description: existingProductionLot?.description || `${nextConfig.autoNamePrefix} tự tạo từ ${slipConfig.label} ${sourceLotId}.`,
      is_handoff: false,
      slip_type: toSlipType,
      source_lot_id: sourceLotId,
      source_slip_type: currentSlipType,
      pending_handoff_lot_ids: [
        ...new Set([...safeArray(existingProductionLot?.pending_handoff_lot_ids), nextLotId])
      ],
      targetProducts: mergeTargetProducts(safeArray(existingProductionLot?.targetProducts), productionProducts),
      inputs: safeArray(existingProductionLot?.inputs),
      customRequests: safeArray(existingProductionLot?.customRequests),
      stageTickets: safeArray(existingProductionLot?.stageTickets),
      details: safeArray(existingProductionLot?.details)
    });

    const updatedProducts = selectedTargetProducts.map((product) => {
      const handoff = productsToHandoff.find((item) => item.product.id === product.id);
      if (!handoff) return product;
      return {
        ...product,
        quantity_completed: getProductCompleteQty(product),
        quantity_completed_entry: '',
        handoffRecords: [
          ...safeArray(product.handoffRecords),
          {
            id: `HANDOFF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            toLotId: nextProductionLotId,
            handoffLotId: nextLotId,
            toSlipType,
            quantity: handoff.quantity,
            date
          }
        ]
      };
    });

    setSelectedTargetProducts(updatedProducts);
    setSelectedProductHandoffIds([]);
    const srcLot = await db.getLotAsync(sourceLotId);
    const srcData = srcLot?.data || srcLot || {};
    await db.saveLot({
      ...srcData,
      id: sourceLotId,
      targetProducts: updatedProducts,
      details: detailRows.map((row) => normalizeDetailRow(row, processStages))
    });

    setModal({
      isOpen: true,
      type: 'alert',
      title: options.completeSource ? 'Đã hoàn tất và tạo phiếu giao' : 'Đã tạo phiếu giao',
      message: options.completeSource
        ? `Đã hoàn tất ${slipConfig.label.toLowerCase()} và tạo phiếu giao ${nextLotId} sang ${nextConfig.label}.`
        : `Đã tạo ${nextConfig.autoNamePrefix.toLowerCase()} ${nextProductionLotId} và phiếu giao ${nextLotId}.`
    });
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
  const saveLotToDb = async (newStatus) => {
    const finalLotId = lotId && lotId !== 'new' ? lotId : newLotId;
    const finalLotName = shouldUseAutoLotName(lotName, slipConfig)
      ? buildAutoLotName(selectedTargetProducts, slipConfig)
      : lotName;
    const existingLotRaw = await db.getLotAsync(finalLotId);
    const existingLot = existingLotRaw?.data || existingLotRaw || {};
    const linkedHandoffLotIds = selectedTargetProducts.flatMap((product) => safeArray(product.input_handoff_lot_ids));
    const targetProductsToSave = selectedTargetProducts.map((product) => ({
      ...product,
      quantity_completed: getProductCompleteQty(product),
      quantity_completed_entry: ''
    }));
    const lot = {
      ...existingLot,
      id: finalLotId,
      name: finalLotName,
      date: slipDate,
      status: newStatus,
      description,
      slip_type: currentSlipType,
      source_lot_id: linkedHandoffMeta?.sourceLotId || existingLot.source_lot_id || null,
      source_slip_type: linkedHandoffMeta?.sourceSlipType || existingLot.source_slip_type || null,
      input_handoff_lot_ids: [
        ...new Set([...safeArray(existingLot.input_handoff_lot_ids), ...linkedHandoffLotIds])
      ],
      targetProducts: targetProductsToSave,
      inputs: selectedInputs,
      customRequests,
      stageTickets,
      details: detailRows.map((row) => normalizeDetailRow(row, processStages))
    };
    await db.saveLot(lot);
    setLotName(finalLotName);
    setStatus(newStatus);
    return finalLotId;
  };

  const handleSaveDraft = async () => {
    if (isCompleted) return;
    const savedId = await saveLotToDb(ACTIVE_STATUS);
    setModal({
      isOpen: true,
      type: 'alert',
      title: 'Thành công',
      message: 'Đã lưu nháp phiếu hoàn thiện.',
      onConfirm: () => {
        if (!lotId || lotId === 'new') {
          onNavigate('finishing-production-slip', { lotId: savedId, slipType: currentSlipType });
        }
      }
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
      message: 'Bạn có muốn lưu nháp phiếu hoàn thiện trước khi quay lại danh sách không?',
      cancelText: 'Không lưu',
      onCancel: () => onNavigate('lot-list'),
      onConfirm: async () => {
        await saveLotToDb(ACTIVE_STATUS);
        onNavigate('lot-list');
      }
    });
  };

  const handleCancelLot = () => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Xoá phiếu?',
      message: 'Bạn có chắc muốn huỷ và xoá phiếu hoàn thiện này không? Hành động này không thể hoàn tác.',
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

    const totalNeeded = selectedTargetProducts.reduce((sum, product) => sum + getProductRequiredQty(product, detailRows), 0);
    const totalCompleted = selectedTargetProducts.reduce((sum, product) => sum + getProductCompleteQty(product), 0);
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

    const nextSlipType = NEXT_FINISHING_SLIP[currentSlipType];
    if (nextSlipType) {
      const productIdsToHandoff = selectedTargetProducts
        .filter((product) => getProductHandoffRemaining(product, nextSlipType) > 0)
        .map((product) => product.id);

      if (productIdsToHandoff.length > 0) {
        openProductHandoffConfirm(nextSlipType, {
          mode: 'complete',
          productIds: productIdsToHandoff,
        });
        return;
      }
    }

    finalizeProduction();
  };

  const finalizeProduction = () => {
    // Validate that detail rows have at least some data
    const validProducts = selectedTargetProducts.filter(product => {
      const qty = getProductRequiredQty(product, detailRows);
      return qty > 0;
    });

    if (validProducts.length === 0) {
      setModal({
        isOpen: true,
        type: 'alert',
        title: 'Lỗi',
        message: 'Cần có ít nhất một sản phẩm với số lượng lớn hơn 0.'
      });
      return;
    }

    const incompleteProducts = validProducts.filter((product) => getProductCompleteQty(product) < getProductRequiredQty(product, detailRows));
    if (incompleteProducts.length > 0) {
      setModal({
        isOpen: true,
        type: 'alert',
        title: 'Không thể hoàn tất',
        message: `Còn ${incompleteProducts.length} sản phẩm chưa hoàn thành đủ số lượng.`
      });
      return;
    }

    setIsConfirmingProduction(true);
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Xác nhận hoàn tất',
      message: 'Xác nhận hoàn thành phiếu hoàn thiện? Tất cả sản phẩm đã hoàn thành đủ các công đoạn sẽ được nhập kho thành phẩm.',
      onCancel: () => setIsConfirmingProduction(false),
      onConfirm: async () => {
        try {
          const finalLotId = await saveLotToDb(COMPLETED_STATUS);
          
          // Check if inventory items have already been created for this lot
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

          // Create inventory from completed products.
          selectedTargetProducts.forEach(product => {
            const qty = Math.min(getProductCompleteQty(product), getProductRequiredQty(product, detailRows));
            if (qty <= 0) return;
            const productDimensions = getProductDimensions(product);

            newInventoryItems.push({
              name: product.name || slipConfig.inventoryName,
              product_id: product.id || null,
              thickness: productDimensions.thickness,
              width: productDimensions.width,
              length: productDimensions.length,
              quantity: qty,
              volume: getProductInventoryVolume(product, qty),
              type: slipConfig.inventoryType,
              stock_category: currentSlipType === 'PACKING' ? 'FINISHED_PRODUCT' : 'SEMI_PRODUCT',
              stock_status: NEXT_FINISHING_SLIP[currentSlipType] && getProductHandoffQty(product, NEXT_FINISHING_SLIP[currentSlipType]) >= qty
                ? 'allocated'
                : 'available',
              status: NEXT_FINISHING_SLIP[currentSlipType] && getProductHandoffQty(product, NEXT_FINISHING_SLIP[currentSlipType]) >= qty
                ? 'Đang dùng trong sản xuất'
                : 'Sẵn sàng',
              source_lot_id: finalLotId,
              wood_type: inheritedWoodType || product.name || slipConfig.inventoryName,
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

          // Update input inventory
          if (selectedInputs.length > 0) {
            await db.consumeInventoryForLot(finalLotId, selectedInputs);
          }

          if (newInventoryItems.length > 0) {
            await db.addInventory(newInventoryItems);
          }

          setModal({
            isOpen: true,
            type: 'alert',
            title: 'Thành công',
            message: currentSlipType === 'PACKING'
              ? 'Đã hoàn tất phiếu đóng gói và nhập kho thành phẩm.'
              : `Đã hoàn tất ${slipConfig.label.toLowerCase()}.`,
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
              className="h-8 rounded bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
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
                className="inline-flex h-9 items-center justify-center rounded bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
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

      {productHandoffConfirm.isOpen && confirmedProductHandoffConfig && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="flex max-h-[88vh] w-full max-w-[600px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
              <h3 className="font-semibold text-gray-800">
                {productHandoffConfirm.mode === 'complete' ? 'Xác nhận hoàn tất và giao công đoạn tiếp theo' : 'Xác nhận tạo phiếu giao'}
              </h3>
              <button
                type="button"
                onClick={() => setProductHandoffConfirm({ isOpen: false, toSlipType: null, mode: 'handoff', productIds: null })}
                className="text-gray-400 hover:text-gray-600"
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
                onClick={() => setProductHandoffConfirm({ isOpen: false, toSlipType: null, mode: 'handoff', productIds: null })}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={confirmedProductHandoffs.length === 0}
                onClick={() => {
                  const { toSlipType, mode, productIds } = productHandoffConfirm;
                  setProductHandoffConfirm({ isOpen: false, toSlipType: null, mode: 'handoff', productIds: null });
                  createProductHandoffSlip(toSlipType, {
                    productIds,
                    completeSource: mode === 'complete',
                  });
                }}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {productHandoffConfirm.mode === 'complete' ? 'Hoàn tất và tạo phiếu giao' : 'Tạo phiếu giao'}
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
                  className="px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isModalSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {modal.confirmText || 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

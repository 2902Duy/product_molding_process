import { useEffect, useState } from 'react';
import { db } from '../../../services/db';
import { FINISHING_SLIP_CONFIGS, FINISHING_STAGES } from '../constants/finishingStages';
import {
  createStageProgress as utilsCreateStageProgress,
  getFinalCompleted as utilsGetFinalCompleted,
  normalizeDetailRow as utilsNormalizeDetailRow,
  createDetailRow as utilsCreateDetailRow,
  createCustomRequestRow,
  shouldUseAutoLotName as utilsShouldUseAutoLotName,
  buildAutoLotName as utilsBuildAutoLotName,
  calculateRequestVolume,
  mergeTargetProducts as utilsMergeTargetProducts
} from '../../shared/utils/productionUtils';

const ACTIVE_STATUS = 'Đang sản xuất';
const COMPLETED_STATUS = 'Hoàn thành';
const DEFAULT_SLIP_TYPE = 'ASSEMBLY';

const safeStr = (v) => (v != null && typeof v === 'object' ? '' : (v ?? ''));
const safeArray = (value) => (Array.isArray(value) ? value : []);

const createStageProgress = (quantity = '', existingStages = [], legacyStageId = null, legacyCompleted = 0, stageOptions = FINISHING_STAGES) =>
  utilsCreateStageProgress(quantity, existingStages, legacyStageId, legacyCompleted, stageOptions);

const getFinalCompleted = utilsGetFinalCompleted;

const normalizeDetailRow = (row, stageOptions = FINISHING_STAGES) =>
  utilsNormalizeDetailRow(row, stageOptions);

const createDetailRow = (overrides = {}, stageOptions = FINISHING_STAGES) =>
  utilsCreateDetailRow(overrides, stageOptions, 'DETAIL-HT');

const shouldUseAutoLotName = (name, config) =>
  utilsShouldUseAutoLotName(name, config);

const buildAutoLotName = (products = [], config) =>
  utilsBuildAutoLotName(products, config);

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

const mergeTargetProducts = (existingProducts = [], incomingProducts = []) =>
  utilsMergeTargetProducts(existingProducts, incomingProducts, true);

export default function useFinishingSlip({ lotId, onNavigate, slipType = DEFAULT_SLIP_TYPE }) {
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

  // Inventory for molding
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
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 1500);
  };

  const closeModal = () => {
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
    const items = safeArray(product.items);

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
      }, processStages));
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
      }, processStages);
      setDetailRows([...detailRows, newDetailRow]);
    }
  };

  const handleToggleOrderSelection = (order) => {
    const orderProducts = safeArray(order.products).filter(product => !completedMoldingProductIds.has(product.id));
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
              semiFinishedName: p.name,
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
    showToast('Đã lưu nháp phiếu hoàn thiện!');
    if (!lotId || lotId === 'new') {
      setTimeout(() => {
        onNavigate('finishing-production-slip', { lotId: savedId, slipType: currentSlipType });
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
      message: 'Bạn có chắc chắn muốn xoá hoàn toàn phiếu nháp hoàn thiện này? Hành động này sẽ xoá sạch dữ liệu phiếu khỏi hệ thống và không thể hoàn tác.',
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

  return {
    currentSlipType, setCurrentSlipType,
    slipConfig,
    processStages,
    newLotId,
    lotName, setLotName,
    slipDate, setSlipDate,
    status, setStatus,
    description, setDescription,
    linkedHandoffMeta, setLinkedHandoffMeta,
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
    selectedProductHandoffIds, setSelectedProductHandoffIds,
    selectedInputHandoffLotIds, setSelectedInputHandoffLotIds,
    expandedHandoffLotId, setExpandedHandoffLotId,
    productHandoffConfirm, setProductHandoffConfirm,
    modal, setModal,
    isConfirmingProduction, setIsConfirmingProduction,
    closeModal,
    toast,
    isCompleted,
    moldingInventory,
    filteredInventory,
    groupedInventory,
    selectedProductIds,
    linkedHandoffQty,
    handoffLotsForCurrentSlip,
    availableHandoffLots,
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
    handleChangeDetailMeta,
    handleChangeDetailNumber,
    handleStageCompletedChange,
    handleSaveStageProgress,
    handleUndoStageProgress,
    handleCompleteRowsStages,
    handleCompleteProductStages,
    handleCompleteDetailStages,
    handleToggleDetailStage,
    handleApplyDetailStages,
    getProductCompleteQty,
    getProductHandoffRemaining,
    handleToggleProductHandoff,
    getProductsToHandoff,
    openProductHandoffConfirm,
    createProductHandoffSlip,
    getInputUsageError,
    saveLotToDb,
    handleSaveDraft,
    handleBackToList,
    handleCancelLot,
    handleConfirmProduction,
    finalizeProduction,
    getProductRequiredQty,
    getProductHandoffQty,
    NEXT_FINISHING_SLIP
  };
}

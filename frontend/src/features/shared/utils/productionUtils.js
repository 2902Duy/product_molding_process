/**
 * Các hàm tiện ích dùng chung cho các phiếu sản xuất định hình và hoàn thiện.
 */

export const createStageProgress = (quantity = '', existingStages = [], legacyStageId = null, legacyCompleted = 0, stageOptions = []) => {
  const required = Number(quantity) || 0;
  const normalizedExistingStages = Array.isArray(existingStages) ? existingStages : [];
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

export const getFinalCompleted = (row) => {
  const stages = Array.isArray(row.stages) ? row.stages : [];
  if (stages.length === 0) {
    return Number(row.quantity_completed) || 0;
  }

  return stages.reduce(
    (min, stage) => Math.min(min, Number(stage.completed) || 0),
    Number(row.quantity) || 0
  );
};

export const normalizeDetailRow = (row, stageOptions = []) => {
  const quantity = row.quantity ?? '';
  const legacyCompleted = Number(row.quantity_completed) || 0;
  const existingStages = Array.isArray(row.stages) ? row.stages : [];
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

export const createDetailRow = (overrides = {}, stageOptions = [], slipType = 'DETAIL-DH') => {
  return normalizeDetailRow({
    id: `${slipType}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
};

export const createCustomRequestRow = () => ({
  id: `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  woodType: '',
  thickness: '',
  width: '',
  length: '',
  quantity: '',
  reason: '',
  note: ''
});

export const getSelectedOrderCodes = (products = []) => {
  const codes = products.map((product) => product.orderName || product.orderId).filter(Boolean);
  return [...new Set(codes)];
};

export const shouldUseAutoLotName = (name, config = { defaultName: 'Phiếu định hình đơn hàng mới', autoNamePrefix: 'Phiếu định hình', legacyDefaultNames: [] }) => {
  const trimmed = String(name || '').trim();
  if (!trimmed) return true;
  if (trimmed.toLowerCase().startsWith('phiếu bổ sung')) return false;
  
  const defaultNames = [
    config.defaultName,
    'Phiếu hoàn thiện đơn hàng mới',
    'Phiếu định hình đơn hàng mới',
    ...(config.legacyDefaultNames || [])
  ];
  
  return defaultNames.some((defaultName) => trimmed === defaultName || trimmed.startsWith(`${config.autoNamePrefix} -`)) || 
         (config.legacyDefaultNames && config.legacyDefaultNames.some((defaultName) => trimmed.startsWith(`${defaultName} `)));
};

export const buildAutoLotName = (products = [], config = { defaultName: 'Phiếu định hình đơn hàng mới', autoNamePrefix: 'Phiếu định hình' }) => {
  const orderCodes = getSelectedOrderCodes(products);
  return orderCodes.length > 0
    ? `${config.autoNamePrefix} - ${orderCodes.join(', ')}`
    : config.defaultName;
};

export const calculateRequestVolume = (request) => {
  const thickness = Number(request.thickness) || 0;
  const width = Number(request.width) || 0;
  const length = Number(request.length) || 0;
  const quantity = Number(request.quantity) || 0;
  if (thickness <= 0 || width <= 0 || length <= 0 || quantity <= 0) return '';
  return Number(((thickness * width * length * quantity) / 1000000000).toFixed(4));
};

export const mergeTargetProducts = (existingProducts = [], incomingProducts = [], sumQuantity = false) => {
  const productMap = new Map(existingProducts.map((product) => [product.id, product]));

  incomingProducts.forEach((product) => {
    const existing = productMap.get(product.id);
    if (!existing) {
      productMap.set(product.id, product);
      return;
    }

    const existingQty = Number(existing.quantity_produce ?? existing.quantity) || 0;
    const incomingQty = Number(product.quantity_produce ?? product.quantity) || 0;
    const mergedQty = sumQuantity ? (existingQty + incomingQty) : Math.max(existingQty, incomingQty);
    productMap.set(product.id, {
      ...existing,
      ...product,
      quantity: mergedQty,
      quantity_produce: mergedQty,
      quantity_completed: Number(existing.quantity_completed) || 0,
      input_handoff_lot_ids: [
        ...new Set([...(existing.input_handoff_lot_ids || []), ...(product.input_handoff_lot_ids || [])])
      ],
    });
  });

  return [...productMap.values()];
};

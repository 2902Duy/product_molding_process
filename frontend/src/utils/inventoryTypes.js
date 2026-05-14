export const INVENTORY_TYPES = {
  RAW: 'RAW',
  SURPLUS: 'SURPLUS',
  SEMIFINISHED: 'SEMIFINISHED'
};

export const normalizeInventoryType = (itemOrType) => {
  const rawValue = typeof itemOrType === 'object'
    ? itemOrType?.type
    : itemOrType;
  const value = String(rawValue || '').trim().toUpperCase();

  if (
    value === INVENTORY_TYPES.RAW ||
    value === 'NL' ||
    value.includes('NGUYEN') ||
    value.includes('NGUYÊN') ||
    value.includes('LIEU') ||
    value.includes('LIỆU')
  ) {
    return INVENTORY_TYPES.RAW;
  }

  if (
    value === INVENTORY_TYPES.SURPLUS ||
    value.includes('SURPLUS') ||
    value.includes('DU') ||
    value.includes('DƯ')
  ) {
    return INVENTORY_TYPES.SURPLUS;
  }

  if (
    value === INVENTORY_TYPES.SEMIFINISHED ||
    value.includes('SEMI') ||
    value.includes('PHOI') ||
    value.includes('PHÔI')
  ) {
    return INVENTORY_TYPES.SEMIFINISHED;
  }

  return value || INVENTORY_TYPES.RAW;
};

export const getInventoryTypeLabel = (itemOrType) => {
  const type = normalizeInventoryType(itemOrType);
  if (type === INVENTORY_TYPES.RAW) return 'LÔ NL';
  if (type === INVENTORY_TYPES.SURPLUS) return 'LÔ DƯ';
  if (type === INVENTORY_TYPES.SEMIFINISHED) return 'PHÔI';
  return type;
};

export const isRawInventory = (itemOrType) => normalizeInventoryType(itemOrType) === INVENTORY_TYPES.RAW;

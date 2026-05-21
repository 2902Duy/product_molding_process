import { useEffect, useMemo, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, ChevronDown, ChevronRight, ClipboardCheck, GripVertical, Package, Plus, Save, Settings, Trash2, X } from 'lucide-react';
import { MOLDING_STAGES } from '../constants/moldingStages';

const clampPercent = (value) => Math.max(0, Math.min(100, value));

const getRowStages = (row) => Array.isArray(row.stages) ? row.stages : [];

const getStageCompleted = (stage) => Number(stage?.completed) || 0;

const getStageRequired = (row, stage) => Number(stage?.required ?? row.quantity) || 0;

const getFinalCompleted = (row) => {
  const stages = getRowStages(row);
  if (stages.length === 0) return Number(row.quantity_completed) || 0;
  return stages.reduce((min, stage) => Math.min(min, getStageCompleted(stage)), Number(row.quantity) || 0);
};

const getStageCapacity = (row, stageId) => {
  const stages = getRowStages(row);
  const stageIndex = stages.findIndex((stage) => stage.id === stageId);
  const stage = stages[stageIndex];
  if (!stage) return null;

  const required = getStageRequired(row, stage);
  const completed = getStageCompleted(stage);
  const available = required;

  return {
    stage,
    required,
    completed,
    remaining: Math.max(0, available - completed)
  };
};

const getRowStageProgress = (row) => {
  const stages = getRowStages(row);
  if (stages.length === 0) return 0;

  const totalRequired = stages.reduce((sum, stage) => sum + getStageRequired(row, stage), 0);
  const totalCompleted = stages.reduce((sum, stage) => {
    return sum + Math.min(getStageRequired(row, stage), getStageCompleted(stage));
  }, 0);

  return totalRequired > 0 ? clampPercent(Math.round((totalCompleted / totalRequired) * 100)) : 0;
};

const getLockedStageIds = (row) => {
  const stages = getRowStages(row);
  return stages
    .filter((stage, index) => stages
      .slice(index)
      .some((item) => getStageCompleted(item) > 0))
    .map((stage) => stage.id);
};

function SortableStagePill({ stage, locked, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: stage.id, disabled: locked });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`inline-flex h-9 items-center gap-1.5 rounded border px-2 text-xs font-semibold ${
        isDragging ? 'z-10 border-emerald-300 bg-emerald-50 shadow-lg' : 'border-emerald-200 bg-white text-slate-800'
      }`}
    >
      <button
        type="button"
        className={`text-slate-400 ${locked ? 'cursor-not-allowed opacity-40' : 'cursor-grab active:cursor-grabbing'}`}
        title={locked ? 'Công đoạn đã có tiến độ' : 'Kéo để đổi thứ tự'}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <span>{stage.name}</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={locked}
        className={`rounded p-0.5 transition-colors ${
          locked
            ? "text-slate-200 cursor-not-allowed"
            : "text-slate-400 hover:bg-red-50 hover:text-red-500 cursor-pointer"
        }`}
        title={locked ? 'Không thể bỏ công đoạn đã có tiến độ' : 'Bỏ công đoạn'}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export default function MoldingDetailTable({
  detailRows = [],
  disabled = false,
  stageOptions = MOLDING_STAGES,
  selectedStageId,
  stageTickets = [],
  onRemoveRow,
  onStageCompletedChange,
  onStageChange,
  onSaveStageProgress,
  onCompleteProductStages,
  onCompleteDetailStages,
  onApplyStages,
  selectedHandoffRowIds = [],
  onToggleHandoffRow,
  getHandoffRemaining,
  onCreateHandoffSlip
}) {
  const processStages = stageOptions.length > 0 ? stageOptions : MOLDING_STAGES;
  const [expandedProducts, setExpandedProducts] = useState({});
  const [entryQuantities, setEntryQuantities] = useState({});
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configStageIds, setConfigStageIds] = useState([]);
  const [configRows, setConfigRows] = useState([]);
  const [configProductName, setConfigProductName] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    setEntryQuantities({});
  }, [selectedStageId, detailRows]);

  const visibleDetailRows = detailRows.filter((row) => getStageCapacity(row, selectedStageId));

  const groupedByProduct = visibleDetailRows.reduce((acc, row) => {
    const key = row.productId || 'no-product';
    if (!acc[key]) {
      acc[key] = {
        productName: row.productName || 'Sản phẩm tự do',
        productCode: row.productCode || row.productId || '',
        productId: row.productId,
        items: []
      };
    }
    acc[key].items.push(row);
    return acc;
  }, {});

  const productGroups = Object.values(groupedByProduct);
  const selectedStage = processStages.find((stage) => stage.id === selectedStageId) || processStages[0];
  const selectedHandoffSet = new Set(selectedHandoffRowIds);

  const saveEntries = useMemo(() => {
    return Object.entries(entryQuantities)
      .map(([rowId, quantity]) => ({ rowId, quantity: Number(quantity) || 0 }))
      .filter((entry) => entry.quantity > 0);
  }, [entryQuantities]);

  const selectedStageRows = detailRows
    .map((row) => ({ row, capacity: getStageCapacity(row, selectedStage.id) }))
    .filter((item) => item.capacity);
  const canCompleteSelectedStage = selectedStageRows.some(({ capacity }) => capacity.remaining > 0);

  const totalQtyNeeded = detailRows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  const totalQtyCompleted = detailRows.reduce((sum, row) => sum + getFinalCompleted(row), 0);
  const totalStageUnits = detailRows.reduce((sum, row) => {
    return sum + getRowStages(row).reduce((stageSum, stage) => stageSum + getStageRequired(row, stage), 0);
  }, 0);
  const completedStageUnits = detailRows.reduce((sum, row) => {
    return sum + getRowStages(row).reduce((stageSum, stage) => {
      return stageSum + Math.min(getStageRequired(row, stage), getStageCompleted(stage));
    }, 0);
  }, 0);
  const totalProgress = totalStageUnits > 0
    ? clampPercent(Math.round((completedStageUnits / totalStageUnits) * 100))
    : 0;

  const handleEntryChange = (rowId, value, max) => {
    if (value === '') {
      setEntryQuantities((prev) => ({ ...prev, [rowId]: '' }));
      return;
    }

    const nextValue = Math.max(0, Math.min(Number(value) || 0, max));
    setEntryQuantities((prev) => ({ ...prev, [rowId]: nextValue }));
  };

  const handleSave = () => {
    if (selectedStageRows.length === 0) {
      alert('Không có chi tiết nào áp dụng công đoạn này.');
      return;
    }

    if (saveEntries.length === 0) return;
    onSaveStageProgress(selectedStage.id, saveEntries);
    setEntryQuantities({});
  };

  const handleEntryKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    if (saveEntries.length === 0) return;
    onSaveStageProgress(selectedStage.id, saveEntries);
    setEntryQuantities({});
  };

  const handleToggleProductExpand = (productId) => {
    setExpandedProducts(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  const openConfigModal = (rows = visibleDetailRows, productName = '') => {
    if (rows.length === 0) return;

    setConfigRows(rows);
    setConfigProductName(productName);
    setConfigStageIds(rows.reduce((acc, row) => {
      acc[row.id] = getRowStages(row).map((stage) => stage.id);
      return acc;
    }, {}));
    setConfigModalOpen(true);
  };

  const handleConfigStageToggle = (rowId, stageId) => {
    setConfigStageIds((prev) => {
      const rowStageIds = prev[rowId] || [];
      return {
        ...prev,
        [rowId]: rowStageIds.includes(stageId)
          ? rowStageIds.filter((id) => id !== stageId)
          : [...rowStageIds, stageId]
      };
    });
  };

  const handleAddConfigStage = (rowId, stageId) => {
    setConfigStageIds((prev) => {
      const rowStageIds = prev[rowId] || [];
      if (rowStageIds.includes(stageId)) return prev;
      return {
        ...prev,
        [rowId]: [...rowStageIds, stageId]
      };
    });
  };

  const handleRemoveConfigStage = (rowId, stageId) => {
    const row = configRows.find((item) => item.id === rowId);
    if (row && getLockedStageIds(row).includes(stageId)) return;

    setConfigStageIds((prev) => ({
      ...prev,
      [rowId]: (prev[rowId] || []).filter((id) => id !== stageId)
    }));
  };

  const handleConfigStageDragEnd = (row, event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const lockedIds = getLockedStageIds(row);
    if (lockedIds.includes(active.id) || lockedIds.includes(over.id)) return;

    setConfigStageIds((prev) => {
      const rowStageIds = prev[row.id] || [];
      const oldIndex = rowStageIds.indexOf(active.id);
      const newIndex = rowStageIds.indexOf(over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;

      return {
        ...prev,
        [row.id]: arrayMove(rowStageIds, oldIndex, newIndex)
      };
    });
  };

  const handleConfigStageColumnToggle = (stageId) => {
    setConfigStageIds((prev) => {
      const selectableRows = configRows.filter((row) => !getLockedStageIds(row).includes(stageId));
      const allSelected = selectableRows.length > 0 && selectableRows.every((row) => (prev[row.id] || []).includes(stageId));

      return configRows.reduce((acc, row) => {
        const rowStageIds = prev[row.id] || [];
        const locked = getLockedStageIds(row).includes(stageId);

        if (locked) {
          acc[row.id] = rowStageIds.includes(stageId) ? rowStageIds : [...rowStageIds, stageId];
          return acc;
        }

        acc[row.id] = allSelected
          ? rowStageIds.filter((id) => id !== stageId)
          : Array.from(new Set([...rowStageIds, stageId]));
        return acc;
      }, {});
    });
  };

  const handleApplyConfig = () => {
    const invalidRow = configRows.find((row) => (configStageIds[row.id] || []).length === 0);
    if (invalidRow) {
      alert('Mỗi chi tiết phải có ít nhất một công đoạn.');
      return;
    }

    onApplyStages?.(configStageIds);
    setConfigModalOpen(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" />
            Phiếu ghi nhận công đoạn
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedStage.id}
              onChange={(event) => onStageChange(event.target.value)}
              disabled={disabled}
              className="h-9 rounded border border-slate-200 bg-white px-3 text-sm font-medium text-gray-800 focus:outline-none focus:border-emerald-400 disabled:bg-gray-100"
            >
              {processStages.map((stage) => (
                <option key={stage.id} value={stage.id}>{stage.name}</option>
              ))}
            </select>
            <button
              onClick={handleSave}
              disabled={disabled || !canCompleteSelectedStage || saveEntries.length === 0}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] ${
                disabled || !canCompleteSelectedStage || saveEntries.length === 0
                  ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none scale-100"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
              }`}
            >
              <Save className="h-4 w-4" />
              Hoàn thành công đoạn
            </button>
          </div>
        </div>

        <div className="mt-3 bg-white rounded-lg p-3 border border-slate-200">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-gray-600">Tiến độ toàn bộ định hình:</span>
            <span className="font-bold text-emerald-700">
              {totalQtyCompleted} / {totalQtyNeeded} cái hoàn tất định hình
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>

        {stageTickets.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {stageTickets.slice(-4).reverse().map((ticket) => {
              const stage = processStages.find((item) => item.id === ticket.stageId);
              const total = ticket.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

              return (
                <div key={ticket.id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-gray-600">
                  <ClipboardCheck className="h-3 w-3 text-emerald-600" />
                  <span className="font-medium text-gray-800">{stage?.name || ticket.stageId}</span>
                  <span>{total} cái</span>
                  <span className="text-gray-400">{ticket.date}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4">
        {detailRows.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            Chưa có chi tiết nào. Chọn sản phẩm từ đơn hàng để tạo danh sách chi tiết.
          </div>
        ) : visibleDetailRows.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            Không có chi tiết nào áp dụng công đoạn này.
          </div>
        ) : (
          <div className="space-y-4">
            {productGroups.map((group) => {
              const isExpanded = expandedProducts[group.productId] !== false;
              const totalNeeded = group.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
              const totalCompleted = group.items.reduce((sum, item) => sum + getFinalCompleted(item), 0);
              const productProgress = totalNeeded > 0 ? clampPercent(Math.round((totalCompleted / totalNeeded) * 100)) : 0;
              const isAllCompleted = totalNeeded > 0 && totalCompleted >= totalNeeded;

              return (
                <div key={group.productId || 'no-product'} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${
                      isAllCompleted ? 'bg-emerald-50' : 'bg-slate-50'
                    }`}
                    onClick={() => handleToggleProductExpand(group.productId)}
                  >
                    <button className="text-slate-500">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                          SẢN PHẨM
                        </span>
                        <span className="font-semibold text-gray-800 truncate">
                          {group.productCode && group.productName !== group.productCode
                            ? `${group.productCode} - ${group.productName}`
                            : group.productName}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {totalCompleted} / {totalNeeded} cái hoàn tất
                    </div>
                    <div className="w-24 bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${isAllCompleted ? 'bg-emerald-500' : 'bg-slate-400'}`}
                        style={{ width: `${productProgress}%` }}
                      />
                    </div>
                    {!disabled && !isAllCompleted && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onCompleteProductStages?.(group.productId);
                        }}
                        className="inline-flex h-8 items-center gap-1.5 rounded border border-emerald-200 bg-white px-2.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
                        title="Hoàn thành nhanh sản phẩm này"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Hoàn tất SP
                      </button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-200">
                      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-white px-4 py-2">
                        <span className="mr-1 text-[11px] font-semibold text-slate-500">Lọc nhanh:</span>
                        {processStages.map((stage) => {
                          const active = stage.id === selectedStage.id;
                          const count = group.items.filter((row) => getStageCapacity(row, stage.id)).length;

                          if (count === 0) return null;

                          return (
                            <button
                              key={stage.id}
                              type="button"
                              onClick={() => onStageChange(stage.id)}
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                active
                                  ? 'border-sky-200 bg-sky-50 text-sky-700'
                                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              <span>{stage.name}</span>
                              <span className="text-slate-400">({count})</span>
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => openConfigModal(group.items, group.productName)}
                          disabled={disabled}
                          className={`ml-auto inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-medium transition-all active:scale-[0.98] ${
                            disabled
                              ? "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 cursor-pointer"
                          }`}
                        >
                          <Settings className="h-3.5 w-3.5" />
                          Cài công đoạn
                        </button>
                      </div>
                      <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-slate-100 text-xs font-medium text-slate-600 sticky top-0 z-10">
                        <div className="col-span-4">Tên chi tiết</div>
                        <div className="col-span-2 text-center">Dày x Rộng x Dài</div>
                        <div className="col-span-1 text-center">Định mức</div>
                        <div className="col-span-1 text-center">Cần</div>
                        <div className="col-span-1 text-center">Đã xong</div>
                        <div className="col-span-1 text-center">Đã làm CĐ này</div>
                        <div className="col-span-1 text-center">Lần này</div>
                        <div className="col-span-1 text-center"></div>
                      </div>

                      <div className="max-h-[560px] overflow-y-auto">
                      {group.items.map((row) => {
                        const capacity = getStageCapacity(row, selectedStage.id);
                        const qtyNeeded = Number(row.quantity) || 0;
                        const finalCompleted = getFinalCompleted(row);
                        const baseQty = row.base_quantity || 1;
                        const unitQty = qtyNeeded > 0 ? Math.round(qtyNeeded / baseQty) : 0;
                        const isDone = qtyNeeded > 0 && finalCompleted >= qtyNeeded;
                        const entryValue = entryQuantities[row.id] ?? '';
                        const handoffRemaining = getHandoffRemaining ? getHandoffRemaining(row) : 0;
                        const hasHandoff = (row.handoffRecords || []).some((record) => (Number(record.quantity) || 0) > 0);
                        const canSelectHandoff = Boolean(onToggleHandoffRow) && handoffRemaining > 0;
                        const rowLocked = disabled || hasHandoff;

                        return (
                          <div key={row.id} className={isDone ? 'bg-emerald-50' : 'bg-white'}>
                            <div className="grid grid-cols-12 gap-3 px-4 py-2 items-center border-b border-slate-100 hover:bg-slate-50/70">
                              <div className="col-span-4">
                                <div className="flex items-center gap-2">
                                  {onToggleHandoffRow && (
                                    <input
                                      type="checkbox"
                                      checked={selectedHandoffSet.has(row.id)}
                                      disabled={!canSelectHandoff}
                                      onChange={() => onToggleHandoffRow(row.id)}
                                      className="h-4 w-4 shrink-0 accent-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                                      title={canSelectHandoff ? `Còn ${handoffRemaining} cái có thể tạo phiếu giao` : 'Đã tạo phiếu giao đủ số lượng'}
                                    />
                                  )}
                                  <div className={`min-w-0 flex-1 px-2 py-1.5 text-xs border rounded truncate ${
                                    row.semiFinishedName ? 'border-emerald-200 bg-emerald-50 text-emerald-800 font-medium' : 'border-slate-200 bg-white text-gray-500'
                                  }`}>
                                    {row.semiFinishedName || 'Chi tiết'}
                                  </div>
                                </div>
                              </div>

                              <div className="col-span-2 text-center text-xs tabular-nums text-slate-700">
                                {row.thickness || '-'} <span className="text-slate-400">x</span> {row.width || '-'} <span className="text-slate-400">x</span> {row.length || '-'}
                              </div>

                              <div className="col-span-1 text-center text-xs text-gray-600">{unitQty}</div>

                              <div className="col-span-1 text-center text-xs font-semibold tabular-nums text-slate-700">
                                {row.quantity || 0}
                              </div>

                              <div className="col-span-1 text-center">
                                <div className={`text-xs font-semibold tabular-nums ${isDone ? 'text-emerald-700' : 'text-slate-600'}`}>
                                  {finalCompleted}
                                </div>
                              </div>

                              {capacity ? (
                                <>
                                  <div className="col-span-1">
                                    <input
                                      type="number"
                                      min="0"
                                      max={capacity.required}
                                      value={capacity.completed}
                                      onChange={(e) => onStageCompletedChange?.(row.id, selectedStage.id, e.target.value)}
                                      disabled={rowLocked}
                                      className="w-full px-1 py-1.5 text-xs border border-slate-200 rounded text-center font-semibold text-slate-700 focus:outline-none focus:border-emerald-400 disabled:bg-gray-100 disabled:text-gray-400"
                                      title={hasHandoff ? 'Dòng này đã tạo phiếu giao nên không thể sửa tiến độ.' : undefined}
                                    />
                                  </div>
                                  <div className="col-span-1">
                                    <input
                                      type="number"
                                      min="0"
                                      max={capacity.remaining}
                                      value={entryValue}
                                      onChange={(e) => handleEntryChange(row.id, e.target.value, capacity.remaining)}
                                      onKeyDown={handleEntryKeyDown}
                                      disabled={rowLocked || capacity.remaining <= 0}
                                      placeholder={capacity.remaining > 0 ? String(capacity.remaining) : '0'}
                                      className="w-full px-1 py-1.5 text-xs border border-sky-200 rounded text-center font-semibold text-sky-700 focus:outline-none focus:border-sky-500 disabled:bg-gray-100 disabled:text-gray-400"
                                      title={hasHandoff ? 'Dòng này đã tạo phiếu giao nên không thể sửa tiến độ.' : undefined}
                                    />
                                  </div>
                                </>
                              ) : (
                                <div className="col-span-2 text-center text-xs text-gray-400">
                                  Không áp dụng công đoạn này
                                </div>
                              )}

                              <div className="col-span-1 flex justify-center gap-1">
                                {!rowLocked && !isDone && (
                                  <button
                                    type="button"
                                    onClick={() => onCompleteDetailStages?.(row.id)}
                                    className="p-1.5 text-gray-400 hover:text-emerald-600 transition"
                                    title="Hoàn thành nhanh chi tiết này"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {!rowLocked && !isDone && (
                                  <button
                                    onClick={() => onRemoveRow(row.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 transition"
                                    title="Xóa chi tiết"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {onCreateHandoffSlip && (
              <div className="flex justify-end border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={onCreateHandoffSlip}
                  disabled={disabled || selectedHandoffRowIds.length === 0}
                  className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] ${
                    disabled || selectedHandoffRowIds.length === 0
                      ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none scale-100"
                      : "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                  }`}
                >
                  <Check className="h-4 w-4" />
                  Tạo phiếu giao
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {configModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[88vh] w-full max-w-5xl flex-col rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Bảng điều khiển công đoạn</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {configProductName ? `Sản phẩm: ${configProductName}` : 'Chỉnh công đoạn áp dụng cho từng chi tiết.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfigModalOpen(false)}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 overflow-auto px-4 py-4">
              <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 text-[11px] font-semibold uppercase text-slate-500">Bật/tắt công đoạn cho toàn bộ chi tiết</div>
                <div className="flex flex-wrap gap-2">
                  {processStages.map((stage) => {
                    const selectableRows = configRows.filter((row) => !getLockedStageIds(row).includes(stage.id));
                    const allSelected = selectableRows.length > 0 && selectableRows.every((row) => (configStageIds[row.id] || []).includes(stage.id));

                    return (
                      <label
                        key={stage.id}
                        className={`inline-flex h-8 items-center gap-1.5 rounded border px-2 text-[11px] font-semibold ${
                          allSelected
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white text-slate-600'
                        } ${selectableRows.length === 0 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-slate-100'}`}
                      >
                        <input
                          type="checkbox"
                          checked={allSelected}
                          disabled={selectableRows.length === 0}
                          onChange={() => handleConfigStageColumnToggle(stage.id)}
                          className="h-3.5 w-3.5 accent-emerald-500 disabled:cursor-not-allowed"
                        />
                        <span>{stage.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                {configRows.map((row) => {
                  const rowStageIds = configStageIds[row.id] || [];
                  const selectedStages = rowStageIds
                    .map((stageId) => processStages.find((stage) => stage.id === stageId) || getRowStages(row).find((stage) => stage.id === stageId))
                    .filter(Boolean);
                  const availableStages = processStages.filter((stage) => !rowStageIds.includes(stage.id));
                  const lockedIds = getLockedStageIds(row);
                  const rowProgress = getRowStageProgress(row);

                  return (
                    <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-800">{row.semiFinishedName || 'Chi tiết'}</div>
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            {row.thickness || '-'} x {row.width || '-'} x {row.length || '-'} · Cần {row.quantity || 0}
                          </div>
                        </div>
                        <div className="min-w-28 rounded bg-slate-50 px-2 py-1 text-center text-xs font-semibold text-slate-600">
                          Tiến độ {rowProgress}%
                        </div>
                      </div>

                      <div className="rounded border border-emerald-100 bg-emerald-50/40 p-2">
                        <div className="mb-2 text-[11px] font-semibold uppercase text-emerald-700">Quy trình sản phẩm</div>
                        {selectedStages.length > 0 ? (
                          <DndContext sensors={sensors} onDragEnd={(event) => handleConfigStageDragEnd(row, event)}>
                            <SortableContext items={rowStageIds} strategy={rectSortingStrategy}>
                              <div className="flex min-h-10 flex-wrap gap-2">
                                {selectedStages.map((stage) => (
                                  <SortableStagePill
                                    key={stage.id}
                                    stage={stage}
                                    locked={lockedIds.includes(stage.id)}
                                    onRemove={() => handleRemoveConfigStage(row.id, stage.id)}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        ) : (
                          <div className="rounded border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-400">
                            Chưa chọn công đoạn.
                          </div>
                        )}
                      </div>

                      {availableStages.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {availableStages.map((stage) => (
                            <button
                              key={stage.id}
                              type="button"
                              onClick={() => handleAddConfigStage(row.id, stage.id)}
                              className="inline-flex h-8 items-center gap-1 rounded border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                            >
                              <Plus className="h-3 w-3" />
                              {stage.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="hidden min-w-[820px] overflow-hidden rounded border border-slate-200">
                <div className="grid grid-cols-[minmax(260px,1.6fr)_repeat(4,minmax(130px,1fr))_80px] bg-slate-100 text-[11px] font-semibold text-slate-600">
                  <div className="px-3 py-2">Chi tiết</div>
                  {processStages.map((stage) => {
                    const selectableRows = configRows.filter((row) => !getLockedStageIds(row).includes(stage.id));
                    const allSelected = selectableRows.length > 0 && selectableRows.every((row) => (configStageIds[row.id] || []).includes(stage.id));

                    return (
                      <label key={stage.id} className="flex items-center justify-center gap-2 px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          disabled={selectableRows.length === 0}
                          onChange={() => handleConfigStageColumnToggle(stage.id)}
                          className="h-3.5 w-3.5 accent-emerald-500 disabled:cursor-not-allowed"
                        />
                        <span>{stage.name}</span>
                      </label>
                    );
                  })}
                  <div className="px-2 py-2 text-center">Tiến độ</div>
                </div>

                {configRows.map((row) => {
                  const rowStageIds = configStageIds[row.id] || [];
                  const stages = getRowStages(row);
                  const lockedIds = getLockedStageIds(row);
                  const rowProgress = getRowStageProgress(row);

                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-[minmax(260px,1.6fr)_repeat(4,minmax(130px,1fr))_80px] items-center border-t border-slate-100 bg-white text-xs"
                    >
                      <div className="px-3 py-2">
                        <div className="font-semibold text-slate-800">{row.semiFinishedName || 'Chi tiết'}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {row.thickness || '-'} x {row.width || '-'} x {row.length || '-'} · Cần {row.quantity || 0}
                        </div>
                      </div>

                      {processStages.map((stageMeta) => {
                        const selected = rowStageIds.includes(stageMeta.id);
                        const existing = stages.find((stage) => stage.id === stageMeta.id);
                        const locked = lockedIds.includes(stageMeta.id);
                        const completed = getStageCompleted(existing);
                        const required = existing ? getStageRequired(row, existing) : Number(row.quantity) || 0;

                        return (
                          <label
                            key={stageMeta.id}
                            className={`mx-2 my-1.5 flex min-h-12 items-center gap-2 rounded border px-2 py-1.5 ${
                              selected ? 'border-emerald-200 bg-emerald-50 text-slate-800' : 'border-slate-200 bg-white text-slate-500'
                            } ${locked ? 'opacity-80' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled={locked}
                              onChange={() => handleConfigStageToggle(row.id, stageMeta.id)}
                              className="h-4 w-4 accent-emerald-500 disabled:cursor-not-allowed"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">{selected ? 'Áp dụng' : 'Bỏ qua'}</div>
                              <div className="text-[10px] text-slate-500">{completed}/{required}</div>
                            </div>
                          </label>
                        );
                      })}

                      <div className="px-2 py-2 text-center font-semibold text-slate-600">{rowProgress}%</div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Công đoạn đã có tiến độ sẽ được giữ lại để không mất dữ liệu đã ghi nhận.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <button
                type="button"
                onClick={() => setConfigModalOpen(false)}
                className="h-9 rounded border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApplyConfig}
                className="h-9 rounded bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

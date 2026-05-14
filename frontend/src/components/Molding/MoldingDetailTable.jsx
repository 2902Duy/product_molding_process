import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, ClipboardCheck, Package, Save, Settings, Trash2 } from 'lucide-react';
import { MOLDING_STAGES } from '../../constants/moldingStages';

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
  const previousCompleted = stageIndex === 0
    ? Number(row.quantity) || 0
    : getStageCompleted(stages[stageIndex - 1]);
  const completed = getStageCompleted(stage);
  const available = required;

  return {
    stage,
    required,
    completed,
    previousCompleted,
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

export default function MoldingDetailTable({
  detailRows = [],
  disabled = false,
  selectedStageId,
  stageTickets = [],
  onAddRow,
  onRemoveRow,
  onRowChange,
  onStageChange,
  onSaveStageProgress,
  onCompleteAllStages,
  onToggleStage
}) {
  const [expandedProducts, setExpandedProducts] = useState({});
  const [entryQuantities, setEntryQuantities] = useState({});
  const [configuringRowId, setConfiguringRowId] = useState(null);

  useEffect(() => {
    setEntryQuantities({});
  }, [selectedStageId, detailRows]);

  const groupedByProduct = detailRows.reduce((acc, row) => {
    const key = row.productId || 'no-product';
    if (!acc[key]) {
      acc[key] = {
        productName: row.productName || 'Sản phẩm tự do',
        productId: row.productId,
        items: []
      };
    }
    acc[key].items.push(row);
    return acc;
  }, {});

  const productGroups = Object.values(groupedByProduct);
  const selectedStage = MOLDING_STAGES.find((stage) => stage.id === selectedStageId) || MOLDING_STAGES[0];

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

  const handleToggleProductExpand = (productId) => {
    setExpandedProducts(prev => ({ ...prev, [productId]: !prev[productId] }));
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
              {MOLDING_STAGES.map((stage) => (
                <option key={stage.id} value={stage.id}>{stage.name}</option>
              ))}
            </select>
            <button
              onClick={handleSave}
              disabled={disabled || !canCompleteSelectedStage || saveEntries.length === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save className="h-4 w-4" />
              Hoàn thành công đoạn
            </button>
            <button
              onClick={onCompleteAllStages}
              disabled={disabled || totalStageUnits === 0 || completedStageUnits >= totalStageUnits}
              className="inline-flex h-9 items-center gap-1.5 rounded bg-slate-700 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              Hoàn thành nhanh
            </button>
            <button
              onClick={onAddRow}
              disabled={disabled}
              className="inline-flex h-9 items-center gap-1.5 rounded border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Thêm chi tiết
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
              const stage = MOLDING_STAGES.find((item) => item.id === ticket.stageId);
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
            Chưa có chi tiết nào. Chọn sản phẩm từ đơn hàng hoặc bấm "Thêm chi tiết" để tạo.
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
                        <span className="font-semibold text-gray-800 truncate">{group.productName}</span>
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
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-200">
                      <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-100 text-xs font-medium text-slate-600 sticky top-0 z-10">
                        <div className="col-span-3">Tên chi tiết</div>
                        <div className="col-span-2 text-center">Dày x Rộng x Dài</div>
                        <div className="col-span-1 text-center">Định mức</div>
                        <div className="col-span-1 text-center">Cần</div>
                        <div className="col-span-1 text-center">Đã xong</div>
                        <div className="col-span-1 text-center">Công đoạn trước</div>
                        <div className="col-span-1 text-center">Đã làm CĐ này</div>
                        <div className="col-span-1 text-center">Lần này</div>
                        <div className="col-span-1 text-center"></div>
                      </div>

                      <div className="max-h-[560px] overflow-y-auto">
                      {group.items.map((row) => {
                        const capacity = getStageCapacity(row, selectedStage.id);
                        const stages = getRowStages(row);
                        const qtyNeeded = Number(row.quantity) || 0;
                        const finalCompleted = getFinalCompleted(row);
                        const rowProgress = getRowStageProgress(row);
                        const baseQty = row.base_quantity || 1;
                        const unitQty = qtyNeeded > 0 ? Math.round(qtyNeeded / baseQty) : 0;
                        const isDone = qtyNeeded > 0 && finalCompleted >= qtyNeeded;
                        const entryValue = entryQuantities[row.id] ?? '';

                        return (
                          <div key={row.id} className={isDone ? 'bg-emerald-50' : 'bg-white'}>
                            <div className="grid grid-cols-12 gap-2 px-4 py-1.5 items-center border-b border-slate-100 hover:bg-slate-50/70">
                              <div className="col-span-3">
                                <div className={`px-2 py-1.5 text-xs border rounded truncate ${
                                  row.semiFinishedName ? 'border-emerald-200 bg-emerald-50 text-emerald-800 font-medium' : 'border-slate-200 bg-white text-gray-500'
                                }`}>
                                  {row.semiFinishedName || 'Chi tiết'}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {stages.map((stage, stageIndex) => {
                                    const completed = getStageCompleted(stage);
                                    const required = getStageRequired(row, stage);
                                    const complete = required > 0 && completed >= required;
                                    const active = stage.id === selectedStage.id;

                                    return (
                                      <button
                                        type="button"
                                        key={stage.id}
                                        onClick={() => onStageChange(stage.id)}
                                        className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] ${
                                          complete
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : active
                                              ? 'border-sky-200 bg-sky-50 text-sky-700'
                                              : 'border-slate-200 bg-slate-50 text-slate-500'
                                        }`}
                                        title="Bam de ghi nhan cong doan nay"
                                      >
                                        {complete && <Check className="h-2.5 w-2.5" />}
                                        <span className="font-semibold">B{stageIndex + 1}</span>
                                        <span>{completed}/{required}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="col-span-2 flex justify-center gap-1">
                                <div className="w-8 px-1 py-1.5 text-xs border border-gray-200 rounded text-center bg-gray-50 text-gray-600">
                                  {row.thickness || '-'}
                                </div>
                                <span className="text-xs text-gray-400 self-center">x</span>
                                <div className="w-8 px-1 py-1.5 text-xs border border-gray-200 rounded text-center bg-gray-50 text-gray-600">
                                  {row.width || '-'}
                                </div>
                                <span className="text-xs text-gray-400 self-center">x</span>
                                <div className="w-10 px-1 py-1.5 text-xs border border-gray-200 rounded text-center bg-gray-50 text-gray-600">
                                  {row.length || '-'}
                                </div>
                              </div>

                              <div className="col-span-1 text-center text-xs text-gray-600">{unitQty}</div>

                              <div className="col-span-1">
                                <input
                                  type="number"
                                  value={row.quantity}
                                  onChange={(e) => onRowChange(row.id, 'quantity', e.target.value)}
                                  disabled={disabled || isDone}
                                  className="w-full px-1 py-1.5 text-xs border border-slate-200 rounded text-center focus:outline-none focus:border-emerald-400 disabled:bg-gray-100"
                                  min="0"
                                />
                              </div>

                              <div className="col-span-1 text-center">
                                <div className={`px-1 py-1.5 text-xs border rounded font-semibold ${
                                  isDone ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-600'
                                }`}>
                                  {finalCompleted}
                                </div>
                              </div>

                              {capacity ? (
                                <>
                                  <div className="col-span-1 text-center text-xs tabular-nums text-gray-600">
                                    {capacity.previousCompleted}
                                  </div>
                                  <div className="col-span-1 text-center text-xs tabular-nums text-gray-600">
                                    {capacity.completed}/{capacity.required}
                                  </div>
                                  <div className="col-span-1">
                                    <input
                                      type="number"
                                      min="0"
                                      max={capacity.remaining}
                                      value={entryValue}
                                      onChange={(e) => handleEntryChange(row.id, e.target.value, capacity.remaining)}
                                      disabled={disabled || capacity.remaining <= 0}
                                      placeholder={capacity.remaining > 0 ? String(capacity.remaining) : '0'}
                                      className="w-full px-1 py-1.5 text-xs border border-sky-200 rounded text-center font-semibold text-sky-700 focus:outline-none focus:border-sky-500 disabled:bg-gray-100 disabled:text-gray-400"
                                    />
                                  </div>
                                </>
                              ) : (
                                <div className="col-span-3 text-center text-xs text-gray-400">
                                  Không áp dụng công đoạn này
                                </div>
                              )}

                              <div className="col-span-1 flex justify-center gap-1">
                                {!disabled && (
                                  <button
                                    type="button"
                                    onClick={() => setConfiguringRowId(configuringRowId === row.id ? null : row.id)}
                                    className="p-1.5 text-gray-400 hover:text-sky-600 transition"
                                    title="Cấu hình công đoạn áp dụng"
                                  >
                                    <Settings className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {!disabled && !isDone && (
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

                            <div className={configuringRowId === row.id ? 'px-4 py-2' : 'hidden'}>
                              {configuringRowId === row.id && (
                                <div className="mb-2 rounded border border-slate-200 bg-slate-50 p-2">
                                  <div className="mb-1 text-[11px] font-semibold text-slate-700">
                                    Chọn công đoạn bắt buộc cho chi tiết này
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                    {MOLDING_STAGES.map((stageMeta) => {
                                      const selectedStageForRow = stages.find((stage) => stage.id === stageMeta.id);
                                      const selectedIndex = stages.findIndex((stage) => stage.id === stageMeta.id);
                                      const selected = Boolean(selectedStageForRow);
                                      const locked = selected && stages
                                        .slice(Math.max(0, selectedIndex))
                                        .some((stage) => getStageCompleted(stage) > 0);

                                      return (
                                        <label
                                          key={stageMeta.id}
                                          className={`flex items-center gap-2 rounded border px-2 py-1.5 text-[11px] ${
                                            selected ? 'border-emerald-200 bg-white text-gray-800' : 'border-slate-200 bg-white/70 text-gray-500'
                                          } ${locked ? 'opacity-70' : ''}`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={selected}
                                            disabled={locked}
                                            onChange={() => onToggleStage(row.id, stageMeta.id)}
                                            className="h-3.5 w-3.5 accent-emerald-500"
                                          />
                                          <span className="flex-1 truncate">{stageMeta.name}</span>
                                          {locked && <span className="text-[10px] text-gray-400">đã chạy</span>}
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <div className="flex flex-wrap gap-1.5 flex-1">
                                  {stages.map((stage, stageIndex) => {
                                    const completed = getStageCompleted(stage);
                                    const required = getStageRequired(row, stage);
                                    const complete = required > 0 && completed >= required;
                                    const active = stage.id === selectedStage.id;

                                    return (
                                      <button
                                        type="button"
                                        key={stage.id}
                                        onClick={() => onStageChange(stage.id)}
                                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${
                                          complete
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : active
                                              ? 'border-sky-200 bg-sky-50 text-sky-700'
                                              : 'border-gray-200 bg-gray-50 text-gray-500'
                                        }`}
                                        title="Bấm để ghi nhận công đoạn này"
                                      >
                                        {complete && <Check className="h-3 w-3" />}
                                        <span className="font-semibold">B{stageIndex + 1}</span>
                                        {stage.name}: {completed}/{required}
                                      </button>
                                    );
                                  })}
                                </div>
                                <span className="text-[9px] text-gray-400 w-8 text-right">{rowProgress}%</span>
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
          </div>
        )}
      </div>
    </div>
  );
}

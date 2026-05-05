import React, { useState } from 'react';
import { Package, Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { renderDimensions, renderQuantity } from '../../utils/formatters';

export default function InputTable({
  selectedInputs,
  disabled = false,
  onOpenInventoryModal,
  onChangeInputQuantity,
  onChangeInputVolume,
  onRemoveInputBatch,
  onRemoveInputItem
}) {
  const [expandedBatches, setExpandedBatches] = useState({});

  const toggleBatch = (batchId) => {
    setExpandedBatches((prev) => ({ ...prev, [batchId]: prev[batchId] === false ? true : false }));
  };

  const isBatchExpanded = (batchId) => expandedBatches[batchId] !== false;

  const groupedInputs = Object.values(selectedInputs.reduce((acc, item) => {
    const batchId = item.batchId || item.id;
    if (!acc[batchId]) {
      acc[batchId] = {
        batchId,
        type: item.type,
        name: item.batchId ? `Lô ${item.batchId}` : item.name,
        items: []
      };
    }
    acc[batchId].items.push(item);
    return acc;
  }, {}));

  const numInputClass = "w-full h-full min-h-[36px] bg-transparent px-3 py-2 outline-none hover:bg-black/[0.02] focus:bg-white focus:ring-1 focus:ring-inset focus:ring-notion-blue transition-colors text-[13px] text-notion-black text-right tabular-nums placeholder-warm-gray-300 disabled:text-warm-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed";

  return (
    <section className="mb-8 relative z-30">
      <div className="bg-notion-white border border-whisper rounded-[8px] shadow-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-whisper rounded-t-[8px]">
          <h3 className="text-[14px] font-semibold flex items-center gap-1.5">
            <Package size={15} className="text-notion-blue" />
            Nguyên liệu đầu vào
            {selectedInputs.length > 0 && (
              <span className="ml-1 text-[11px] font-bold bg-badge-bg text-badge-text px-1.5 py-[1px] rounded-full">
                {selectedInputs.length}
              </span>
            )}
          </h3>

          <button
            onClick={onOpenInventoryModal}
            disabled={disabled}
            className="flex items-center gap-1 text-[13px] font-medium text-white bg-notion-blue hover:bg-notion-blue-hover transition px-3 py-1.5 rounded-md shadow-sm disabled:bg-gray-300 disabled:hover:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Plus size={14} /> Chọn từ Kho
          </button>
        </div>

        {groupedInputs.length === 0 ? (
          <div className="px-4 py-8 text-center text-[13px] text-warm-gray-400 rounded-b-[8px]">
            Chưa chọn nguyên liệu. Bấm "Chọn từ Kho" để chọn phôi.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-b-[8px]">
            <table className="w-full min-w-[700px] text-[13px] text-left border-collapse table-fixed">
              <thead className="text-[11px] uppercase text-warm-gray-400 tracking-[0.5px] border-b border-whisper bg-warm-white">
                <tr>
                  <th className="px-4 py-2.5 font-semibold w-[5%] border-r border-whisper"></th>
                  <th className="px-4 py-2.5 font-semibold w-[27%] border-r border-whisper">Mã Lô / Loại gỗ</th>
                  <th className="px-4 py-2.5 font-semibold text-center w-[18%] border-r border-whisper">Quy cách</th>
                  <th className="px-4 py-2.5 font-semibold text-right w-[12%] border-r border-whisper text-blue-600">SL Chọn</th>
                  <th className="px-4 py-2.5 font-semibold text-right w-[8%] border-r border-whisper">Tồn SL</th>
                  <th className="px-4 py-2.5 font-semibold text-right w-[14%] border-r border-whisper text-blue-600">KL Chọn</th>
                  <th className="px-4 py-2.5 font-semibold text-right w-[10%] border-r border-whisper">Tồn KL</th>
                  <th className="px-2 py-2.5 w-[6%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-whisper">
                {groupedInputs.map((group) => {
                  const isExpanded = isBatchExpanded(group.batchId);
                  const totalQty = group.items.reduce((sum, item) => sum + (Number(item.quantity_used) || 0), 0);
                  const totalVol = group.items.reduce((sum, item) => sum + (Number(item.volume_used) || 0), 0).toFixed(4);

                  return (
                    <React.Fragment key={group.batchId}>
                      <tr className="hover:bg-warm-white/60 transition group cursor-pointer bg-warm-white/30 border-b-0" onClick={() => toggleBatch(group.batchId)}>
                        <td className="px-4 py-2 text-warm-gray-400 border-r border-whisper">
                          <div className="flex justify-center">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </div>
                        </td>
                        <td className="px-4 py-2 font-semibold text-notion-black border-r border-whisper col-span-2" colSpan={2}>
                          <span className={`mr-2 inline-block text-[9px] font-bold px-1.5 py-[2px] rounded ${group.type === 'RAW' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                            {group.type === 'RAW' ? 'LÔ NL' : 'LÔ DƯ'}
                          </span>
                          {group.name}
                        </td>
                        <td className="pl-4 pr-3 py-2 text-right font-bold tabular-nums text-blue-600 border-r border-whisper">{renderQuantity(totalQty)}</td>
                        <td className="px-4 py-2 border-r border-whisper bg-stripes-light"></td>
                        <td className="pl-4 pr-3 py-2 text-right font-bold tabular-nums text-blue-600 border-r border-whisper">{totalVol}</td>
                        <td className="px-4 py-2 border-r border-whisper bg-stripes-light"></td>
                        <td className="p-0 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); onRemoveInputBatch(group.batchId); }}
                            disabled={disabled}
                            className="text-warm-gray-300 hover:text-red-500 transition p-2 disabled:hover:text-warm-gray-300 disabled:cursor-not-allowed"
                            title="Xóa toàn bộ lô"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>

                      {isExpanded && group.items.map((item) => (
                        <tr key={item.id} className="group hover:bg-warm-white/40 transition bg-white">
                          <td className="px-4 py-2 border-r border-whisper"></td>
                          <td className="px-4 py-2 border-r border-whisper">
                            <div className="flex items-center gap-2 pl-2 text-warm-gray-600">
                              <span className="text-warm-gray-300">└─</span>
                              <span className="font-medium text-notion-black truncate">{item.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 border-r border-whisper text-center tabular-nums text-warm-gray-600 text-[12px]">
                            {renderDimensions(item.thickness, item.width, item.length)}
                          </td>
                          <td className="p-0 border-r border-whisper bg-blue-50/20">
                            <input
                              type="number"
                              disabled={disabled}
                              className={`${numInputClass} font-semibold text-blue-600`}
                              value={item.quantity_used === '' ? '' : item.quantity_used}
                              onChange={(e) => onChangeInputQuantity(item.id, e.target.value)}
                              max={item.quantity}
                              min={0}
                            />
                          </td>
                          <td className="px-4 py-2 border-r border-whisper text-right tabular-nums text-warm-gray-400 text-[12px]">
                            / {renderQuantity(item.quantity)}
                          </td>
                          <td className="p-0 border-r border-whisper bg-blue-50/20">
                            <input
                              type="number"
                              step="0.0001"
                              disabled={disabled}
                              className={`${numInputClass} font-semibold text-blue-600`}
                              value={item.volume_used || ''}
                              onChange={(e) => onChangeInputVolume(item.id, e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-2 border-r border-whisper text-right tabular-nums text-warm-gray-400 text-[12px]">
                            / {Number(item.volume).toFixed(4)}
                          </td>
                          <td className="p-0 text-center">
                            <button
                              onClick={() => onRemoveInputItem(item.id)}
                              disabled={disabled}
                              className="text-warm-gray-300 hover:text-red-500 transition p-2 disabled:hover:text-warm-gray-300 disabled:cursor-not-allowed"
                              title="Xóa dòng này"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

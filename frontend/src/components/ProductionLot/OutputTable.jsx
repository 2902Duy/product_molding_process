import React from 'react';
import { FileText, ChevronDown, Plus, Trash2 } from 'lucide-react';

export default function OutputTable({
  outputs,
  disabled = false,
  showValidation = false,
  onAddOutput,
  onRemoveOutput,
  onChangeOutput
}) {
  const numInputClass = "w-full h-full min-h-[36px] bg-transparent px-3 py-2 outline-none hover:bg-black/[0.02] focus:bg-white focus:ring-1 focus:ring-inset focus:ring-notion-blue transition-colors text-[13px] text-notion-black text-right tabular-nums placeholder-warm-gray-300 disabled:text-warm-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed";

  return (
    <section className="mb-8 relative z-20">
      <div className="bg-notion-white border border-whisper rounded-[8px] shadow-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-whisper rounded-t-[8px]">
          <h3 className="text-[14px] font-semibold flex items-center gap-1.5">
            <FileText size={15} className="text-purple-600" />
            Danh sách thành phẩm và phôi dư
          </h3>
        </div>

        <div className="px-4 py-2.5 text-[12px] text-warm-gray-500 bg-warm-white border-b border-whisper">
          Phôi dư và phế phẩm được phép để trống dày, rộng, dài, số lượng. Cột số khối bắt buộc phải nhập.
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-[13px] text-left border-collapse table-fixed">
            <thead className="text-[11px] uppercase text-warm-gray-400 tracking-[0.5px] border-b border-whisper bg-warm-white">
              <tr>
                <th className="px-3 py-2.5 font-semibold w-[20%] border-r border-whisper">Loại gỗ</th>
                <th className="px-3 py-2.5 font-semibold text-right w-[8%] border-r border-whisper">Dày</th>
                <th className="px-3 py-2.5 font-semibold text-right w-[8%] border-r border-whisper">Rộng</th>
                <th className="px-3 py-2.5 font-semibold text-right w-[8%] border-r border-whisper">Dài</th>
                <th className="px-3 py-2.5 font-semibold text-right w-[10%] border-r border-whisper text-success-green">Số lượng</th>
                <th className="px-3 py-2.5 font-semibold text-right w-[14%] border-r border-whisper">Khối lượng (m³)</th>
                <th className="px-3 py-2.5 font-semibold w-[26%] border-r border-whisper">Tình trạng</th>
                <th className="px-2 py-2.5 w-[6%]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-whisper">
              {outputs.map((item) => {
                const requiresManualVolume = item.status === 'Phôi dư' || item.status === 'Phế phẩm';
                const missingVolume = item.volume === '' || Number(item.volume) <= 0;
                const volumeInputClass = `${numInputClass} bg-[#fcfcfb] focus:bg-white${showValidation && requiresManualVolume && missingVolume ? ' bg-red-50 text-red-600 ring-1 ring-inset ring-red-300' : ''}`;

                return (
                  <tr key={item.id} className="group hover:bg-warm-white/40 transition">
                    <td className="p-0 border-r border-whisper relative">
                      <select
                        disabled={disabled}
                        className="w-full h-full min-h-[36px] bg-transparent px-3 py-2 outline-none hover:bg-black/[0.02] focus:bg-white focus:ring-1 focus:ring-inset focus:ring-notion-blue transition-colors text-[13px] text-notion-black appearance-none cursor-pointer disabled:bg-gray-50 disabled:text-warm-gray-400 disabled:cursor-not-allowed"
                        value={item.name}
                        onChange={(e) => onChangeOutput(item.id, 'name', e.target.value)}
                      >
                        <option value="" disabled>Chọn loại gỗ</option>
                        <option value="CAO SU">CAO SU</option>
                        <option value="DẺ GAI">DẺ GAI</option>
                        <option value="HỒ ĐÀO">HỒ ĐÀO</option>
                        <option value="SỒI">SỒI</option>
                        <option value="BẠCH DƯƠNG">BẠCH DƯƠNG</option>
                        <option value="THÔNG">THÔNG</option>
                        <option value="TRÀM">TRÀM</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray-400 pointer-events-none" />
                    </td>
                    <td className="p-0 border-r border-whisper">
                      <input type="number" disabled={disabled} placeholder={requiresManualVolume ? "" : "0"} className={numInputClass} value={item.thickness} onChange={(e) => onChangeOutput(item.id, 'thickness', e.target.value)} />
                    </td>
                    <td className="p-0 border-r border-whisper">
                      <input type="number" disabled={disabled} placeholder={requiresManualVolume ? "" : "0"} className={numInputClass} value={item.width} onChange={(e) => onChangeOutput(item.id, 'width', e.target.value)} />
                    </td>
                    <td className="p-0 border-r border-whisper">
                      <input type="number" disabled={disabled} placeholder={requiresManualVolume ? "" : "0"} className={numInputClass} value={item.length} onChange={(e) => onChangeOutput(item.id, 'length', e.target.value)} />
                    </td>
                    <td className="p-0 border-r border-whisper bg-green-50/10">
                      <input type="number" disabled={disabled} placeholder={requiresManualVolume ? "" : "0"} className={`${numInputClass} font-semibold text-success-green`} value={item.quantity} onChange={(e) => onChangeOutput(item.id, 'quantity', e.target.value)} />
                    </td>
                    <td className="p-0 border-r border-whisper">
                      <input
                        type="number"
                        disabled={disabled}
                        step="0.0001"
                        placeholder={requiresManualVolume ? "Bắt buộc" : "Tự tính"}
                        className={volumeInputClass}
                        value={item.volume}
                        onChange={(e) => onChangeOutput(item.id, 'volume', e.target.value)}
                      />
                    </td>
                    <td className="p-0 border-r border-whisper relative">
                      <select
                        disabled={disabled}
                        className="w-full h-full min-h-[36px] bg-transparent px-3 py-2 outline-none hover:bg-black/[0.02] focus:bg-white focus:ring-1 focus:ring-inset focus:ring-notion-blue transition-colors text-[13px] text-notion-black appearance-none cursor-pointer font-medium disabled:bg-gray-50 disabled:text-warm-gray-400 disabled:cursor-not-allowed"
                        value={item.status}
                        onChange={(e) => onChangeOutput(item.id, 'status', e.target.value)}
                      >
                        <option value="Thành phẩm">Thành phẩm</option>
                        <option value="Phôi dư">Phôi dư</option>
                        <option value="Phế phẩm">Phế phẩm</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray-400 pointer-events-none" />
                    </td>
                    <td className="p-0 text-center">
                      <button onClick={() => onRemoveOutput(item.id)} disabled={disabled} className="text-warm-gray-300 hover:text-red-500 transition p-2 disabled:hover:text-warm-gray-300 disabled:cursor-not-allowed"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-2 border-t border-whisper bg-notion-white rounded-b-[8px]">
          <button onClick={onAddOutput} disabled={disabled} className="flex items-center gap-1.5 text-[13px] font-medium text-notion-blue hover:text-notion-blue-hover transition px-3 py-1.5 rounded-[4px] hover:bg-notion-blue/5 disabled:text-warm-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed">
            <Plus size={14} /> Thêm kết quả
          </button>
        </div>
      </div>
    </section>
  );
}

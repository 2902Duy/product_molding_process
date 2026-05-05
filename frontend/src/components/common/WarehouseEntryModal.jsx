import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

export default function WarehouseEntryModal({ isOpen, onClose, onSave, defaultStatus = 'Hàng tồn kho', initialEntries = null }) {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (isOpen) {
      if (initialEntries && initialEntries.length > 0) {
        setEntries(initialEntries.map((e, index) => ({
          id: e.id || Date.now() + index,
          length: e.length || '',
          width: e.width || '',
          thickness: e.thickness || '',
          quantity: e.quantity || '',
          volume: e.volume || '',
          status: defaultStatus
        })));
      } else {
        setEntries([
          { id: Date.now(), length: '', width: '', thickness: '', quantity: 1, volume: '', status: defaultStatus }
        ]);
      }
    }
  }, [isOpen, defaultStatus, initialEntries]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    setEntries([
      ...entries,
      { id: Date.now(), length: '', width: '', thickness: '', quantity: 1, volume: '', status: defaultStatus }
    ]);
  };

  const handleRemoveRow = (id) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const handleChange = (id, field, value) => {
    setEntries(entries.map(entry => {
      if (entry.id === id) {
        const updated = { ...entry, [field]: value };
        // Tự động tính số khối nếu có đủ dài rộng dày và số lượng
        if (['length', 'width', 'thickness', 'quantity'].includes(field)) {
          const l = parseFloat(updated.length) || 0;
          const w = parseFloat(updated.width) || 0;
          const t = parseFloat(updated.thickness) || 0;
          const q = parseFloat(updated.quantity) || 0;
          
          if (l > 0 && w > 0 && t > 0 && q > 0) {
            // Giả sử Dài Rộng Dày nhập theo mm, quy ra m3: mm3 / 1,000,000,000
            const vol = (l * w * t * q) / 1000000000;
            // Làm tròn 4 chữ số thập phân
            updated.volume = vol.toFixed(4);
          } else {
            updated.volume = '';
          }
        }
        return updated;
      }
      return entry;
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(entries);
  };

  return (
    <div className="fixed inset-0 bg-warm-dark/40 sm:bg-warm-dark/20 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-notion-white border border-whisper rounded-[12px] shadow-deep w-full max-w-[900px] max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-whisper shrink-0">
          <div>
            <h2 className="text-[20px] font-bold text-notion-black">Nhập kho phôi</h2>
            <p className="text-[13px] text-warm-gray-500 mt-1">Khai báo chi tiết kích thước và phân loại phôi</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-warm-white hover:bg-whisper rounded-full text-warm-gray-500 transition">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="w-full bg-notion-white border border-whisper rounded-[8px] overflow-hidden">
            <table className="w-full text-left text-[14px] border-collapse">
              <thead className="bg-[#fafaf9] text-warm-gray-500 text-[12px] uppercase tracking-[0.5px]">
                <tr>
                  <th className="px-3 py-2.5 font-semibold border-b border-whisper w-[12%]">Dài (mm)</th>
                  <th className="px-3 py-2.5 font-semibold border-b border-whisper w-[12%]">Rộng (mm)</th>
                  <th className="px-3 py-2.5 font-semibold border-b border-whisper w-[12%]">Dày (mm)</th>
                  <th className="px-3 py-2.5 font-semibold border-b border-whisper w-[12%]">Số lượng</th>
                  <th className="px-3 py-2.5 font-semibold border-b border-whisper w-[15%]">Số khối (m³)</th>
                  <th className="px-3 py-2.5 font-semibold border-b border-whisper w-[25%]">Tình trạng</th>
                  <th className="px-3 py-2.5 font-semibold border-b border-whisper w-[5%] text-right"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={entry.id} className="border-b border-whisper last:border-b-0 group">
                    <td className="px-3 py-2">
                      <input type="number" required placeholder="0" className="w-full bg-transparent border border-whisper rounded-[4px] px-2 py-1.5 text-[14px] focus:outline-none focus:border-notion-blue" value={entry.length} onChange={e => handleChange(entry.id, 'length', e.target.value)} />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" required placeholder="0" className="w-full bg-transparent border border-whisper rounded-[4px] px-2 py-1.5 text-[14px] focus:outline-none focus:border-notion-blue" value={entry.width} onChange={e => handleChange(entry.id, 'width', e.target.value)} />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" required placeholder="0" className="w-full bg-transparent border border-whisper rounded-[4px] px-2 py-1.5 text-[14px] focus:outline-none focus:border-notion-blue" value={entry.thickness} onChange={e => handleChange(entry.id, 'thickness', e.target.value)} />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" required min="1" className="w-full bg-transparent border border-whisper rounded-[4px] px-2 py-1.5 text-[14px] focus:outline-none focus:border-notion-blue" value={entry.quantity} onChange={e => handleChange(entry.id, 'quantity', e.target.value)} />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.0001" placeholder="Auto" className="w-full bg-warm-white border border-whisper rounded-[4px] px-2 py-1.5 text-[14px] focus:outline-none focus:border-notion-blue" value={entry.volume} onChange={e => handleChange(entry.id, 'volume', e.target.value)} />
                    </td>
                    <td className="px-3 py-2">
                      <select className="w-full bg-transparent border border-whisper rounded-[4px] px-2 py-1.5 text-[13px] focus:outline-none focus:border-notion-blue text-notion-black" value={entry.status} onChange={e => handleChange(entry.id, 'status', e.target.value)}>
                        <option value="Hàng tận dụng được">Hàng tận dụng được</option>
                        <option value="Hàng tồn kho">Hàng tồn kho (không đơn hàng)</option>
                        <option value="Hàng loại bỏ">Hàng loại bỏ</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {entries.length > 1 && (
                        <button onClick={() => handleRemoveRow(entry.id)} className="text-warm-gray-300 hover:text-red-500 transition p-1">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={handleAddRow} className="mt-3 flex items-center gap-1.5 text-[13px] font-medium text-notion-blue hover:text-notion-blue-hover transition px-2 py-1 rounded-[4px] hover:bg-notion-blue/5">
            <Plus size={14} /> Thêm dòng mới
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-whisper bg-[#fafaf9] rounded-b-[12px] shrink-0">
          <div className="text-[13px] text-warm-gray-500">
            Tổng cộng: <span className="font-semibold text-notion-black">{entries.length}</span> loại phôi
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-4 py-[8px] text-[14px] font-medium hover:bg-warm-white text-notion-black rounded-[6px] border border-whisper transition">
              Hủy bỏ
            </button>
            <button onClick={handleSubmit} className="px-5 py-[8px] text-[14px] font-semibold bg-notion-blue hover:bg-notion-blue-hover text-white rounded-[6px] transition shadow-sm">
              Lưu vào kho
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

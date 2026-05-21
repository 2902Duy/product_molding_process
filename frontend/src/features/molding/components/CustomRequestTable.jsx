import { Trash2, Send, AlertCircle } from 'lucide-react';

export default function CustomRequestTable({
  customRequests = [],
  disabled = false,
  onAddRequest,
  onRemoveRequest,
  onChangeRequest,
  onSendRequests
}) {
  return (
    <div className="bg-white border border-orange-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
        <h3 className="font-semibold text-orange-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Yêu cầu kích thước tùy ý
        </h3>
        {!disabled && (
          <button
            onClick={onAddRequest}
            className="px-3 py-1 text-xs font-medium text-orange-600 bg-white border border-orange-200 rounded-lg hover:bg-orange-50 transition"
          >
            + Thêm yêu cầu
          </button>
        )}
      </div>
      <div className="p-4">
        {customRequests.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">
            Chưa có yêu cầu kích thước tùy ý nào.
            <br />
            <span className="text-xs">Nhấn "Thêm yêu cầu" nếu cần phôi chưa có trong kho.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {customRequests.map(req => (
              <div key={req.id} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                <div className="flex-1 grid grid-cols-6 gap-2 text-sm">
                  <div>
                    <span className="text-xs text-gray-500">Loại gỗ</span>
                    {disabled ? (
                      <div className="font-medium">{req.woodType || '-'}</div>
                    ) : (
                      <input
                        type="text"
                        value={req.woodType || ''}
                        onChange={(e) => onChangeRequest(req.id, 'woodType', e.target.value)}
                        placeholder="..."
                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-orange-400"
                      />
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Dày (mm)</span>
                    {disabled ? (
                      <div className="font-medium">{req.thickness || '-'}</div>
                    ) : (
                      <input
                        type="number"
                        value={req.thickness || ''}
                        onChange={(e) => onChangeRequest(req.id, 'thickness', e.target.value)}
                        placeholder="..."
                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-orange-400"
                      />
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Rộng (mm)</span>
                    {disabled ? (
                      <div className="font-medium">{req.width || '-'}</div>
                    ) : (
                      <input
                        type="number"
                        value={req.width || ''}
                        onChange={(e) => onChangeRequest(req.id, 'width', e.target.value)}
                        placeholder="..."
                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-orange-400"
                      />
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Dài (mm)</span>
                    {disabled ? (
                      <div className="font-medium">{req.length || '-'}</div>
                    ) : (
                      <input
                        type="number"
                        value={req.length || ''}
                        onChange={(e) => onChangeRequest(req.id, 'length', e.target.value)}
                        placeholder="..."
                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-orange-400"
                      />
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">SL</span>
                    {disabled ? (
                      <div className="font-medium">{req.quantity || '-'}</div>
                    ) : (
                      <input
                        type="number"
                        value={req.quantity || ''}
                        onChange={(e) => onChangeRequest(req.id, 'quantity', e.target.value)}
                        placeholder="..."
                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-orange-400"
                      />
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Lý do</span>
                    {disabled ? (
                      <div className="font-medium">{req.reason || '-'}</div>
                    ) : (
                      <input
                        type="text"
                        value={req.reason || ''}
                        onChange={(e) => onChangeRequest(req.id, 'reason', e.target.value)}
                        placeholder="..."
                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-orange-400"
                      />
                    )}
                  </div>
                </div>
                {!disabled && (
                  <button
                    onClick={() => onRemoveRequest(req.id)}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {!disabled && (
              <button
                onClick={onSendRequests}
                className="w-full mt-3 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Gửi yêu cầu đến bộ phận sản xuất phôi
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

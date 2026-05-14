import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingDown, Info, Loader2 } from 'lucide-react';
import {
  predictTotalLoss as predictTotalLossApi,
  predictTotalLossFallback
} from '../../services/lossPredictionApi';

/**
 * Component hiển thị dự đoán hao hụt cho lô sản xuất
 * Ưu tiên sử dụng API, fallback sang local nếu API không khả dụng
 */
export default function LossPrediction({ inputs = [] }) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usingApi, setUsingApi] = useState(false);

  // Tính toán khi inputs thay đổi
  useEffect(() => {
    console.log('[LossPrediction] inputs changed:', inputs.map(i => ({name: i.name, vol: i.volume_used || i.volume})));

    const calculatePrediction = async () => {
      // Nếu không có dữ liệu đầu vào, không hiển thị
      if (!inputs || inputs.length === 0) {
        setPrediction(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Thử gọi API trước
        console.log('[LossPrediction] Calling API with:', inputs.length, 'items');
        const result = await predictTotalLossApi(inputs);
        console.log('[LossPrediction] API result:', result ? 'success' : 'null');

        if (result) {
          setPrediction(result);
          setUsingApi(true);
        } else {
          // Fallback sang local prediction
          const fallbackResult = predictTotalLossFallback(inputs);
          setPrediction(fallbackResult);
          setUsingApi(false);
        }
      } catch (err) {
        console.error('Lỗi khi dự đoán:', err);
        // Fallback khi có lỗi
        try {
          const fallbackResult = predictTotalLossFallback(inputs);
          setPrediction(fallbackResult);
          setUsingApi(false);
        } catch {
          setError('Không thể dự đoán hao hụt');
        }
      } finally {
        setLoading(false);
      }
    };

    // Debounce để tránh gọi API quá nhiều
    const timeoutId = setTimeout(calculatePrediction, 300);
    return () => clearTimeout(timeoutId);
  }, [inputs]);

  // Nếu không có dữ liệu, không hiển thị
  if (!inputs || inputs.length === 0 || !prediction) {
    return null;
  }

  // Helper functions
  const formatPercent = (percent) => {
    if (percent === undefined || percent === null || isNaN(percent)) {
      return '-';
    }
    return `${Number(percent).toFixed(1)}%`;
  };

  const getLossColor = (percent) => {
    const p = Number(percent);
    if (p < 35) {
      return { color: '#22c55e', label: 'Tốt' };
    } else if (p < 45) {
      return { color: '#f59e0b', label: 'Trung bình' };
    } else {
      return { color: '#ef4444', label: 'Cao' };
    }
  };

  const getConfidenceInfo = (confidence) => {
    switch (confidence) {
      case 'high':
        return { label: 'Cao', description: 'Dự đoán chính xác với khối lượng lớn' };
      case 'medium':
        return { label: 'Trung bình', description: 'Dự đoán có thể dao động nhẹ' };
      case 'low':
        return { label: 'Thấp', description: 'Nên kiểm tra thực tế, khối lượng nhỏ' };
      default:
        return { label: '-', description: '' };
    }
  };

  const lossColor = getLossColor(prediction.total_loss_percent);
  const confidence = getConfidenceInfo(prediction.confidence);

  return (
    <div className="mt-4 mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-100 rounded-lg">
            {loading ? (
              <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
            ) : (
              <TrendingDown className="w-5 h-5 text-amber-600" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Dự đoán hao hụt</h3>
            <p className="text-xs text-gray-500">Dựa trên loại gỗ và khối lượng đã chọn</p>
          </div>
        </div>

        {/* Model status badge */}
        <div
          className={`text-xs px-2 py-1 rounded-full font-medium ${
            usingApi
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {usingApi ? 'AI Model' : 'Công thức'}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-2 text-amber-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Đang tính toán...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center justify-center py-4 text-red-600">
          <AlertTriangle className="w-4 h-4 mr-2" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Main prediction */}
      {!loading && !error && prediction && (
        <>
          <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg"
                style={{ backgroundColor: `${lossColor.color}20`, color: lossColor.color }}
              >
                {formatPercent(prediction.total_loss_percent)}
              </div>
              <div>
                <div className="text-sm text-gray-600">Tỷ lệ hao hụt dự tính</div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: `${lossColor.color}20`, color: lossColor.color }}
                  >
                    {lossColor.label}
                  </span>
                  <span className="text-xs text-gray-400">
                    Độ tin cậy: {confidence.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Volume info */}
            <div className="text-right">
              <div className="text-xs text-gray-500">Khối vào / Khối ra dự tính</div>
              <div className="font-medium text-gray-800">
                {prediction.total_input_volume?.toFixed(3) || 0} m³ →{' '}
                {prediction.estimated_total_output?.toFixed(3) || 0} m³
              </div>
              <div className="text-xs text-amber-600">
                Hao hụt: ~{prediction.estimated_total_loss?.toFixed(3) || 0} m³
              </div>
            </div>
          </div>

          {/* Breakdown by wood type */}
          {prediction.by_wood_type && prediction.by_wood_type.length > 1 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-gray-500 mb-2">Chi tiết theo loại gỗ:</div>
              <div className="space-y-2">
                {prediction.by_wood_type.map((item, index) => {
                  const itemColor = getLossColor(item.loss_percent);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-white/60 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">{item.wood_type}</span>
                        <span className="text-xs text-gray-400">
                          ({item.input_volume?.toFixed(3) || 0} m³)
                        </span>
                        {!item.model_used && usingApi && (
                          <span className="text-xs text-gray-400">(ước tính)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {item.min_loss}% - {item.max_loss}%
                        </span>
                        <span
                          className="text-sm font-medium px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: `${itemColor.color}20`,
                            color: itemColor.color,
                          }}
                        >
                          {formatPercent(item.loss_percent)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Info note */}
          <div className="flex items-start gap-2 text-xs text-gray-500 bg-white/40 p-2 rounded-lg">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <span>
              {usingApi
                ? 'Dự đoán từ mô hình được huấn luyện trên dữ liệu của xưởng.'
                : 'API không khả dụng. Sử dụng công thức dự phòng. Hao hụt thực tế có thể dao động.'}
            </span>
          </div>

          {/* Warning for high loss */}
          {Number(prediction.total_loss_percent) >= 45 && (
            <div className="flex items-center gap-2 mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-xs text-red-700">
                Tỷ lệ hao hụt dự tính cao. Cân nhắc kiểm tra chất lượng nguyên liệu hoặc
                điều chỉnh quy trình sản xuất.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

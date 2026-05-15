/**
 * API client gọi backend để dự đoán hao hụt gỗ.
 * (Đổi tên từ lossPredictionApi.js → predictionApi.js cho rõ ràng hơn)
 *
 * Dùng khi backend đang chạy. Nếu backend offline, dùng predictionFallback.js
 */

// URL của backend API - Có thể thay đổi tùy môi trường
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

/**
 * Gọi API dự đoán cho một loại gỗ
 * @param {string} woodType - Tên loại gỗ
 * @param {number} totalInputVolume - Tổng khối lượng đầu vào (m³)
 * @returns {Promise<object>} - Kết quả dự đoán
 */
export async function predictLoss(woodType, totalInputVolume) {
  try {
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wood_type: woodType,
        total_input_volume: totalInputVolume,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Lỗi khi gọi API dự đoán:', error);
    // Trả về null để frontend biết cần dùng fallback
    return null;
  }
}

/**
 * Gọi API dự đoán cho nhiều loại gỗ
 * @param {Array} inputs - Mảng các input { name, volume }
 * @returns {Promise<object>} - Kết quả dự đoán tổng hợp
 */
export async function predictTotalLoss(inputs) {
  if (!inputs || inputs.length === 0) {
    return null;
  }

  try {
    // Nhóm theo loại gỗ và tính tổng khối lượng
    const groupedByWood = {};

    inputs.forEach(item => {
      if (!item || !item.name) return;

      const normalizedType = normalizeWoodType(item.name);
      const volume = Number(item.volume_used || item.volume || 0);

      if (!groupedByWood[normalizedType]) {
        groupedByWood[normalizedType] = {
          wood_type: normalizedType,
          total_input_volume: 0,
        };
      }

      groupedByWood[normalizedType].total_input_volume += volume;
    });

    // Chuyển thành mảng và loại bỏ các loại gỗ có volume = 0
    const apiInputs = Object.values(groupedByWood).filter(
      (item) => item.total_input_volume > 0
    );

    if (apiInputs.length === 0) {
      return null;
    }

    // Gọi API batch
    const response = await fetch(`${API_BASE_URL}/predict/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: apiInputs,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Lỗi khi gọi API dự đoán tổng hợp:', error);
    return null;
  }
}

/**
 * Kiểm tra API có đang hoạt động không
 * @returns {Promise<boolean>}
 */
export async function checkApiHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      return data.model_loaded;
    }
    return false;
  } catch (error) {
    console.error('API không khả dụng:', error);
    return false;
  }
}

/**
 * Lấy danh sách các loại gỗ được hỗ trợ
 * @returns {Promise<object>}
 */
export async function getWoodTypes() {
  try {
    const response = await fetch(`${API_BASE_URL}/wood-types`);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách gỗ:', error);
    return null;
  }
}

// =============================================================================
// FALLBACK - Khi API không khả dụng
// =============================================================================

// Định mức hao hụt (fallback)
const LOSS_RANGES = {
  'THÔNG': { min: 35, max: 40 },
  'DẺ GAI': { min: 30, max: 40 },
  'HỒ ĐÀO': { min: 40, max: 50 },
  'CAO SU': { min: 35, max: 45 },
  'SỒI': { min: 35, max: 45 },
  'TẦN BÌ': { min: 35, max: 45 },
};

const DEFAULT_LOSS_RANGE = { min: 35, max: 45 };

function normalizeWoodType(woodType) {
  if (!woodType) return '';
  return woodType.toUpperCase().trim();
}

function getLossRange(woodType) {
  const normalizedType = normalizeWoodType(woodType);
  return LOSS_RANGES[normalizedType] || DEFAULT_LOSS_RANGE;
}

function getConfidence(volume) {
  if (volume >= 1) return 'high';
  if (volume >= 0.5) return 'medium';
  return 'low';
}

/**
 * Dự đoán fallback (khi API không khả dụng)
 */
export function predictLossFallback(woodType, totalInputVolume) {
  const normalizedType = normalizeWoodType(woodType);
  const range = getLossRange(normalizedType);

  if (!totalInputVolume || totalInputVolume <= 0) {
    return {
      wood_type: normalizedType,
      input_volume: 0,
      loss_percent: range.min + (range.max - range.min) / 2, // Trả về giá trị trung bình
      min_loss: range.min,
      max_loss: range.max,
      estimated_output: 0,
      estimated_loss_volume: 0,
      confidence: 'low',
      model_used: false,
    };
  }

  // Tính base loss (không có noise để kết quả ổn định)
  const volumeFactor = Math.min(totalInputVolume / 2, 1);
  const baseLoss = range.max - (range.max - range.min) * volumeFactor * 0.7;
  const lossPercent = Math.max(range.min, Math.min(range.max, baseLoss));

  const estimatedOutput = totalInputVolume * (1 - lossPercent / 100);

  return {
    wood_type: normalizedType,
    input_volume: totalInputVolume,
    loss_percent: Math.round(lossPercent * 10) / 10,
    min_loss: range.min,
    max_loss: range.max,
    estimated_output: Math.round(estimatedOutput * 1000) / 1000,
    estimated_loss_volume: Math.round((totalInputVolume - estimatedOutput) * 1000) / 1000,
    confidence: getConfidence(totalInputVolume),
    model_used: false,
  };
}

/**
 * Dự đoán tổng hợp fallback
 */
export function predictTotalLossFallback(inputs) {
  if (!inputs || inputs.length === 0) {
    return null;
  }

  // Nhóm theo loại gỗ
  const groupedByWood = {};

  inputs.forEach(item => {
    if (!item || !item.name) return;

    const normalizedType = normalizeWoodType(item.name);
    const volume = Number(item.volume_used || item.volume || 0);

    if (!groupedByWood[normalizedType]) {
      groupedByWood[normalizedType] = {
        wood_type: normalizedType,
        total_input_volume: 0,
        items: [],
      };
    }

    groupedByWood[normalizedType].total_input_volume += volume;
    groupedByWood[normalizedType].items.push(item);
  });

  // Tính dự đoán cho từng loại gỗ
  const byWoodType = Object.values(groupedByWood)
    .filter(group => group.total_input_volume > 0)
    .map(group => predictLossFallback(group.wood_type, group.total_input_volume));

  if (byWoodType.length === 0) {
    return null;
  }

  // Tính tổng
  const totalInputVolume = byWoodType.reduce((sum, pred) => sum + pred.input_volume, 0);
  const estimatedTotalOutput = byWoodType.reduce((sum, pred) => sum + pred.estimated_output, 0);
  const estimatedTotalLoss = totalInputVolume - estimatedTotalOutput;

  // Tính tổng hao hụt theo trọng số khối lượng
  let totalLossPercent = 0;
  if (totalInputVolume > 0) {
    const weightedLoss = byWoodType.reduce((sum, pred) => {
      const weight = pred.input_volume / totalInputVolume;
      return sum + pred.loss_percent * weight;
    }, 0);
    totalLossPercent = Math.round(weightedLoss * 10) / 10;
  }

  // Độ tin cậy tổng
  const confidences = byWoodType.map(p => p.confidence);
  let overallConfidence = 'low';
  if (confidences.every(c => c === 'high')) {
    overallConfidence = 'high';
  } else if (confidences.some(c => c === 'high')) {
    overallConfidence = 'medium';
  }

  return {
    total_input_volume: Math.round(totalInputVolume * 1000) / 1000,
    total_loss_percent: totalLossPercent,
    estimated_total_output: Math.round(estimatedTotalOutput * 1000) / 1000,
    estimated_total_loss: Math.round(estimatedTotalLoss * 1000) / 1000,
    by_wood_type: byWoodType,
    confidence: overallConfidence,
    model_used: false,
  };
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
  predictLoss,
  predictTotalLoss,
  checkApiHealth,
  getWoodTypes,
  predictLossFallback,
  predictTotalLossFallback,
};

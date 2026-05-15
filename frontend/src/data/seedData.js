/**
 * Dữ liệu mẫu (seed data) cho ứng dụng.
 * Được dùng khi chưa có dữ liệu từ MCP hoặc localStorage.
 *
 * KHÔNG chứa business logic — chỉ chứa dữ liệu tĩnh.
 * Business logic nằm trong services/db.js
 */
const defaultOrders = [
  {
    id: 'DH-2026-01', name: 'Đơn hàng VFM 01', products: [
      {
        id: 'SP-001', name: 'Twin Single Bed - White', quantity: 114, items: [
          { id: 'PT-01', name: 'Khung đầu dường', materialType: null, length: 1061, width: 915, thickness: 44, base_quantity: 1 },
          { id: 'PT-02', name: 'Chân trái đầu giường thành phẩm', materialType: null, length: 885, width: 44, thickness: 44, base_quantity: 1 },
          { id: 'PT-03', name: 'Chân phải đầu giường thành phẩm', materialType: null, length: 885, width: 44, thickness: 44, base_quantity: 1 },
          { id: 'PT-04', name: 'Chân trái đầu giường', materialType: 'Thông', length: 760, width: 44, thickness: 44, base_quantity: 1 },
          { id: 'PT-05', name: 'Chân phải đầu giường', materialType: 'Thông', length: 760, width: 44, thickness: 44, base_quantity: 1 },
          { id: 'PT-06', name: 'Chân tiện đầu giường', materialType: 'Cao su', length: 125, width: 45, thickness: 45, base_quantity: 2 },
          { id: 'PT-07', name: 'Thanh ngang dưới đầu giường', materialType: 'LVD CAO SU, VNR THÔNG', length: 970, width: 40, thickness: 20, base_quantity: 1 },
          { id: 'PT-08', name: 'TVán đầu giường', materialType: 'MDF', length: 970, width: 500, thickness: 20, base_quantity: 1 },
          { id: 'PT-09', name: 'Khung đuôi giường', materialType: null, length: 1024, width: 640, thickness: 50, base_quantity: 1 },
          { id: 'PT-10', name: 'Thanh ốp đuôi giường', materialType: null, length: 885, width: 44, thickness: 44, base_quantity: 1 },
          { id: 'PT-11', name: 'Thanh ngang trên đuôi giường', materialType: 'LVD CAO SU, VNR THÔNG', length: 125, width: 45, thickness: 45, base_quantity: 2 },
          { id: 'PT-12', name: 'Thanh ngang dưới đuôi giường', materialType: 'LVD CAO SU, VNR THÔNG', length: 970, width: 40, thickness: 20, base_quantity: 1 },
          { id: 'PT-13', name: 'Chân trái đuôi giường', materialType: 'Thông', length: 970, width: 500, thickness: 20, base_quantity: 1 },
          { id: 'PT-14', name: 'Chân phải đuôi giường', materialType: 'Thông', length: 970, width: 500, thickness: 20, base_quantity: 1 },
          { id: 'PT-15', name: 'Chân tiện đuôi giường', materialType: 'Cao su', length: 125, width: 45, thickness: 45, base_quantity: 2 },
          { id: 'PT-16', name: 'Thanh ngang giữa đuôi giường', materialType: 'LVD CAO SU, VNR THÔNG', length: 970, width: 40, thickness: 20, base_quantity: 1 },
          { id: 'PT-17', name: 'ván đuôi giường', materialType: 'LVD CAO SU, VNR THÔNG', length: 970, width: 40, thickness: 20, base_quantity: 1 },
          { id: 'PT-18', name: 'Khung lan can sau trái', materialType: 'LVD CAO SU, VNR THÔNG', length: 870, width: 40, thickness: 20, base_quantity: 1 },
          { id: 'PT-19', name: 'Khung lan can sau phải', materialType: 'LVD CAO SU, VNR THÔNG', length: 930, width: 40, thickness: 20, base_quantity: 1 },
          { id: 'PT-20', name: 'Khung lan can trước trái', materialType: 'LVD CAO SU, VNR THÔNG', length: 920, width: 40, thickness: 20, base_quantity: 1 },
          { id: 'PT-21', name: 'Khung lan can trước phải', materialType: 'LVD CAO SU, VNR THÔNG', length: 930, width: 40, thickness: 20, base_quantity: 1 },
          { id: 'PT-22', name: 'Thanh ngang giữa lan can', materialType: 'LVD CAO SU, VNR THÔNG', length: 1070, width: 30, thickness: 30, base_quantity: 1 },
          { id: 'PT-23', name: 'ván lan can', materialType: 'LVD CAO SU, VNR THÔNG', length: 970, width: 40, thickness: 20, base_quantity: 1 },
          { id: 'PT-24', name: 'Thanh đứng khung lan can', materialType: 'Cao su', length: 125, width: 45, thickness: 45, base_quantity: 2 },
          { id: 'PT-25', name: 'Thanh lan can đứng trước', materialType: 'Cao su', length: 125, width: 45, thickness: 45, base_quantity: 2 },
          { id: 'PT-26', name: 'Vai giường sau trái lắp ráp', materialType: 'Cao su', length: 125, width: 45, thickness: 45, base_quantity: 2 },
          { id: 'PT-27', name: 'Vai giường sau phải lắp ráp', materialType: 'Cao su', length: 125, width: 45, thickness: 45, base_quantity: 2 },
          { id: 'PT-28', name: 'Vai giường trước trái lắp ráp', materialType: 'Thông', length: 125, width: 45, thickness: 45, base_quantity: 2 },
          { id: 'PT-29', name: 'Vai giường trước phải lắp ráp', materialType: 'Thông', length: 125, width: 45, thickness: 45, base_quantity: 2 },
          { id: 'PT-30', name: 'Thanh giằng giữa giường', materialType: 'Thông', length: 125, width: 45, thickness: 45, base_quantity: 2 },
          { id: 'PT-31', name: 'Thanh đỡ vạt giường', materialType: 'Thông', length: 125, width: 45, thickness: 45, base_quantity: 2 },
          { id: 'PT-32', name: 'Chi tiết rời', materialType: null, length: 125, width: 45, thickness: 45, base_quantity: 2 },
          { id: 'PT-33', name: 'Vạt giường', materialType: null, length: 1000, width: 50, thickness: 45, base_quantity: 2 },
          { id: 'PT-34', name: 'Chân giữa', materialType: 'Thông', length: 125, width: 45, thickness: 45, base_quantity: 2 },
        ]
      },
      {
        id: 'SP-002',
        name: 'Bunk Bed Premium',
        quantity: 115,
        items: [

          { id: 'PT-001', name: 'Chân trái đầu giường thành phẩm', materialType: 'Sồi', length: 1200, width: 60, thickness: 60, base_quantity: 1 },
          { id: 'PT-002', name: 'Chân phải đầu giường thành phẩm', materialType: 'Sồi', length: 1200, width: 60, thickness: 60, base_quantity: 1 },
          { id: 'PT-003', name: 'Chân trái đầu giường', materialType: 'Thông', length: 1200, width: 55, thickness: 55, base_quantity: 1 },
          { id: 'PT-004', name: 'Chân phải đầu giường', materialType: 'Thông', length: 1200, width: 55, thickness: 55, base_quantity: 1 },
          { id: 'PT-005', name: 'Chân tiện đầu giường', materialType: 'Hồ đào', length: 500, width: 45, thickness: 45, base_quantity: 2 },
          { id: 'PT-006', name: 'Thanh ngang dưới đầu giường', materialType: 'Thông', length: 1400, width: 120, thickness: 25, base_quantity: 1 },
          { id: 'PT-007', name: 'Ván đầu giường', materialType: 'MDF', length: 1400, width: 500, thickness: 18, base_quantity: 1 },

          { id: 'PT-008', name: 'Thanh ốp đuôi giường', materialType: 'LDF', length: 1400, width: 80, thickness: 18, base_quantity: 1 },
          { id: 'PT-009', name: 'Thanh ngang trên đuôi giường', materialType: 'Thông', length: 1400, width: 100, thickness: 25, base_quantity: 1 },
          { id: 'PT-010', name: 'Thanh ngang dưới đuôi giường', materialType: 'Thông', length: 1400, width: 120, thickness: 25, base_quantity: 1 },
          { id: 'PT-011', name: 'Chân trái đuôi giường thành phẩm', materialType: 'Sồi', length: 1100, width: 60, thickness: 60, base_quantity: 1 },
          { id: 'PT-012', name: 'Chân phải đuôi giường thành phẩm', materialType: 'Sồi', length: 1100, width: 60, thickness: 60, base_quantity: 1 },
          { id: 'PT-013', name: 'Chân trái đuôi giường', materialType: 'Thông', length: 1100, width: 55, thickness: 55, base_quantity: 1 },
          { id: 'PT-014', name: 'Chân phải đuôi giường', materialType: 'Thông', length: 1100, width: 55, thickness: 55, base_quantity: 1 },
          { id: 'PT-015', name: 'Chân tiện đuôi giường', materialType: 'Hồ đào', length: 500, width: 45, thickness: 45, base_quantity: 2 },
          { id: 'PT-016', name: 'Thanh đứng giữa đuôi giường', materialType: 'Bạch dương', length: 700, width: 80, thickness: 20, base_quantity: 1 },
          { id: 'PT-017', name: 'Ván đuôi giường', materialType: 'MDF', length: 1400, width: 450, thickness: 18, base_quantity: 1 },

          { id: 'PT-018', name: 'Thanh ngang trên trái khung lan can sau', materialType: 'Thông', length: 1900, width: 80, thickness: 25, base_quantity: 1 },
          { id: 'PT-019', name: 'Thanh ngang trên phải khung lan can sau', materialType: 'Thông', length: 1900, width: 80, thickness: 25, base_quantity: 1 },
          { id: 'PT-020', name: 'Thanh ngang dưới trái khung lan can sau', materialType: 'Thông', length: 1900, width: 80, thickness: 25, base_quantity: 1 },
          { id: 'PT-021', name: 'Thanh ngang dưới phải khung lan can sau', materialType: 'Thông', length: 1900, width: 80, thickness: 25, base_quantity: 1 },
          { id: 'PT-022', name: 'Thanh đứng khung lan can sau', materialType: 'Sồi', length: 500, width: 50, thickness: 50, base_quantity: 4 },
          { id: 'PT-023', name: 'Thanh nan lan can sau', materialType: 'Bạch dương', length: 450, width: 30, thickness: 20, base_quantity: 10 },

          { id: 'PT-024', name: 'Thanh ngang trên trái khung lan can trước', materialType: 'Thông', length: 1900, width: 80, thickness: 25, base_quantity: 1 },
          { id: 'PT-025', name: 'Thanh ngang trên phải khung lan can trước', materialType: 'Thông', length: 1900, width: 80, thickness: 25, base_quantity: 1 },
          { id: 'PT-026', name: 'Thanh ngang dưới trái khung lan can trước', materialType: 'Thông', length: 1900, width: 80, thickness: 25, base_quantity: 1 },
          { id: 'PT-027', name: 'Thanh ngang dưới phải khung lan can trước', materialType: 'Thông', length: 1900, width: 80, thickness: 25, base_quantity: 1 },
          { id: 'PT-028', name: 'Thanh đứng khung lan can trước', materialType: 'Sồi', length: 500, width: 50, thickness: 50, base_quantity: 4 },
          { id: 'PT-029', name: 'Thanh nan lan can trước', materialType: 'Bạch dương', length: 450, width: 30, thickness: 20, base_quantity: 10 },

          { id: 'PT-030', name: 'Vai giường sau trái', materialType: 'Thông', length: 1900, width: 200, thickness: 30, base_quantity: 1 },
          { id: 'PT-031', name: 'Vai giường sau phải', materialType: 'Thông', length: 1900, width: 200, thickness: 30, base_quantity: 1 },

          { id: 'PT-032', name: 'Vai giường trước trái', materialType: 'Thông', length: 1900, width: 200, thickness: 30, base_quantity: 1 },
          { id: 'PT-033', name: 'Vai giường trước phải', materialType: 'Thông', length: 1900, width: 200, thickness: 30, base_quantity: 1 },

          { id: 'PT-034', name: 'Thanh đỡ vạt giường', materialType: 'Thông', length: 1900, width: 40, thickness: 30, base_quantity: 2 },

          { id: 'PT-035', name: 'Vạt giường 1', materialType: 'MDF', length: 1900, width: 700, thickness: 18, base_quantity: 1 },
          { id: 'PT-036', name: 'Vạt giường 2', materialType: 'MDF', length: 1900, width: 700, thickness: 18, base_quantity: 1 },
          { id: 'PT-037', name: 'Chân giữa', materialType: 'Sồi', length: 300, width: 50, thickness: 50, base_quantity: 2 },
          { id: 'PT-038', name: 'Chân phụ', materialType: 'Thông', length: 250, width: 40, thickness: 40, base_quantity: 4 },
        ]
      },
      {
        id: 'SP-003',
        name: 'Full Single Bed - White',
        quantity: 140,
        items: [
          { id: 'PT-001', name: 'Chân trái đầu giường thành phẩm', materialType: 'Sồi', length: 1100, width: 60, thickness: 60, base_quantity: 1 },
          { id: 'PT-002', name: 'Chân phải đầu giường thành phẩm', materialType: 'Sồi', length: 1100, width: 60, thickness: 60, base_quantity: 1 },
          { id: 'PT-003', name: 'Thanh ngang dưới đầu giường', materialType: 'Thông', length: 1400, width: 120, thickness: 25, base_quantity: 1 },
          { id: 'PT-004', name: 'Ván đầu giường', materialType: 'MDF', length: 1400, width: 500, thickness: 18, base_quantity: 1 },
          { id: 'PT-005', name: 'Thanh ngang trên đuôi giường', materialType: 'Thông', length: 1400, width: 100, thickness: 25, base_quantity: 1 },
          { id: 'PT-006', name: 'Thanh ngang dưới đuôi giường', materialType: 'Thông', length: 1400, width: 120, thickness: 25, base_quantity: 1 },
          { id: 'PT-007', name: 'Ván đuôi giường', materialType: 'MDF', length: 1400, width: 450, thickness: 18, base_quantity: 1 },
          { id: 'PT-008', name: 'Thanh ngang trên trái khung lan can sau', materialType: 'Thông', length: 1900, width: 80, thickness: 25, base_quantity: 1 },
          { id: 'PT-009', name: 'Thanh ngang dưới trái khung lan can sau', materialType: 'Thông', length: 1900, width: 80, thickness: 25, base_quantity: 1 },
          { id: 'PT-010', name: 'Thanh nan lan can sau', materialType: 'Bạch dương', length: 450, width: 30, thickness: 20, base_quantity: 8 },
          { id: 'PT-011', name: 'Thanh ngang trên trái khung lan can trước', materialType: 'Thông', length: 1900, width: 80, thickness: 25, base_quantity: 1 },
          { id: 'PT-012', name: 'Thanh ngang dưới trái khung lan can trước', materialType: 'Thông', length: 1900, width: 80, thickness: 25, base_quantity: 1 },
          { id: 'PT-013', name: 'Thanh nan lan can trước', materialType: 'Bạch dương', length: 450, width: 30, thickness: 20, base_quantity: 8 },
          { id: 'PT-014', name: 'Vai giường sau trái', materialType: 'Thông', length: 1900, width: 200, thickness: 30, base_quantity: 1 },
          { id: 'PT-015', name: 'Vai giường sau phải', materialType: 'Thông', length: 1900, width: 200, thickness: 30, base_quantity: 1 },
          { id: 'PT-016', name: 'Vai giường trước trái', materialType: 'Thông', length: 1900, width: 200, thickness: 30, base_quantity: 1 },
          { id: 'PT-017', name: 'Vai giường trước phải', materialType: 'Thông', length: 1900, width: 200, thickness: 30, base_quantity: 1 },
          { id: 'PT-018', name: 'Thanh đỡ vạt giường', materialType: 'Thông', length: 1900, width: 40, thickness: 30, base_quantity: 2 },
          { id: 'PT-019', name: 'Vạt giường 1', materialType: 'LDF', length: 1900, width: 700, thickness: 18, base_quantity: 1 },
          { id: 'PT-020', name: 'Vạt giường 2', materialType: 'LDF', length: 1900, width: 700, thickness: 18, base_quantity: 1 },
          { id: 'PT-021', name: 'Chân giữa', materialType: 'Sồi', length: 300, width: 50, thickness: 50, base_quantity: 2 },
          { id: 'PT-022', name: 'Chân phụ', materialType: 'Thông', length: 250, width: 40, thickness: 40, base_quantity: 4 }
        ]
      }
    ]
  },
  {
    id: 'DH-2026-02', name: 'Đơn hàng VFM 02', products: [
      {
        id: 'SP-010',
        name: 'Pacifica Modeno Twin Bed',
        quantity: 30,
        items: [
          { id: 'PT-001', name: 'Chân trái đầu giường', materialType: 'Sồi', length: 1050, width: 60, thickness: 60, base_quantity: 1 },
          { id: 'PT-002', name: 'Chân phải đầu giường', materialType: 'Sồi', length: 1050, width: 60, thickness: 60, base_quantity: 1 },
          { id: 'PT-003', name: 'Thanh ngang trên đầu giường', materialType: 'Thông', length: 1100, width: 100, thickness: 25, base_quantity: 1 },
          { id: 'PT-004', name: 'Thanh ngang dưới đầu giường', materialType: 'Thông', length: 1100, width: 120, thickness: 25, base_quantity: 1 },
          { id: 'PT-005', name: 'Ván đầu giường', materialType: 'MDF', length: 1000, width: 450, thickness: 18, base_quantity: 1 },

          { id: 'PT-006', name: 'Chân trái đuôi giường', materialType: 'Sồi', length: 450, width: 60, thickness: 60, base_quantity: 1 },
          { id: 'PT-007', name: 'Chân phải đuôi giường', materialType: 'Sồi', length: 450, width: 60, thickness: 60, base_quantity: 1 },
          { id: 'PT-008', name: 'Thanh ngang trên đuôi giường', materialType: 'Thông', length: 1100, width: 90, thickness: 25, base_quantity: 1 },
          { id: 'PT-009', name: 'Thanh ngang dưới đuôi giường', materialType: 'Thông', length: 1100, width: 110, thickness: 25, base_quantity: 1 },
          { id: 'PT-010', name: 'Ván đuôi giường', materialType: 'MDF', length: 1000, width: 250, thickness: 18, base_quantity: 1 },

          { id: 'PT-011', name: 'Vai giường trái', materialType: 'Thông', length: 2000, width: 180, thickness: 30, base_quantity: 1 },
          { id: 'PT-012', name: 'Vai giường phải', materialType: 'Thông', length: 2000, width: 180, thickness: 30, base_quantity: 1 },

          { id: 'PT-013', name: 'Thanh đỡ vạt trái', materialType: 'Thông', length: 1900, width: 40, thickness: 30, base_quantity: 1 },
          { id: 'PT-014', name: 'Thanh đỡ vạt phải', materialType: 'Thông', length: 1900, width: 40, thickness: 30, base_quantity: 1 },
          { id: 'PT-015', name: 'Thanh đỡ giữa', materialType: 'Thông', length: 1900, width: 50, thickness: 35, base_quantity: 1 },

          { id: 'PT-016', name: 'Vạt giường trái', materialType: 'LDF', length: 950, width: 500, thickness: 18, base_quantity: 1 },
          { id: 'PT-017', name: 'Vạt giường phải', materialType: 'LDF', length: 950, width: 500, thickness: 18, base_quantity: 1 },

          { id: 'PT-018', name: 'Nan giường 1', materialType: 'Bạch dương', length: 1000, width: 90, thickness: 18, base_quantity: 1 },
          { id: 'PT-019', name: 'Nan giường 2', materialType: 'Bạch dương', length: 1000, width: 90, thickness: 18, base_quantity: 1 },
          { id: 'PT-020', name: 'Nan giường 3', materialType: 'Bạch dương', length: 1000, width: 90, thickness: 18, base_quantity: 1 },
          { id: 'PT-021', name: 'Nan giường 4', materialType: 'Bạch dương', length: 1000, width: 90, thickness: 18, base_quantity: 1 },
          { id: 'PT-022', name: 'Nan giường 5', materialType: 'Bạch dương', length: 1000, width: 90, thickness: 18, base_quantity: 1 },

          { id: 'PT-023', name: 'Chân giữa trước', materialType: 'Hồ đào', length: 220, width: 50, thickness: 50, base_quantity: 1 },
          { id: 'PT-024', name: 'Chân giữa sau', materialType: 'Hồ đào', length: 220, width: 50, thickness: 50, base_quantity: 1 },

          { id: 'PT-025', name: 'Thanh giằng đầu giường', materialType: 'Thông', length: 950, width: 70, thickness: 18, base_quantity: 1 },
          { id: 'PT-026', name: 'Thanh giằng đuôi giường', materialType: 'Thông', length: 950, width: 70, thickness: 18, base_quantity: 1 },
          { id: 'PT-027', name: 'Thanh liên kết giữa', materialType: 'Sồi', length: 1800, width: 90, thickness: 25, base_quantity: 1 }
        ]
      },
      {
        id: 'SP-011',
        name: 'Pacifica Modeno Queen Bed',
        quantity: 25,
        items: [
          { id: 'PT-001', name: 'Chân trái đầu giường', materialType: 'Dẻ gai', length: 1250, width: 70, thickness: 70, base_quantity: 1 },
          { id: 'PT-002', name: 'Chân phải đầu giường', materialType: 'Dẻ gai', length: 1250, width: 70, thickness: 70, base_quantity: 1 },
          { id: 'PT-003', name: 'Thanh ngang trên đầu giường', materialType: 'Cao su', length: 1650, width: 110, thickness: 30, base_quantity: 1 },
          { id: 'PT-004', name: 'Thanh ngang dưới đầu giường', materialType: 'Cao su', length: 1650, width: 130, thickness: 30, base_quantity: 1 },
          { id: 'PT-005', name: 'Ván đầu giường', materialType: 'MDF', length: 1550, width: 500, thickness: 18, base_quantity: 1 },

          { id: 'PT-006', name: 'Chân trái đuôi giường', materialType: 'Dẻ gai', length: 500, width: 70, thickness: 70, base_quantity: 1 },
          { id: 'PT-007', name: 'Chân phải đuôi giường', materialType: 'Dẻ gai', length: 500, width: 70, thickness: 70, base_quantity: 1 },
          { id: 'PT-008', name: 'Thanh ngang trên đuôi giường', materialType: 'Cao su', length: 1650, width: 100, thickness: 30, base_quantity: 1 },
          { id: 'PT-009', name: 'Thanh ngang dưới đuôi giường', materialType: 'Cao su', length: 1650, width: 120, thickness: 30, base_quantity: 1 },
          { id: 'PT-010', name: 'Ván đuôi giường', materialType: 'LVD', length: 1550, width: 280, thickness: 18, base_quantity: 1 },

          { id: 'PT-011', name: 'Vai giường trái ngoài', materialType: 'Tràm', length: 2050, width: 240, thickness: 30, base_quantity: 1 },
          { id: 'PT-012', name: 'Vai giường phải ngoài', materialType: 'Tràm', length: 2050, width: 240, thickness: 30, base_quantity: 1 },
          { id: 'PT-013', name: 'Vai giường trái trong', materialType: 'LVL', length: 2050, width: 180, thickness: 25, base_quantity: 1 },
          { id: 'PT-014', name: 'Vai giường phải trong', materialType: 'LVL', length: 2050, width: 180, thickness: 25, base_quantity: 1 },

          { id: 'PT-015', name: 'Thanh đỡ vạt trái', materialType: 'LVL', length: 1950, width: 45, thickness: 35, base_quantity: 1 },
          { id: 'PT-016', name: 'Thanh đỡ vạt phải', materialType: 'LVL', length: 1950, width: 45, thickness: 35, base_quantity: 1 },
          { id: 'PT-017', name: 'Thanh đỡ giữa', materialType: 'LVL', length: 1950, width: 65, thickness: 40, base_quantity: 1 },

          { id: 'PT-018', name: 'Vạt giường trái trước', materialType: 'LDF', length: 950, width: 780, thickness: 18, base_quantity: 1 },
          { id: 'PT-019', name: 'Vạt giường trái sau', materialType: 'LDF', length: 950, width: 780, thickness: 18, base_quantity: 1 },
          { id: 'PT-020', name: 'Vạt giường phải trước', materialType: 'LDF', length: 950, width: 780, thickness: 18, base_quantity: 1 },
          { id: 'PT-021', name: 'Vạt giường phải sau', materialType: 'LDF', length: 950, width: 780, thickness: 18, base_quantity: 1 },

          { id: 'PT-022', name: 'Nan giường 1', materialType: 'Bạch dương', length: 1550, width: 90, thickness: 18, base_quantity: 1 },
          { id: 'PT-023', name: 'Nan giường 2', materialType: 'Bạch dương', length: 1550, width: 90, thickness: 18, base_quantity: 1 },
          { id: 'PT-024', name: 'Nan giường 3', materialType: 'Bạch dương', length: 1550, width: 90, thickness: 18, base_quantity: 1 },
          { id: 'PT-025', name: 'Nan giường 4', materialType: 'Bạch dương', length: 1550, width: 90, thickness: 18, base_quantity: 1 },

          { id: 'PT-028', name: 'Chân giữa trước', materialType: 'Hồ đào', length: 230, width: 60, thickness: 60, base_quantity: 1 },
          { id: 'PT-029', name: 'Chân giữa sau', materialType: 'Hồ đào', length: 230, width: 60, thickness: 60, base_quantity: 1 },

          { id: 'PT-030', name: 'Chân phụ trái', materialType: 'Tràm', length: 180, width: 40, thickness: 40, base_quantity: 2 },
          { id: 'PT-031', name: 'Chân phụ phải', materialType: 'Tràm', length: 180, width: 40, thickness: 40, base_quantity: 2 },

          { id: 'PT-032', name: 'Thanh giằng đầu giường', materialType: 'Cao su', length: 1500, width: 80, thickness: 20, base_quantity: 1 },
          { id: 'PT-033', name: 'Thanh giằng đuôi giường', materialType: 'Cao su', length: 1500, width: 80, thickness: 20, base_quantity: 1 },
          { id: 'PT-034', name: 'Thanh liên kết giữa', materialType: 'Dẻ gai', length: 1600, width: 100, thickness: 25, base_quantity: 1 },
          { id: 'PT-035', name: 'Thanh tăng cứng đáy', materialType: 'LVL', length: 1400, width: 60, thickness: 20, base_quantity: 2 }
        ]
      },
      {
        id: 'SP-012',
        name: 'Pacifica Modeno King Bed',
        quantity: 67,
        items: [
          { id: 'PT-001', name: 'Chân trái đầu giường', materialType: 'Dẻ gai', length: 1350, width: 75, thickness: 75, base_quantity: 1 },
          { id: 'PT-002', name: 'Chân phải đầu giường', materialType: 'Dẻ gai', length: 1350, width: 75, thickness: 75, base_quantity: 1 },
          { id: 'PT-003', name: 'Thanh ngang trên đầu giường', materialType: 'Cao su', length: 2000, width: 120, thickness: 30, base_quantity: 1 },
          { id: 'PT-004', name: 'Thanh ngang dưới đầu giường', materialType: 'Cao su', length: 2000, width: 140, thickness: 30, base_quantity: 1 },
          { id: 'PT-005', name: 'Ván đầu giường', materialType: 'MDF', length: 1900, width: 550, thickness: 18, base_quantity: 1 },

          { id: 'PT-006', name: 'Chân trái đuôi giường', materialType: 'Dẻ gai', length: 500, width: 70, thickness: 70, base_quantity: 1 },
          { id: 'PT-007', name: 'Chân phải đuôi giường', materialType: 'Dẻ gai', length: 500, width: 70, thickness: 70, base_quantity: 1 },
          { id: 'PT-008', name: 'Thanh ngang trên đuôi giường', materialType: 'Cao su', length: 2000, width: 100, thickness: 30, base_quantity: 1 },
          { id: 'PT-009', name: 'Thanh ngang dưới đuôi giường', materialType: 'Cao su', length: 2000, width: 120, thickness: 30, base_quantity: 1 },
          { id: 'PT-010', name: 'Ván đuôi giường', materialType: 'LVD', length: 1900, width: 300, thickness: 18, base_quantity: 1 },

          { id: 'PT-011', name: 'Vai giường trái ngoài', materialType: 'Tràm', length: 2150, width: 260, thickness: 30, base_quantity: 1 },
          { id: 'PT-012', name: 'Vai giường phải ngoài', materialType: 'Tràm', length: 2150, width: 260, thickness: 30, base_quantity: 1 },
          { id: 'PT-013', name: 'Vai giường trái trong', materialType: 'LVL', length: 2150, width: 180, thickness: 25, base_quantity: 1 },
          { id: 'PT-014', name: 'Vai giường phải trong', materialType: 'LVL', length: 2150, width: 180, thickness: 25, base_quantity: 1 },

          { id: 'PT-015', name: 'Thanh đỡ vạt trái', materialType: 'LVL', length: 2050, width: 45, thickness: 35, base_quantity: 1 },
          { id: 'PT-016', name: 'Thanh đỡ vạt phải', materialType: 'LVL', length: 2050, width: 45, thickness: 35, base_quantity: 1 },
          { id: 'PT-017', name: 'Thanh đỡ giữa', materialType: 'LVL', length: 2050, width: 70, thickness: 40, base_quantity: 1 },

          { id: 'PT-018', name: 'Vạt giường trái trước', materialType: 'LDF', length: 1000, width: 950, thickness: 18, base_quantity: 1 },
          { id: 'PT-019', name: 'Vạt giường trái sau', materialType: 'LDF', length: 1000, width: 950, thickness: 18, base_quantity: 1 },
          { id: 'PT-020', name: 'Vạt giường phải trước', materialType: 'LDF', length: 1000, width: 950, thickness: 18, base_quantity: 1 },
          { id: 'PT-021', name: 'Vạt giường phải sau', materialType: 'LDF', length: 1000, width: 950, thickness: 18, base_quantity: 1 },

          { id: 'PT-022', name: 'Nan giường 1', materialType: 'Bạch dương', length: 1900, width: 90, thickness: 18, base_quantity: 1 },
          { id: 'PT-023', name: 'Nan giường 2', materialType: 'Bạch dương', length: 1900, width: 90, thickness: 18, base_quantity: 1 },
          { id: 'PT-024', name: 'Nan giường 3', materialType: 'Bạch dương', length: 1900, width: 90, thickness: 18, base_quantity: 1 },
          { id: 'PT-025', name: 'Nan giường 4', materialType: 'Bạch dương', length: 1900, width: 90, thickness: 18, base_quantity: 1 },

          { id: 'PT-026', name: 'Chân giữa trước', materialType: 'Hồ đào', length: 230, width: 60, thickness: 60, base_quantity: 1 },
          { id: 'PT-027', name: 'Chân giữa sau', materialType: 'Hồ đào', length: 230, width: 60, thickness: 60, base_quantity: 1 },
          { id: 'PT-028', name: 'Thanh liên kết giữa', materialType: 'Dẻ gai', length: 1800, width: 100, thickness: 25, base_quantity: 1 }
        ]
      },
      {
        id: 'SP-013',
        name: 'Pacifica Modeno Peyton Quinn 1-Drawer Nightstand',
        quantity: 40,
        items: [
          { id: 'PT-001', name: 'Mặt hông trái', materialType: 'MDF', length: 550, width: 420, thickness: 18, base_quantity: 1 },
          { id: 'PT-002', name: 'Mặt hông phải', materialType: 'MDF', length: 550, width: 420, thickness: 18, base_quantity: 1 },
          { id: 'PT-003', name: 'Mặt trên tủ', materialType: 'Dẻ gai', length: 500, width: 420, thickness: 25, base_quantity: 1 },
          { id: 'PT-004', name: 'Mặt đáy tủ', materialType: 'Cao su', length: 500, width: 420, thickness: 18, base_quantity: 1 },
          { id: 'PT-005', name: 'Thanh giằng sau trên', materialType: 'Thông', length: 460, width: 70, thickness: 18, base_quantity: 1 },
          { id: 'PT-006', name: 'Thanh giằng sau dưới', materialType: 'Thông', length: 460, width: 70, thickness: 18, base_quantity: 1 },

          { id: 'PT-007', name: 'Mặt trước ngăn kéo', materialType: 'Dẻ gai', length: 420, width: 160, thickness: 18, base_quantity: 1 },
          { id: 'PT-008', name: 'Hông trái ngăn kéo', materialType: 'Bạch dương', length: 350, width: 140, thickness: 15, base_quantity: 1 },
          { id: 'PT-009', name: 'Hông phải ngăn kéo', materialType: 'Bạch dương', length: 350, width: 140, thickness: 15, base_quantity: 1 },
          { id: 'PT-010', name: 'Thanh sau ngăn kéo', materialType: 'Tràm', length: 380, width: 140, thickness: 15, base_quantity: 1 },
          { id: 'PT-011', name: 'Đáy ngăn kéo', materialType: 'LVD', length: 380, width: 320, thickness: 5, base_quantity: 1 },

          { id: 'PT-012', name: 'Mặt hậu tủ', materialType: 'LDF', length: 500, width: 500, thickness: 5, base_quantity: 1 },

          { id: 'PT-013', name: 'Đợt dưới tủ', materialType: 'LVL', length: 460, width: 380, thickness: 18, base_quantity: 1 },

          { id: 'PT-014', name: 'Chân trước trái', materialType: 'Hồ đào', length: 120, width: 50, thickness: 50, base_quantity: 1 },
          { id: 'PT-015', name: 'Chân trước phải', materialType: 'Hồ đào', length: 120, width: 50, thickness: 50, base_quantity: 1 },
          { id: 'PT-016', name: 'Chân sau trái', materialType: 'Hồ đào', length: 120, width: 50, thickness: 50, base_quantity: 1 },
          { id: 'PT-017', name: 'Chân sau phải', materialType: 'Hồ đào', length: 120, width: 50, thickness: 50, base_quantity: 1 },

          { id: 'PT-018', name: 'Thanh liên kết chân trước', materialType: 'Cao su', length: 420, width: 50, thickness: 20, base_quantity: 1 },
          { id: 'PT-019', name: 'Thanh liên kết chân sau', materialType: 'Cao su', length: 420, width: 50, thickness: 20, base_quantity: 1 },
          { id: 'PT-020', name: 'Thanh liên kết chân trái', materialType: null, length: 320, width: 50, thickness: 20, base_quantity: 1 },
          { id: 'PT-021', name: 'Thanh liên kết chân phải', materialType: null, length: 320, width: 50, thickness: 20, base_quantity: 1 },

          { id: 'PT-022', name: 'Thanh ray trái ngăn kéo', materialType: 'LVL', length: 350, width: 35, thickness: 15, base_quantity: 1 },
          { id: 'PT-023', name: 'Thanh ray phải ngăn kéo', materialType: 'LVL', length: 350, width: 35, thickness: 15, base_quantity: 1 },

          { id: 'PT-024', name: 'Thanh tăng cứng mặt trên', materialType: 'Thông', length: 420, width: 40, thickness: 18, base_quantity: 1 },
          { id: 'PT-025', name: 'Thanh tăng cứng đáy', materialType: 'Thông', length: 420, width: 40, thickness: 18, base_quantity: 1 },

          { id: 'PT-026', name: 'Nẹp trang trí trái', materialType: 'Sồi', length: 500, width: 25, thickness: 12, base_quantity: 1 },
          { id: 'PT-027', name: 'Nẹp trang trí phải', materialType: 'Sồi', length: 500, width: 25, thickness: 12, base_quantity: 1 },

          { id: 'PT-028', name: 'Nẹp đáy trước', materialType: 'Dẻ gai', length: 460, width: 35, thickness: 15, base_quantity: 1 },
          { id: 'PT-029', name: 'Nẹp đáy sau', materialType: 'Dẻ gai', length: 460, width: 35, thickness: 15, base_quantity: 1 },
          { id: 'PT-030', name: 'Nẹp hông trái', materialType: 'Dẻ gai', length: 550, width: 35, thickness: 15, base_quantity: 1 },
          { id: 'PT-031', name: 'Nẹp hông phải', materialType: 'Dẻ gai', length: 550, width: 35, thickness: 15, base_quantity: 1 }
        ]
      },
      {
  id: 'SP-014',
  name: 'Pacifica Modeno Full Bed',
  quantity: 50,
  items: [
    { id: 'PT-001', name: 'Chân trái đầu giường', materialType: 'Sồi', length: 1150, width: 65, thickness: 65, base_quantity: 1 },
    { id: 'PT-002', name: 'Chân phải đầu giường', materialType: 'Sồi', length: 1150, width: 65, thickness: 65, base_quantity: 1 },
    { id: 'PT-003', name: 'Thanh ngang trên đầu giường', materialType: 'Cao su', length: 1450, width: 120, thickness: 30, base_quantity: 1 },
    { id: 'PT-004', name: 'Thanh ngang dưới đầu giường', materialType: 'Cao su', length: 1450, width: 140, thickness: 30, base_quantity: 1 },
    { id: 'PT-005', name: 'Ván đầu giường', materialType: 'MDF', length: 1350, width: 480, thickness: 18, base_quantity: 1 },

    { id: 'PT-006', name: 'Chân trái đuôi giường', materialType: 'Sồi', length: 450, width: 65, thickness: 65, base_quantity: 1 },
    { id: 'PT-007', name: 'Chân phải đuôi giường', materialType: 'Sồi', length: 450, width: 65, thickness: 65, base_quantity: 1 },
    { id: 'PT-008', name: 'Thanh ngang trên đuôi giường', materialType: 'Cao su', length: 1450, width: 100, thickness: 30, base_quantity: 1 },
    { id: 'PT-009', name: 'Thanh ngang dưới đuôi giường', materialType: 'Cao su', length: 1450, width: 120, thickness: 30, base_quantity: 1 },
    { id: 'PT-010', name: 'Ván đuôi giường', materialType: 'LVD', length: 1350, width: 260, thickness: 18, base_quantity: 1 },

    { id: 'PT-011', name: 'Vai giường trái ngoài', materialType: 'Tràm', length: 2000, width: 220, thickness: 30, base_quantity: 1 },
    { id: 'PT-012', name: 'Vai giường phải ngoài', materialType: 'Tràm', length: 2000, width: 220, thickness: 30, base_quantity: 1 },
    { id: 'PT-013', name: 'Vai giường trái trong', materialType: 'LVL', length: 2000, width: 180, thickness: 25, base_quantity: 1 },
    { id: 'PT-014', name: 'Vai giường phải trong', materialType: 'LVL', length: 2000, width: 180, thickness: 25, base_quantity: 1 },

    { id: 'PT-015', name: 'Thanh đỡ vạt trái', materialType: 'LVL', length: 1900, width: 45, thickness: 35, base_quantity: 1 },
    { id: 'PT-016', name: 'Thanh đỡ vạt phải', materialType: 'LVL', length: 1900, width: 45, thickness: 35, base_quantity: 1 },
    { id: 'PT-017', name: 'Thanh đỡ giữa', materialType: 'LVL', length: 1900, width: 60, thickness: 40, base_quantity: 1 },

    { id: 'PT-018', name: 'Vạt giường trái trước', materialType: 'LDF', length: 950, width: 700, thickness: 18, base_quantity: 1 },
    { id: 'PT-019', name: 'Vạt giường trái sau', materialType: 'LDF', length: 950, width: 700, thickness: 18, base_quantity: 1 },
    { id: 'PT-020', name: 'Vạt giường phải trước', materialType: 'LDF', length: 950, width: 700, thickness: 18, base_quantity: 1 },
    { id: 'PT-021', name: 'Vạt giường phải sau', materialType: 'LDF', length: 950, width: 700, thickness: 18, base_quantity: 1 },

    { id: 'PT-022', name: 'Nan giường 1', materialType: 'Bạch dương', length: 1400, width: 90, thickness: 18, base_quantity: 1 },
    { id: 'PT-023', name: 'Nan giường 2', materialType: 'Bạch dương', length: 1400, width: 90, thickness: 18, base_quantity: 1 },
    { id: 'PT-024', name: 'Nan giường 3', materialType: 'Bạch dương', length: 1400, width: 90, thickness: 18, base_quantity: 1 },
    { id: 'PT-025', name: 'Nan giường 4', materialType: 'Bạch dương', length: 1400, width: 90, thickness: 18, base_quantity: 1 },

    { id: 'PT-026', name: 'Chân giữa trước', materialType: 'Hồ đào', length: 220, width: 55, thickness: 55, base_quantity: 1 },
    { id: 'PT-027', name: 'Chân giữa sau', materialType: 'Hồ đào', length: 220, width: 55, thickness: 55, base_quantity: 1 },

    { id: 'PT-028', name: 'Thanh liên kết giữa', materialType: 'Dẻ gai', length: 1700, width: 90, thickness: 25, base_quantity: 1 },
    { id: 'PT-029', name: 'Thanh tăng cứng đáy', materialType: 'LVL', length: 1300, width: 60, thickness: 20, base_quantity: 2 }
  ]
},
{
  id: 'SP-015',
  name: 'Pacifica Modeno Parkrose 6-Drawer Dresser',
  quantity: 86,
  items: [
    { id: 'PT-001', name: 'Mặt hông trái tủ', materialType: 'MDF', length: 850, width: 500, thickness: 18, base_quantity: 1 },
    { id: 'PT-002', name: 'Mặt hông phải tủ', materialType: 'MDF', length: 850, width: 500, thickness: 18, base_quantity: 1 },
    { id: 'PT-003', name: 'Mặt trên tủ', materialType: 'Dẻ gai', length: 1500, width: 500, thickness: 25, base_quantity: 1 },
    { id: 'PT-004', name: 'Mặt đáy tủ', materialType: 'Cao su', length: 1500, width: 500, thickness: 18, base_quantity: 1 },

    { id: 'PT-005', name: 'Thanh giằng sau trên', materialType: 'Thông', length: 1450, width: 80, thickness: 18, base_quantity: 1 },
    { id: 'PT-006', name: 'Thanh giằng sau dưới', materialType: 'Thông', length: 1450, width: 80, thickness: 18, base_quantity: 1 },

    { id: 'PT-007', name: 'Vách ngăn trái', materialType: 'LVL', length: 800, width: 450, thickness: 18, base_quantity: 1 },
    { id: 'PT-008', name: 'Vách ngăn phải', materialType: 'LVL', length: 800, width: 450, thickness: 18, base_quantity: 1 },

    { id: 'PT-009', name: 'Mặt hậu tủ', materialType: 'LDF', length: 1450, width: 800, thickness: 5, base_quantity: 1 },

    { id: 'PT-010', name: 'Mặt trước ngăn kéo 1', materialType: 'Sồi', length: 700, width: 180, thickness: 18, base_quantity: 1 },
    { id: 'PT-011', name: 'Mặt trước ngăn kéo 2', materialType: 'Sồi', length: 700, width: 180, thickness: 18, base_quantity: 1 },
    { id: 'PT-012', name: 'Mặt trước ngăn kéo 3', materialType: 'Sồi', length: 700, width: 180, thickness: 18, base_quantity: 1 },
    { id: 'PT-013', name: 'Mặt trước ngăn kéo 4', materialType: 'Sồi', length: 700, width: 180, thickness: 18, base_quantity: 1 },
    { id: 'PT-014', name: 'Mặt trước ngăn kéo 5', materialType: 'Sồi', length: 700, width: 180, thickness: 18, base_quantity: 1 },
    { id: 'PT-015', name: 'Mặt trước ngăn kéo 6', materialType: 'Sồi', length: 700, width: 180, thickness: 18, base_quantity: 1 },

    { id: 'PT-016', name: 'Hông trái ngăn kéo', materialType: 'Bạch dương', length: 420, width: 150, thickness: 15, base_quantity: 6 },
    { id: 'PT-017', name: 'Hông phải ngăn kéo', materialType: 'Bạch dương', length: 420, width: 150, thickness: 15, base_quantity: 6 },

    { id: 'PT-018', name: 'Thanh sau ngăn kéo', materialType: 'Tràm', length: 660, width: 150, thickness: 15, base_quantity: 6 },

    { id: 'PT-019', name: 'Đáy ngăn kéo 1', materialType: 'LVD', length: 660, width: 400, thickness: 5, base_quantity: 1 },
    { id: 'PT-020', name: 'Đáy ngăn kéo 2', materialType: 'LVD', length: 660, width: 400, thickness: 5, base_quantity: 1 },
    { id: 'PT-021', name: 'Đáy ngăn kéo 3', materialType: 'LVD', length: 660, width: 400, thickness: 5, base_quantity: 1 },
    { id: 'PT-022', name: 'Đáy ngăn kéo 4', materialType: 'LVD', length: 660, width: 400, thickness: 5, base_quantity: 1 },
    { id: 'PT-023', name: 'Đáy ngăn kéo 5', materialType: 'LVD', length: 660, width: 400, thickness: 5, base_quantity: 1 },
    { id: 'PT-024', name: 'Đáy ngăn kéo 6', materialType: 'LVD', length: 660, width: 400, thickness: 5, base_quantity: 1 },

    { id: 'PT-025', name: 'Chân trước trái', materialType: 'Hồ đào', length: 120, width: 60, thickness: 60, base_quantity: 1 },
    { id: 'PT-026', name: 'Chân trước phải', materialType: 'Hồ đào', length: 120, width: 60, thickness: 60, base_quantity: 1 },
    { id: 'PT-027', name: 'Chân sau trái', materialType: 'Hồ đào', length: 120, width: 60, thickness: 60, base_quantity: 1 },
    { id: 'PT-028', name: 'Chân sau phải', materialType: 'Hồ đào', length: 120, width: 60, thickness: 60, base_quantity: 1 },
    { id: 'PT-029', name: 'Thanh liên kết chân trước', materialType: 'Cao su', length: 660, width: 60, thickness: 20, base_quantity: 1 },
    { id: 'PT-030', name: 'Thanh liên kết chân sau', materialType: 'Cao su', length: 660, width: 60, thickness: 20, base_quantity: 1 },
    { id: 'PT-031', name: 'Thanh liên kết chân trái', materialType: null, length: 400, width: 60, thickness: 20, base_quantity: 1 },
    { id: 'PT-032', name: 'Thanh liên kết chân phải', materialType: null, length: 400, width: 60, thickness: 20, base_quantity: 1 },

    { id: 'PT-033', name: 'Thanh ray trái ngăn kéo', materialType: 'LVL', length: 420, width: 35, thickness: 15, base_quantity: 6 },
    { id: 'PT-034', name: 'Thanh ray phải ngăn kéo', materialType: 'LVL', length: 420, width: 35, thickness: 15, base_quantity: 6 },

    { id: 'PT-035', name: 'Thanh tăng cứng mặt trên', materialType: 'Thông', length: 1500, width: 40, thickness: 18, base_quantity: 1 },
    { id: 'PT-036', name: 'Thanh tăng cứng đáy', materialType: 'Thông', length: 1500, width: 40, thickness: 18, base_quantity: 1 },

    { id: 'PT-037', name: 'Nẹp trang trí trái', materialType: 'Sồi', length: 1500, width: 25, thickness: 12, base_quantity: 1 },
    { id: 'PT-038', name: 'Nẹp trang trí phải', materialType: 'Sồi', length: 1500, width: 25, thickness: 12, base_quantity: 1 },

    { id: 'PT-039', name: 'Nẹp đáy trước', materialType: 'Dẻ gai', length: 1450, width: 35, thickness: 15, base_quantity: 1 },
    { id: 'PT-040', name: 'Nẹp đáy sau', materialType: 'Dẻ gai', length: 1450, width: 35, thickness: 15, base_quantity: 1 },
    { id: 'PT-041', name: 'Nẹp hông trái', materialType: 'Dẻ gai', length: 850, width: 35, thickness: 15, base_quantity: 1 },
    { id: 'PT-042', name: 'Nẹp hông phải', materialType: 'Dẻ gai', length: 850, width: 35, thickness: 15, base_quantity: 1 }
  ]
},
{
  id: 'SP-016',
  name: 'Pacifica Modeno Parkrose 4-Drawer Dresser',
  quantity: 58,
  items: [
    { id: 'PT-001', name: 'Mặt hông trái tủ', materialType: 'MDF', length: 750, width: 480, thickness: 18, base_quantity: 1 },
    { id: 'PT-002', name: 'Mặt hông phải tủ', materialType: 'MDF', length: 750, width: 480, thickness: 18, base_quantity: 1 },
    { id: 'PT-003', name: 'Mặt trên tủ', materialType: 'Dẻ gai', length: 1200, width: 480, thickness: 25, base_quantity: 1 },
    { id: 'PT-004', name: 'Mặt đáy tủ', materialType: 'Cao su', length: 1200, width: 480, thickness: 18, base_quantity: 1 },

    { id: 'PT-005', name: 'Thanh giằng sau trên', materialType: 'Thông', length: 1150, width: 75, thickness: 18, base_quantity: 1 },
    { id: 'PT-006', name: 'Thanh giằng sau dưới', materialType: 'Thông', length: 1150, width: 75, thickness: 18, base_quantity: 1 },

    { id: 'PT-007', name: 'Vách ngăn giữa', materialType: 'LVL', length: 700, width: 430, thickness: 18, base_quantity: 1 },

    { id: 'PT-008', name: 'Mặt hậu tủ', materialType: 'LDF', length: 1150, width: 700, thickness: 5, base_quantity: 1 },

    { id: 'PT-009', name: 'Mặt trước ngăn kéo 1', materialType: 'Sồi', length: 550, width: 180, thickness: 18, base_quantity: 1 },
    { id: 'PT-010', name: 'Mặt trước ngăn kéo 2', materialType: 'Sồi', length: 550, width: 180, thickness: 18, base_quantity: 1 },
    { id: 'PT-011', name: 'Mặt trước ngăn kéo 3', materialType: 'Sồi', length: 550, width: 180, thickness: 18, base_quantity: 1 },
    { id: 'PT-012', name: 'Mặt trước ngăn kéo 4', materialType: 'Sồi', length: 550, width: 180, thickness: 18, base_quantity: 1 },

    { id: 'PT-013', name: 'Hông trái ngăn kéo', materialType: 'Bạch dương', length: 400, width: 150, thickness: 15, base_quantity: 4 },
    { id: 'PT-014', name: 'Hông phải ngăn kéo', materialType: 'Bạch dương', length: 400, width: 150, thickness: 15, base_quantity: 4 },

    { id: 'PT-015', name: 'Thanh sau ngăn kéo', materialType: 'Tràm', length: 500, width: 150, thickness: 15, base_quantity: 4 },

    { id: 'PT-016', name: 'Đáy ngăn kéo 1', materialType: 'LVD', length: 500, width: 380, thickness: 5, base_quantity: 1 },
    { id: 'PT-017', name: 'Đáy ngăn kéo 2', materialType: 'LVD', length: 500, width: 380, thickness: 5, base_quantity: 1 },
    { id: 'PT-018', name: 'Đáy ngăn kéo 3', materialType: 'LVD', length: 500, width: 380, thickness: 5, base_quantity: 1 },
    { id: 'PT-019', name: 'Đáy ngăn kéo 4', materialType: 'LVD', length: 500, width: 380, thickness: 5, base_quantity: 1 },

    { id: 'PT-020', name: 'Chân trước trái', materialType: 'Hồ đào', length: 110, width: 55, thickness: 55, base_quantity: 1 },
    { id: 'PT-021', name: 'Chân trước phải', materialType: 'Hồ đào', length: 110, width: 55, thickness: 55, base_quantity: 1 },
    { id: 'PT-022', name: 'Chân sau trái', materialType: 'Hồ đào', length: 110, width: 55, thickness: 55, base_quantity: 1 },
    { id: 'PT-023', name: 'Chân sau phải', materialType: 'Hồ đào', length: 110, width: 55, thickness: 55, base_quantity: 1 },

    { id: 'PT-024', name: 'Thanh liên kết chân trước', materialType: 'Cao su', length: 1050, width: 50, thickness: 20, base_quantity: 1 },
    { id: 'PT-025', name: 'Thanh liên kết chân sau', materialType: 'Cao su', length: 1050, width: 50, thickness: 20, base_quantity: 1 },

    { id: 'PT-026', name: 'Thanh ray trái ngăn kéo', materialType: 'LVL', length: 400, width: 35, thickness: 15, base_quantity: 4 },
    { id: 'PT-027', name: 'Thanh ray phải ngăn kéo', materialType: 'LVL', length: 400, width: 35, thickness: 15, base_quantity: 4 },

    { id: 'PT-028', name: 'Thanh tăng cứng mặt trên', materialType: 'Thông', length: 1050, width: 40, thickness: 18, base_quantity: 1 },
    { id: 'PT-029', name: 'Thanh tăng cứng đáy', materialType: 'Thông', length: 1050, width: 40, thickness: 18, base_quantity: 1 },
    
    { id: 'PT-030', name: 'Nẹp trang trí trái', materialType: 'Sồi', length: 1200, width: 25, thickness: 12, base_quantity: 1 },
    { id: 'PT-031', name: 'Nẹp trang trí phải', materialType: 'Sồi', length: 1200, width: 25, thickness: 12, base_quantity: 1 },
    { id: 'PT-032', name: 'Nẹp đáy trước', materialType: 'Dẻ gai', length: 1050, width: 35, thickness: 15, base_quantity: 1 },
    { id: 'PT-033', name: 'Nẹp đáy sau', materialType: 'Dẻ gai', length: 1050, width: 35, thickness: 15, base_quantity: 1 },
    { id: 'PT-034', name: 'Nẹp hông trái', materialType: 'Dẻ gai', length: 750, width: 35, thickness: 15, base_quantity: 1 },
    { id: 'PT-035', name: 'Nẹp hông phải', materialType: 'Dẻ gai', length: 750, width: 35, thickness: 15, base_quantity: 1 }
  ]
}

    ]
  },
  {
    id: 'DH-2026-03', name: 'Đơn hàng VFM 03', products: [
      {
        id: 'SP-004',
        name: 'ABIGAIL 5-DRAWER CHEST - Beech Stain',
        quantity: 225,
        items: [
          { id: 'PT-001', name: 'Mặt hông trái tủ', materialType: 'MDF', length: 1200, width: 450, thickness: 18, base_quantity: 1 },
          { id: 'PT-002', name: 'Mặt hông phải tủ', materialType: 'MDF', length: 1200, width: 450, thickness: 18, base_quantity: 1 },
          { id: 'PT-003', name: 'Mặt trên tủ', materialType: 'Sồi', length: 900, width: 450, thickness: 25, base_quantity: 1 },
          { id: 'PT-004', name: 'Mặt đáy tủ', materialType: 'Thông', length: 900, width: 450, thickness: 18, base_quantity: 1 },
          { id: 'PT-005', name: 'Thanh giằng sau trên', materialType: 'Thông', length: 850, width: 80, thickness: 18, base_quantity: 1 },
          { id: 'PT-006', name: 'Thanh giằng sau dưới', materialType: 'Thông', length: 850, width: 80, thickness: 18, base_quantity: 1 },
          { id: 'PT-007', name: 'Vách ngăn trái', materialType: 'MDF', length: 1100, width: 400, thickness: 18, base_quantity: 1 },
          { id: 'PT-008', name: 'Vách ngăn phải', materialType: 'MDF', length: 1100, width: 400, thickness: 18, base_quantity: 1 },
          { id: 'PT-009', name: 'Mặt hậu tủ', materialType: 'LDF', length: 1150, width: 850, thickness: 5, base_quantity: 1 },

          { id: 'PT-010', name: 'Mặt trước ngăn kéo 1', materialType: 'Sồi', length: 800, width: 180, thickness: 18, base_quantity: 1 },
          { id: 'PT-011', name: 'Mặt trước ngăn kéo 2', materialType: 'Sồi', length: 800, width: 180, thickness: 18, base_quantity: 1 },
          { id: 'PT-012', name: 'Mặt trước ngăn kéo 3', materialType: 'Sồi', length: 800, width: 180, thickness: 18, base_quantity: 1 },
          { id: 'PT-013', name: 'Mặt trước ngăn kéo 4', materialType: 'Sồi', length: 800, width: 180, thickness: 18, base_quantity: 1 },
          { id: 'PT-014', name: 'Mặt trước ngăn kéo 5', materialType: 'Sồi', length: 800, width: 180, thickness: 18, base_quantity: 1 },

          { id: 'PT-015', name: 'Hông trái ngăn kéo 1', materialType: 'Bạch dương', length: 400, width: 150, thickness: 15, base_quantity: 1 },
          { id: 'PT-016', name: 'Hông phải ngăn kéo 1', materialType: 'Bạch dương', length: 400, width: 150, thickness: 15, base_quantity: 1 },
          { id: 'PT-017', name: 'Hông trái ngăn kéo 2', materialType: 'Bạch dương', length: 400, width: 150, thickness: 15, base_quantity: 1 },
          { id: 'PT-018', name: 'Hông phải ngăn kéo 2', materialType: 'Bạch dương', length: 400, width: 150, thickness: 15, base_quantity: 1 },
          { id: 'PT-019', name: 'Hông trái ngăn kéo 3', materialType: 'Bạch dương', length: 400, width: 150, thickness: 15, base_quantity: 1 },
          { id: 'PT-020', name: 'Hông phải ngăn kéo 3', materialType: 'Bạch dương', length: 400, width: 150, thickness: 15, base_quantity: 1 },
          { id: 'PT-021', name: 'Hông trái ngăn kéo 4', materialType: 'Bạch dương', length: 400, width: 150, thickness: 15, base_quantity: 1 },
          { id: 'PT-022', name: 'Hông phải ngăn kéo 4', materialType: 'Bạch dương', length: 400, width: 150, thickness: 15, base_quantity: 1 },
          { id: 'PT-023', name: 'Hông trái ngăn kéo 5', materialType: 'Bạch dương', length: 400, width: 150, thickness: 15, base_quantity: 1 },
          { id: 'PT-024', name: 'Hông phải ngăn kéo 5', materialType: 'Bạch dương', length: 400, width: 150, thickness: 15, base_quantity: 1 },

          { id: 'PT-025', name: 'Đáy ngăn kéo 1', materialType: 'LDF', length: 760, width: 380, thickness: 5, base_quantity: 1 },
          { id: 'PT-026', name: 'Đáy ngăn kéo 2', materialType: 'LDF', length: 760, width: 380, thickness: 5, base_quantity: 1 },
          { id: 'PT-027', name: 'Đáy ngăn kéo 3', materialType: 'LDF', length: 760, width: 380, thickness: 5, base_quantity: 1 },
          { id: 'PT-028', name: 'Đáy ngăn kéo 4', materialType: 'LDF', length: 760, width: 380, thickness: 5, base_quantity: 1 },
          { id: 'PT-029', name: 'Đáy ngăn kéo 5', materialType: 'LDF', length: 760, width: 380, thickness: 5, base_quantity: 1 },

          { id: 'PT-030', name: 'Chân trước trái', materialType: 'Hồ đào', length: 120, width: 50, thickness: 50, base_quantity: 1 },
          { id: 'PT-031', name: 'Chân trước phải', materialType: 'Hồ đào', length: 120, width: 50, thickness: 50, base_quantity: 1 },
          { id: 'PT-032', name: 'Chân sau trái', materialType: 'Hồ đào', length: 120, width: 50, thickness: 50, base_quantity: 1 }
        ]
      },
      {
        id: 'SP-005',
        name: 'ABIGAIL KING BED - Beech Stain',
        quantity: 80,
        items: [
          { id: 'PT-001', name: 'Chân trái đầu giường', materialType: 'Sồi', length: 1300, width: 70, thickness: 70, base_quantity: 1 },
          { id: 'PT-002', name: 'Chân phải đầu giường', materialType: 'Sồi', length: 1300, width: 70, thickness: 70, base_quantity: 1 },
          { id: 'PT-003', name: 'Thanh ngang trên đầu giường', materialType: 'Thông', length: 2000, width: 120, thickness: 30, base_quantity: 1 },
          { id: 'PT-004', name: 'Thanh ngang dưới đầu giường', materialType: 'Thông', length: 2000, width: 140, thickness: 30, base_quantity: 1 },
          { id: 'PT-005', name: 'Ván đầu giường trái', materialType: 'MDF', length: 950, width: 500, thickness: 18, base_quantity: 1 },
          { id: 'PT-006', name: 'Ván đầu giường phải', materialType: 'MDF', length: 950, width: 500, thickness: 18, base_quantity: 1 },

          { id: 'PT-007', name: 'Chân trái đuôi giường', materialType: 'Sồi', length: 500, width: 70, thickness: 70, base_quantity: 1 },
          { id: 'PT-008', name: 'Chân phải đuôi giường', materialType: 'Sồi', length: 500, width: 70, thickness: 70, base_quantity: 1 },
          { id: 'PT-009', name: 'Thanh ngang trên đuôi giường', materialType: 'Thông', length: 2000, width: 100, thickness: 30, base_quantity: 1 },
          { id: 'PT-010', name: 'Thanh ngang dưới đuôi giường', materialType: 'Thông', length: 2000, width: 120, thickness: 30, base_quantity: 1 },
          { id: 'PT-011', name: 'Ván đuôi giường', materialType: 'MDF', length: 1900, width: 300, thickness: 18, base_quantity: 1 },

          { id: 'PT-012', name: 'Vai giường trái ngoài', materialType: 'Thông', length: 2100, width: 250, thickness: 30, base_quantity: 1 },
          { id: 'PT-013', name: 'Vai giường phải ngoài', materialType: 'Thông', length: 2100, width: 250, thickness: 30, base_quantity: 1 },
          { id: 'PT-014', name: 'Vai giường trái trong', materialType: 'Thông', length: 2100, width: 180, thickness: 25, base_quantity: 1 },
          { id: 'PT-015', name: 'Vai giường phải trong', materialType: 'Thông', length: 2100, width: 180, thickness: 25, base_quantity: 1 },

          { id: 'PT-016', name: 'Thanh đỡ vạt trái', materialType: 'Thông', length: 2000, width: 40, thickness: 30, base_quantity: 1 },
          { id: 'PT-017', name: 'Thanh đỡ vạt phải', materialType: 'Thông', length: 2000, width: 40, thickness: 30, base_quantity: 1 },
          { id: 'PT-018', name: 'Thanh đỡ giữa', materialType: 'Thông', length: 2000, width: 60, thickness: 40, base_quantity: 1 },

          { id: 'PT-019', name: 'Vạt giường 1', materialType: 'LDF', length: 1000, width: 950, thickness: 18, base_quantity: 1 },
          { id: 'PT-020', name: 'Vạt giường 2', materialType: 'LDF', length: 1000, width: 950, thickness: 18, base_quantity: 1 },
          { id: 'PT-021', name: 'Vạt giường 3', materialType: 'LDF', length: 1000, width: 950, thickness: 18, base_quantity: 1 },
          { id: 'PT-022', name: 'Vạt giường 4', materialType: 'LDF', length: 1000, width: 950, thickness: 18, base_quantity: 1 },

          { id: 'PT-023', name: 'Nan giường 1', materialType: 'Bạch dương', length: 1900, width: 90, thickness: 18, base_quantity: 1 },
          { id: 'PT-024', name: 'Nan giường 2', materialType: 'Bạch dương', length: 1900, width: 90, thickness: 18, base_quantity: 1 },
          { id: 'PT-025', name: 'Nan giường 3', materialType: 'Bạch dương', length: 1900, width: 90, thickness: 18, base_quantity: 1 },
          { id: 'PT-026', name: 'Nan giường 4', materialType: 'Bạch dương', length: 1900, width: 90, thickness: 18, base_quantity: 1 },
          { id: 'PT-027', name: 'Nan giường 5', materialType: 'Bạch dương', length: 1900, width: 90, thickness: 18, base_quantity: 1 },
          { id: 'PT-028', name: 'Nan giường 6', materialType: 'Bạch dương', length: 1900, width: 90, thickness: 18, base_quantity: 1 },

          { id: 'PT-029', name: 'Chân giữa trước', materialType: 'Hồ đào', length: 250, width: 60, thickness: 60, base_quantity: 1 },
          { id: 'PT-030', name: 'Chân giữa sau', materialType: 'Hồ đào', length: 250, width: 60, thickness: 60, base_quantity: 1 },
          { id: 'PT-031', name: 'Chân phụ trái', materialType: 'Thông', length: 200, width: 40, thickness: 40, base_quantity: 2 },
          { id: 'PT-032', name: 'Chân phụ phải', materialType: 'Thông', length: 200, width: 40, thickness: 40, base_quantity: 2 },

          { id: 'PT-033', name: 'Thanh giằng đầu giường', materialType: 'Thông', length: 1800, width: 80, thickness: 20, base_quantity: 1 },
          { id: 'PT-034', name: 'Thanh giằng đuôi giường', materialType: 'Thông', length: 1800, width: 80, thickness: 20, base_quantity: 1 },
          { id: 'PT-035', name: 'Thanh liên kết giữa', materialType: 'Sồi', length: 1900, width: 100, thickness: 25, base_quantity: 1 }
        ]
      },
      {
        id: 'SP-006',
        name: 'ABIGAIL QUEEN BED - Beech Stain',
        quantity: 70,
        items: [
          { id: 'PT-001', name: 'Chân trái đầu giường', materialType: 'Sồi', length: 1250, width: 70, thickness: 70, base_quantity: 1 },
          { id: 'PT-002', name: 'Chân phải đầu giường', materialType: 'Sồi', length: 1250, width: 70, thickness: 70, base_quantity: 1 },
          { id: 'PT-003', name: 'Thanh ngang trên đầu giường', materialType: 'Thông', length: 1700, width: 120, thickness: 30, base_quantity: 1 },
          { id: 'PT-004', name: 'Thanh ngang dưới đầu giường', materialType: 'Thông', length: 1700, width: 140, thickness: 30, base_quantity: 1 },
          { id: 'PT-005', name: 'Ván đầu giường trái', materialType: 'MDF', length: 800, width: 500, thickness: 18, base_quantity: 1 },
          { id: 'PT-006', name: 'Ván đầu giường phải', materialType: 'MDF', length: 800, width: 500, thickness: 18, base_quantity: 1 },

          { id: 'PT-007', name: 'Chân trái đuôi giường', materialType: 'Sồi', length: 450, width: 70, thickness: 70, base_quantity: 1 },
          { id: 'PT-008', name: 'Chân phải đuôi giường', materialType: 'Sồi', length: 450, width: 70, thickness: 70, base_quantity: 1 },
          { id: 'PT-009', name: 'Thanh ngang trên đuôi giường', materialType: 'Thông', length: 1700, width: 100, thickness: 30, base_quantity: 1 },
          { id: 'PT-010', name: 'Thanh ngang dưới đuôi giường', materialType: 'Thông', length: 1700, width: 120, thickness: 30, base_quantity: 1 },
          { id: 'PT-011', name: 'Ván đuôi giường', materialType: 'MDF', length: 1600, width: 280, thickness: 18, base_quantity: 1 },

          { id: 'PT-012', name: 'Vai giường trái ngoài', materialType: 'Thông', length: 2050, width: 240, thickness: 30, base_quantity: 1 },
          { id: 'PT-013', name: 'Vai giường phải ngoài', materialType: 'Thông', length: 2050, width: 240, thickness: 30, base_quantity: 1 },
          { id: 'PT-014', name: 'Vai giường trái trong', materialType: 'Thông', length: 2050, width: 180, thickness: 25, base_quantity: 1 },
          { id: 'PT-015', name: 'Vai giường phải trong', materialType: 'Thông', length: 2050, width: 180, thickness: 25, base_quantity: 1 },

          { id: 'PT-016', name: 'Thanh đỡ vạt trái', materialType: 'Thông', length: 1950, width: 40, thickness: 30, base_quantity: 1 },
          { id: 'PT-017', name: 'Thanh đỡ vạt phải', materialType: 'Thông', length: 1950, width: 40, thickness: 30, base_quantity: 1 },
          { id: 'PT-018', name: 'Thanh đỡ giữa', materialType: 'Thông', length: 1950, width: 60, thickness: 40, base_quantity: 1 },

          { id: 'PT-019', name: 'Vạt giường 1', materialType: 'LDF', length: 950, width: 800, thickness: 18, base_quantity: 1 },
          { id: 'PT-020', name: 'Vạt giường 2', materialType: 'LDF', length: 950, width: 800, thickness: 18, base_quantity: 1 },
          { id: 'PT-021', name: 'Vạt giường 3', materialType: 'LDF', length: 950, width: 800, thickness: 18, base_quantity: 1 },
          { id: 'PT-022', name: 'Vạt giường 4', materialType: 'LDF', length: 950, width: 800, thickness: 18, base_quantity: 1 },

          { id: 'PT-023', name: 'Nan giường 1', materialType: 'Bạch dương', length: 1600, width: 90, thickness: 18, base_quantity: 1 },
          { id: 'PT-024', name: 'Nan giường 2', materialType: 'Bạch dương', length: 1600, width: 90, thickness: 18, base_quantity: 1 },
          { id: 'PT-025', name: 'Nan giường 3', materialType: 'Bạch dương', length: 1600, width: 90, thickness: 18, base_quantity: 1 },
          { id: 'PT-026', name: 'Nan giường 4', materialType: 'Bạch dương', length: 1600, width: 90, thickness: 18, base_quantity: 1 },
          { id: 'PT-027', name: 'Nan giường 5', materialType: 'Bạch dương', length: 1600, width: 90, thickness: 18, base_quantity: 1 },
          { id: 'PT-028', name: 'Nan giường 6', materialType: 'Bạch dương', length: 1600, width: 90, thickness: 18, base_quantity: 1 },

          { id: 'PT-029', name: 'Chân giữa trước', materialType: 'Hồ đào', length: 230, width: 60, thickness: 60, base_quantity: 1 },
          { id: 'PT-030', name: 'Chân giữa sau', materialType: 'Hồ đào', length: 230, width: 60, thickness: 60, base_quantity: 1 },
          { id: 'PT-031', name: 'Chân phụ trái', materialType: 'Thông', length: 180, width: 40, thickness: 40, base_quantity: 2 },
          { id: 'PT-032', name: 'Chân phụ phải', materialType: 'Thông', length: 180, width: 40, thickness: 40, base_quantity: 2 },

          { id: 'PT-033', name: 'Thanh giằng đầu giường', materialType: 'Thông', length: 1550, width: 80, thickness: 20, base_quantity: 1 },
          { id: 'PT-034', name: 'Thanh giằng đuôi giường', materialType: 'Thông', length: 1550, width: 80, thickness: 20, base_quantity: 1 },
          { id: 'PT-035', name: 'Thanh liên kết giữa', materialType: 'Sồi', length: 1650, width: 100, thickness: 25, base_quantity: 1 }
        ]
      },
      {
        id: 'SP-007',
        name: 'ABIGAIL 6-DRAWER DRESSER - Beech Stain',
        quantity: 120,
        items: [
          { id: 'PT-001', name: 'Mặt hông trái tủ', materialType: 'MDF', length: 850, width: 500, thickness: 18, base_quantity: 1 },
          { id: 'PT-002', name: 'Mặt hông phải tủ', materialType: 'MDF', length: 850, width: 500, thickness: 18, base_quantity: 1 },
          { id: 'PT-003', name: 'Mặt trên tủ', materialType: 'Sồi', length: 1500, width: 500, thickness: 25, base_quantity: 1 },
          { id: 'PT-004', name: 'Mặt đáy tủ', materialType: 'Thông', length: 1500, width: 500, thickness: 18, base_quantity: 1 },
          { id: 'PT-005', name: 'Thanh giằng trên sau', materialType: 'Thông', length: 1450, width: 80, thickness: 18, base_quantity: 1 },
          { id: 'PT-006', name: 'Thanh giằng dưới sau', materialType: 'Thông', length: 1450, width: 80, thickness: 18, base_quantity: 1 },
          { id: 'PT-007', name: 'Vách ngăn trái', materialType: 'MDF', length: 800, width: 450, thickness: 18, base_quantity: 1 },
          { id: 'PT-008', name: 'Vách ngăn phải', materialType: 'MDF', length: 800, width: 450, thickness: 18, base_quantity: 1 },
          { id: 'PT-009', name: 'Mặt hậu tủ', materialType: 'LDF', length: 1450, width: 800, thickness: 5, base_quantity: 1 },

          { id: 'PT-010', name: 'Mặt trước ngăn kéo 1', materialType: 'Sồi', length: 700, width: 180, thickness: 18, base_quantity: 1 },
          { id: 'PT-011', name: 'Mặt trước ngăn kéo 2', materialType: 'Sồi', length: 700, width: 180, thickness: 18, base_quantity: 1 },
          { id: 'PT-012', name: 'Mặt trước ngăn kéo 3', materialType: 'Sồi', length: 700, width: 180, thickness: 18, base_quantity: 1 },
          { id: 'PT-013', name: 'Mặt trước ngăn kéo 4', materialType: 'Sồi', length: 700, width: 180, thickness: 18, base_quantity: 1 },
          { id: 'PT-014', name: 'Mặt trước ngăn kéo 5', materialType: 'Sồi', length: 700, width: 180, thickness: 18, base_quantity: 1 },
          { id: 'PT-015', name: 'Mặt trước ngăn kéo 6', materialType: 'Sồi', length: 700, width: 180, thickness: 18, base_quantity: 1 },

          { id: 'PT-016', name: 'Hông trái ngăn kéo 1', materialType: 'Bạch dương', length: 420, width: 150, thickness: 15, base_quantity: 1 },
          { id: 'PT-017', name: 'Hông phải ngăn kéo 1', materialType: 'Bạch dương', length: 420, width: 150, thickness: 15, base_quantity: 1 },
          { id: 'PT-018', name: 'Hông trái ngăn kéo 2', materialType: 'Bạch dương', length: 420, width: 150, thickness: 15, base_quantity: 1 },
          { id: 'PT-019', name: 'Hông phải ngăn kéo 2', materialType: 'Bạch dương', length: 420, width: 150, thickness: 15, base_quantity: 1 },
          { id: 'PT-020', name: 'Hông trái ngăn kéo 3', materialType: 'Bạch dương', length: 420, width: 150, thickness: 15, base_quantity: 1 },
          { id: 'PT-021', name: 'Hông phải ngăn kéo 3', materialType: 'Bạch dương', length: 420, width: 150, thickness: 15, base_quantity: 1 },
          { id: 'PT-022', name: 'Hông trái ngăn kéo 4', materialType: 'Bạch dương', length: 420, width: 150, thickness: 15, base_quantity: 1 },
          { id: 'PT-023', name: 'Hông phải ngăn kéo 4', materialType: 'Bạch dương', length: 420, width: 150, thickness: 15, base_quantity: 1 },
          { id: 'PT-024', name: 'Hông trái ngăn kéo 5', materialType: 'Bạch dương', length: 420, width: 150, thickness: 15, base_quantity: 1 },
          { id: 'PT-025', name: 'Hông phải ngăn kéo 5', materialType: 'Bạch dương', length: 420, width: 150, thickness: 15, base_quantity: 1 },
          { id: 'PT-026', name: 'Hông trái ngăn kéo 6', materialType: 'Bạch dương', length: 420, width: 150, thickness: 15, base_quantity: 1 },
          { id: 'PT-027', name: 'Hông phải ngăn kéo 6', materialType: 'Bạch dương', length: 420, width: 150, thickness: 15, base_quantity: 1 },

          { id: 'PT-028', name: 'Đáy ngăn kéo 1', materialType: 'LDF', length: 660, width: 400, thickness: 5, base_quantity: 1 },
          { id: 'PT-029', name: 'Đáy ngăn kéo 2', materialType: 'LDF', length: 660, width: 400, thickness: 5, base_quantity: 1 },
          { id: 'PT-030', name: 'Đáy ngăn kéo 3', materialType: 'LDF', length: 660, width: 400, thickness: 5, base_quantity: 1 },
          { id: 'PT-031', name: 'Đáy ngăn kéo 4', materialType: 'LDF', length: 660, width: 400, thickness: 5, base_quantity: 1 },
          { id: 'PT-032', name: 'Đáy ngăn kéo 5', materialType: 'LDF', length: 660, width: 400, thickness: 5, base_quantity: 1 },
          { id: 'PT-033', name: 'Đáy ngăn kéo 6', materialType: 'LDF', length: 660, width: 400, thickness: 5, base_quantity: 1 },

          { id: 'PT-034', name: 'Chân trước trái', materialType: 'Hồ đào', length: 120, width: 60, thickness: 60, base_quantity: 1 },
          { id: 'PT-035', name: 'Chân trước phải', materialType: 'Hồ đào', length: 120, width: 60, thickness: 60, base_quantity: 1 }
        ]
      },
      {
        id: 'SP-008',
        name: 'ABIGAIL MIRROR - Beech Stain',
        quantity: 30,
        items: [
          { id: 'PT-001', name: 'Khung trên gương', materialType: 'Sồi', length: 1200, width: 90, thickness: 25, base_quantity: 1 },
          { id: 'PT-002', name: 'Khung dưới gương', materialType: 'Sồi', length: 1200, width: 90, thickness: 25, base_quantity: 1 },
          { id: 'PT-003', name: 'Khung trái gương', materialType: 'Sồi', length: 900, width: 90, thickness: 25, base_quantity: 1 },
          { id: 'PT-004', name: 'Khung phải gương', materialType: 'Sồi', length: 900, width: 90, thickness: 25, base_quantity: 1 },
          { id: 'PT-005', name: 'Thanh giằng ngang trên', materialType: 'Thông', length: 1050, width: 60, thickness: 18, base_quantity: 1 },
          { id: 'PT-006', name: 'Thanh giằng ngang dưới', materialType: 'Thông', length: 1050, width: 60, thickness: 18, base_quantity: 1 },
          { id: 'PT-007', name: 'Thanh giằng dọc trái', materialType: 'Thông', length: 750, width: 60, thickness: 18, base_quantity: 1 },
          { id: 'PT-008', name: 'Thanh giằng dọc phải', materialType: 'Thông', length: 750, width: 60, thickness: 18, base_quantity: 1 },
          { id: 'PT-009', name: 'Tấm hậu gương', materialType: 'LDF', length: 1100, width: 800, thickness: 5, base_quantity: 1 },
          { id: 'PT-010', name: 'Tấm kính gương', materialType: 'MDF', length: 1000, width: 700, thickness: 5, base_quantity: 1 },
          { id: 'PT-011', name: 'Thanh nẹp kính trên', materialType: 'Bạch dương', length: 1000, width: 20, thickness: 10, base_quantity: 1 },
          { id: 'PT-012', name: 'Thanh nẹp kính dưới', materialType: 'Bạch dương', length: 1000, width: 20, thickness: 10, base_quantity: 1 },
          { id: 'PT-013', name: 'Thanh nẹp kính trái', materialType: 'Bạch dương', length: 700, width: 20, thickness: 10, base_quantity: 1 },
          { id: 'PT-014', name: 'Thanh nẹp kính phải', materialType: 'Bạch dương', length: 700, width: 20, thickness: 10, base_quantity: 1 },
          { id: 'PT-015', name: 'Thanh liên kết treo gương', materialType: 'Thông', length: 500, width: 50, thickness: 18, base_quantity: 1 }
        ]
      },
      {
        id: 'SP-009',
        name: 'ABIGAIL NIGHTSTAND - Beech Stain',
        quantity: 35,
        items: [
          { id: 'PT-001', name: 'Mặt hông trái tủ', materialType: 'MDF', length: 600, width: 450, thickness: 18, base_quantity: 1 },
          { id: 'PT-002', name: 'Mặt hông phải tủ', materialType: 'MDF', length: 600, width: 450, thickness: 18, base_quantity: 1 },
          { id: 'PT-003', name: 'Mặt trên tủ', materialType: 'Sồi', length: 550, width: 450, thickness: 25, base_quantity: 1 },
          { id: 'PT-004', name: 'Mặt đáy tủ', materialType: 'Thông', length: 550, width: 450, thickness: 18, base_quantity: 1 },
          { id: 'PT-005', name: 'Thanh giằng sau trên', materialType: 'Thông', length: 500, width: 70, thickness: 18, base_quantity: 1 },
          { id: 'PT-006', name: 'Thanh giằng sau dưới', materialType: 'Thông', length: 500, width: 70, thickness: 18, base_quantity: 1 },
          { id: 'PT-007', name: 'Đợt giữa tủ', materialType: 'MDF', length: 500, width: 400, thickness: 18, base_quantity: 1 },
          { id: 'PT-008', name: 'Mặt hậu tủ', materialType: 'LDF', length: 550, width: 550, thickness: 5, base_quantity: 1 },

          { id: 'PT-009', name: 'Mặt trước ngăn kéo trên', materialType: 'Sồi', length: 450, width: 140, thickness: 18, base_quantity: 1 },
          { id: 'PT-010', name: 'Mặt trước ngăn kéo dưới', materialType: 'Sồi', length: 450, width: 180, thickness: 18, base_quantity: 1 },

          { id: 'PT-011', name: 'Hông trái ngăn kéo trên', materialType: 'Bạch dương', length: 350, width: 120, thickness: 15, base_quantity: 1 },
          { id: 'PT-012', name: 'Hông phải ngăn kéo trên', materialType: 'Bạch dương', length: 350, width: 120, thickness: 15, base_quantity: 1 },
          { id: 'PT-013', name: 'Thanh sau ngăn kéo trên', materialType: 'Thông', length: 400, width: 120, thickness: 15, base_quantity: 1 },
          { id: 'PT-014', name: 'Đáy ngăn kéo trên', materialType: 'LDF', length: 400, width: 330, thickness: 5, base_quantity: 1 },

          { id: 'PT-015', name: 'Hông trái ngăn kéo dưới', materialType: 'Bạch dương', length: 350, width: 160, thickness: 15, base_quantity: 1 },
          { id: 'PT-016', name: 'Hông phải ngăn kéo dưới', materialType: 'Bạch dương', length: 350, width: 160, thickness: 15, base_quantity: 1 },
          { id: 'PT-017', name: 'Thanh sau ngăn kéo dưới', materialType: 'Thông', length: 400, width: 160, thickness: 15, base_quantity: 1 },
          { id: 'PT-018', name: 'Đáy ngăn kéo dưới', materialType: 'LDF', length: 400, width: 330, thickness: 5, base_quantity: 1 },

          { id: 'PT-019', name: 'Chân trước trái', materialType: 'Hồ đào', length: 120, width: 50, thickness: 50, base_quantity: 1 },
          { id: 'PT-020', name: 'Chân trước phải', materialType: 'Hồ đào', length: 120, width: 50, thickness: 50, base_quantity: 1 },
          { id: 'PT-021', name: 'Chân sau trái', materialType: 'Hồ đào', length: 120, width: 50, thickness: 50, base_quantity: 1 },
          { id: 'PT-022', name: 'Chân sau phải', materialType: 'Hồ đào', length: 120, width: 50, thickness: 50, base_quantity: 1 }
        ]
      }

    ]
  },
  {id: 'DH-2026-03', name: 'Đơn hàng VFM 03', products: [
    {
  id: 'SP-017',
  name: 'Full Single Bed - Gray',
  quantity: 40,
  items: [
    { id: 'PT-001', name: 'Chân trái đầu giường', materialType: 'Sồi', length: 1150, width: 65, thickness: 65, base_quantity: 1 },
    { id: 'PT-002', name: 'Chân phải đầu giường', materialType: 'Sồi', length: 1150, width: 65, thickness: 65, base_quantity: 1 },
    { id: 'PT-003', name: 'Thanh ngang trên đầu giường', materialType: 'Thông', length: 1450, width: 120, thickness: 30, base_quantity: 1 },
    { id: 'PT-004', name: 'Thanh ngang dưới đầu giường', materialType: 'Thông', length: 1450, width: 140, thickness: 30, base_quantity: 1 },
    { id: 'PT-005', name: 'Ván đầu giường trái', materialType: 'MDF', length: 700, width: 480, thickness: 18, base_quantity: 1 },
    { id: 'PT-006', name: 'Ván đầu giường phải', materialType: 'MDF', length: 700, width: 480, thickness: 18, base_quantity: 1 },

    { id: 'PT-007', name: 'Chân trái đuôi giường', materialType: 'Sồi', length: 450, width: 65, thickness: 65, base_quantity: 1 },
    { id: 'PT-008', name: 'Chân phải đuôi giường', materialType: 'Sồi', length: 450, width: 65, thickness: 65, base_quantity: 1 },
    { id: 'PT-009', name: 'Thanh ngang trên đuôi giường', materialType: 'Thông', length: 1450, width: 100, thickness: 30, base_quantity: 1 },
    { id: 'PT-010', name: 'Thanh ngang dưới đuôi giường', materialType: 'Thông', length: 1450, width: 120, thickness: 30, base_quantity: 1 },
    { id: 'PT-011', name: 'Ván đuôi giường', materialType: 'LDF', length: 1350, width: 260, thickness: 18, base_quantity: 1 },

    { id: 'PT-012', name: 'Vai giường trái ngoài', materialType: 'Tràm', length: 2000, width: 220, thickness: 30, base_quantity: 1 },
    { id: 'PT-013', name: 'Vai giường phải ngoài', materialType: 'Tràm', length: 2000, width: 220, thickness: 30, base_quantity: 1 },
    { id: 'PT-014', name: 'Vai giường trái trong', materialType: 'LVL', length: 2000, width: 180, thickness: 25, base_quantity: 1 },
    { id: 'PT-015', name: 'Vai giường phải trong', materialType: 'LVL', length: 2000, width: 180, thickness: 25, base_quantity: 1 },

    { id: 'PT-016', name: 'Thanh đỡ vạt trái', materialType: 'LVL', length: 1900, width: 45, thickness: 35, base_quantity: 1 },
    { id: 'PT-017', name: 'Thanh đỡ vạt phải', materialType: 'LVL', length: 1900, width: 45, thickness: 35, base_quantity: 1 },
    { id: 'PT-018', name: 'Thanh đỡ giữa', materialType: 'LVL', length: 1900, width: 60, thickness: 40, base_quantity: 1 },

    { id: 'PT-019', name: 'Vạt giường trái trước', materialType: 'LDF', length: 950, width: 700, thickness: 18, base_quantity: 1 },
    { id: 'PT-020', name: 'Vạt giường trái sau', materialType: 'LDF', length: 950, width: 700, thickness: 18, base_quantity: 1 },
    { id: 'PT-021', name: 'Vạt giường phải trước', materialType: 'LDF', length: 950, width: 700, thickness: 18, base_quantity: 1 },
    { id: 'PT-022', name: 'Vạt giường phải sau', materialType: 'LDF', length: 950, width: 700, thickness: 18, base_quantity: 1 },

    { id: 'PT-023', name: 'Nan giường 1', materialType: 'Bạch dương', length: 1400, width: 90, thickness: 18, base_quantity: 1 },
    { id: 'PT-024', name: 'Nan giường 2', materialType: 'Bạch dương', length: 1400, width: 90, thickness: 18, base_quantity: 1 },
    { id: 'PT-025', name: 'Nan giường 3', materialType: 'Bạch dương', length: 1400, width: 90, thickness: 18, base_quantity: 1 },
    { id: 'PT-026', name: 'Nan giường 4', materialType: 'Bạch dương', length: 1400, width: 90, thickness: 18, base_quantity: 1 },
    { id: 'PT-027', name: 'Nan giường 5', materialType: 'Bạch dương', length: 1400, width: 90, thickness: 18, base_quantity: 1 },
    { id: 'PT-028', name: 'Nan giường 6', materialType: 'Bạch dương', length: 1400, width: 90, thickness: 18, base_quantity: 1 },

    { id: 'PT-029', name: 'Chân giữa trước', materialType: 'Hồ đào', length: 220, width: 55, thickness: 55, base_quantity: 1 },
    { id: 'PT-030', name: 'Chân giữa sau', materialType: 'Hồ đào', length: 220, width: 55, thickness: 55, base_quantity: 1 },

    { id: 'PT-031', name: 'Thanh giằng đầu giường', materialType: 'Cao su', length: 1350, width: 80, thickness: 20, base_quantity: 1 },
    { id: 'PT-032', name: 'Thanh giằng đuôi giường', materialType: 'Cao su', length: 1350, width: 80, thickness: 20, base_quantity: 1 },

    { id: 'PT-033', name: 'Thanh liên kết giữa', materialType: 'Dẻ gai', length: 1700, width: 90, thickness: 25, base_quantity: 1 },

    { id: 'PT-034', name: 'Thanh tăng cứng trái', materialType: 'Thông', length: 1200, width: 40, thickness: 18, base_quantity: 1 },
    { id: 'PT-035', name: 'Thanh tăng cứng phải', materialType: 'Thông', length: 1200, width: 40, thickness: 18, base_quantity: 1 },

    { id: 'PT-036', name: 'Nẹp trang trí đầu giường', materialType: 'Sồi', length: 1400, width: 35, thickness: 12, base_quantity: 1 }
  ]
},
{
  id: 'SP-018',
  name: 'Twin Single Bed - Gray',
  quantity: 45,
  items: [
    { id: 'PT-001', name: 'Chân trái đầu giường', materialType: 'Sồi', length: 1050, width: 60, thickness: 60, base_quantity: 1 },
    { id: 'PT-002', name: 'Chân phải đầu giường', materialType: 'Sồi', length: 1050, width: 60, thickness: 60, base_quantity: 1 },
    { id: 'PT-003', name: 'Thanh ngang trên đầu giường', materialType: 'Thông', length: 1100, width: 110, thickness: 28, base_quantity: 1 },
    { id: 'PT-004', name: 'Thanh ngang dưới đầu giường', materialType: 'Thông', length: 1100, width: 130, thickness: 28, base_quantity: 1 },
    { id: 'PT-005', name: 'Ván đầu giường', materialType: 'MDF', length: 1000, width: 420, thickness: 18, base_quantity: 1 },

    { id: 'PT-006', name: 'Chân trái đuôi giường', materialType: 'Sồi', length: 420, width: 60, thickness: 60, base_quantity: 1 },
    { id: 'PT-007', name: 'Chân phải đuôi giường', materialType: 'Sồi', length: 420, width: 60, thickness: 60, base_quantity: 1 },
    { id: 'PT-008', name: 'Thanh ngang trên đuôi giường', materialType: 'Thông', length: 1100, width: 90, thickness: 28, base_quantity: 1 },
    { id: 'PT-009', name: 'Thanh ngang dưới đuôi giường', materialType: 'Thông', length: 1100, width: 110, thickness: 28, base_quantity: 1 },
    { id: 'PT-010', name: 'Ván đuôi giường', materialType: 'LDF', length: 1000, width: 240, thickness: 18, base_quantity: 1 },

    { id: 'PT-011', name: 'Vai giường trái ngoài', materialType: 'Tràm', length: 1950, width: 200, thickness: 28, base_quantity: 1 },
    { id: 'PT-012', name: 'Vai giường phải ngoài', materialType: 'Tràm', length: 1950, width: 200, thickness: 28, base_quantity: 1 },
    { id: 'PT-013', name: 'Vai giường trái trong', materialType: 'LVL', length: 1950, width: 160, thickness: 22, base_quantity: 1 },
    { id: 'PT-014', name: 'Vai giường phải trong', materialType: 'LVL', length: 1950, width: 160, thickness: 22, base_quantity: 1 },

    { id: 'PT-015', name: 'Thanh đỡ vạt trái', materialType: 'LVL', length: 1850, width: 40, thickness: 32, base_quantity: 1 },
    { id: 'PT-016', name: 'Thanh đỡ vạt phải', materialType: 'LVL', length: 1850, width: 40, thickness: 32, base_quantity: 1 },
    { id: 'PT-017', name: 'Thanh đỡ giữa', materialType: 'LVL', length: 1850, width: 55, thickness: 35, base_quantity: 1 },

    { id: 'PT-018', name: 'Vạt giường trái', materialType: 'LDF', length: 900, width: 500, thickness: 18, base_quantity: 1 },
    { id: 'PT-019', name: 'Vạt giường phải', materialType: 'LDF', length: 900, width: 500, thickness: 18, base_quantity: 1 },

    { id: 'PT-020', name: 'Nan giường 1', materialType: 'Bạch dương', length: 1000, width: 85, thickness: 18, base_quantity: 1 },
    { id: 'PT-021', name: 'Nan giường 2', materialType: 'Bạch dương', length: 1000, width: 85, thickness: 18, base_quantity: 1 },
    { id: 'PT-022', name: 'Nan giường 3', materialType: 'Bạch dương', length: 1000, width: 85, thickness: 18, base_quantity: 1 },
    { id: 'PT-023', name: 'Nan giường 4', materialType: 'Bạch dương', length: 1000, width: 85, thickness: 18, base_quantity: 1 },
    { id: 'PT-024', name: 'Nan giường 5', materialType: 'Bạch dương', length: 1000, width: 85, thickness: 18, base_quantity: 1 },

    { id: 'PT-025', name: 'Chân giữa trước', materialType: 'Hồ đào', length: 200, width: 50, thickness: 50, base_quantity: 1 },
    { id: 'PT-026', name: 'Chân giữa sau', materialType: 'Hồ đào', length: 200, width: 50, thickness: 50, base_quantity: 1 },

    { id: 'PT-027', name: 'Thanh giằng đầu giường', materialType: 'Cao su', length: 950, width: 70, thickness: 18, base_quantity: 1 },
    { id: 'PT-028', name: 'Thanh giằng đuôi giường', materialType: 'Cao su', length: 950, width: 70, thickness: 18, base_quantity: 1 },

    { id: 'PT-029', name: 'Thanh liên kết giữa', materialType: 'Dẻ gai', length: 1600, width: 85, thickness: 22, base_quantity: 1 },

    { id: 'PT-030', name: 'Nẹp trang trí đầu giường', materialType: 'Sồi', length: 1000, width: 30, thickness: 12, base_quantity: 1 }
  ]
}
  ]}
];

const defaultInventory = [
  { id: 'ITEM-1', batchId: 'LÔ-GỖ-NHẬP-001', name: 'THÔNG', length: 3000, width: 150, thickness: 22, quantity: 50, volume: 0.495, type: 'RAW', source_lot_id: null },
  { id: 'ITEM-2', batchId: 'LÔ-GỖ-NHẬP-001', name: 'THÔNG', length: 2000, width: 200, thickness: 25, quantity: 100, volume: 1.000, type: 'RAW', source_lot_id: null },
  { id: 'ITEM-3', batchId: 'LÔ-GỖ-NHẬP-001', name: 'THÔNG', length: 2500, width: 300, thickness: 30, quantity: 20, volume: 0.450, type: 'RAW', source_lot_id: null },
  { id: 'ITEM-4', batchId: 'LÔ-GỖ-NHẬP-001', name: 'THÔNG', length: 1800, width: 120, thickness: 20, quantity: 80, volume: 0.345, type: 'RAW', source_lot_id: null },

  { id: 'ITEM-5', batchId: 'LÔ-GỖ-NHẬP-002', name: 'DẺ GAI', length: 3000, width: 150, thickness: 22, quantity: 50, volume: 0.495, type: 'RAW', source_lot_id: null },
  { id: 'ITEM-6', batchId: 'LÔ-GỖ-NHẬP-002', name: 'THÔNG', length: 2000, width: 200, thickness: 25, quantity: 100, volume: 1.000, type: 'RAW', source_lot_id: null },
  { id: 'ITEM-7', batchId: 'LÔ-GỖ-NHẬP-002', name: 'THÔNG', length: 2500, width: 300, thickness: 30, quantity: 20, volume: 0.450, type: 'RAW', source_lot_id: null },
  { id: 'ITEM-8', batchId: 'LÔ-GỖ-NHẬP-002', name: 'HỒ ĐÀO', length: 1800, width: 120, thickness: 20, quantity: 80, volume: 0.345, type: 'RAW', source_lot_id: null },

  { id: 'ITEM-9', batchId: 'LÔ-GỖ-NHẬP-003', name: 'DẺ GAI', length: 3000, width: 150, thickness: 22, quantity: 50, volume: 0.495, type: 'RAW', source_lot_id: null },
  { id: 'ITEM-10', batchId: 'LÔ-GỖ-NHẬP-003', name: 'CAO SU', length: 2000, width: 200, thickness: 25, quantity: 100, volume: 1.000, type: 'RAW', source_lot_id: null },
  { id: 'ITEM-11', batchId: 'LÔ-GỖ-NHẬP-003', name: 'SỒI', length: 2500, width: 300, thickness: 30, quantity: 20, volume: 0.450, type: 'RAW', source_lot_id: null },
  { id: 'ITEM-12', batchId: 'LÔ-GỖ-NHẬP-003', name: 'HỒ ĐÀO', length: 1800, width: 120, thickness: 20, quantity: 80, volume: 0.345, type: 'RAW', source_lot_id: null },

  { id: 'NL-001', batchId: 'NL-001', name: 'SỒI', length: 2500, width: 300, thickness: 300, quantity: 5, volume: 1.125, type: 'RAW', source_lot_id: null },
  { id: 'PD-102', batchId: 'PD-102', name: 'SỒI', length: 800, width: 100, thickness: 80, quantity: 15, volume: 0.096, type: 'SURPLUS', source_lot_id: 'LSX-OLD-1' },
  { id: 'PD-105', batchId: 'PD-105', name: 'THÔNG', length: 1850, width: 210, thickness: 30, quantity: 5, volume: 0.058, type: 'SURPLUS', source_lot_id: 'LSX-OLD-1' },
  { id: 'NL-002', batchId: 'NL-002', name: 'THÔNG', length: 1200, width: 80, thickness: 40, quantity: 100, volume: 0.384, type: 'RAW', source_lot_id: null },
];

const defaultLots = [
  {
    id: 'LSX-001',
    name: 'Lệnh SX bàn ghế gỗ Sồi',
    date: '2026-04-25',
    status: 'Đang sản xuất',
    description: 'Xẻ từ lô gỗ tròn NL-001',
    inputs: [],
    outputs: []
  },
  {
    id: 'LSX-002',
    name: 'Lệnh SX phôi tồn kho (Gỗ Tần bì)',
    date: '2026-04-24',
    status: 'Hoàn thành',
    description: 'Xẻ dọn kho đợt 1',
    inputs: [],
    outputs: []
  },
];

export { defaultOrders, defaultInventory, defaultLots };
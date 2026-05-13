# Hướng dẫn cài đặt Backend API cho dự đoán hao hụt gỗ

## Cấu trúc thư mục

```
product_molding_process/
├── backend/
│   ├── main.py              # FastAPI server
│   ├── requirements.txt     # Python dependencies
│   ├── download_model.py    # Script tải model từ Kaggle
│   └── models/
│       └── mo_hinh_hao_hut_final.pkl  # Model đã train (cần tải về)
├── frontend/                 # React app đã tích hợp
└── ...
```

## Các bước cài đặt

### 1. Cài đặt Python dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Tải model từ Kaggle

#### Cách 1: Sử dụng script (Khuyến nghị)

1. Cài đặt Kaggle CLI:
```bash
pip install kaggle
```

2. Cấu hình API Key:
   - Vào https://www.kaggle.com/account
   - Tạo API Token (bấm "Create New API Token")
   - Download file `kaggle.json`
   - Đặt file vào:
     - Windows: `C:\Users\<username>\.kaggle\kaggle.json`
     - Linux/Mac: `~/.kaggle/kaggle.json`

3. Chạy script download:
```bash
cd backend
python download_model.py
```

#### Cách 2: Download thủ công

1. Vào notebook: https://www.kaggle.com/code/trinhkhanhduy2902/notebookb46391a209
2. Tìm output của cell cuối cùng (nó đã lưu file `mo_hinh_hao_hut_final.pkl`)
3. Download file đó
4. Đặt vào thư mục `backend/models/`

### 3. Chạy Backend API

```bash
cd backend
uvicorn main:app --reload --port 8000
```

Server sẽ chạy tại: http://localhost:8000

API Documentation (Swagger UI): http://localhost:8000/docs

### 4. Cấu hình Frontend

Tạo file `.env` trong thư mục `frontend/`:

```env
VITE_API_URL=http://localhost:8000
```

### 5. Chạy Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### Health Check
```
GET /health
```
Response:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_config": {"THÔNG": [35, 40], "DẺ GAI": [30, 40], "HỒ ĐÀO": [40, 50]}
}
```

### Dự đoán một loại gỗ
```
POST /predict
```
Body:
```json
{
  "wood_type": "THÔNG",
  "total_input_volume": 1.5
}
```
Response:
```json
{
  "wood_type": "THÔNG",
  "input_volume": 1.5,
  "loss_percent": 37.2,
  "min_loss": 35,
  "max_loss": 40,
  "estimated_output": 0.941,
  "estimated_loss_volume": 0.559,
  "confidence": "high",
  "model_used": true
}
```

### Dự đoán nhiều loại gỗ
```
POST /predict/batch
```
Body:
```json
{
  "inputs": [
    {"wood_type": "THÔNG", "total_input_volume": 1.0},
    {"wood_type": "DẺ GAI", "total_input_volume": 0.5}
  ]
}
```

## Các loại gỗ được hỗ trợ

| Loại gỗ | Hao hụt tối thiểu | Hao hụt tối đa |
|----------|-------------------|-----------------|
| THÔNG | 35% | 40% |
| DẺ GAI | 30% | 40% |
| HỒ ĐÀO | 40% | 50% |

## Xử lý sự cố

### Model không tìm thấy

Nếu thấy log:
```
Model không tìm thấy. Sử dụng logic dự phòng.
```

→ Backend vẫn hoạt động nhưng sử dụng công thức tính toán thay vì model thật.
→ Hãy tải model về theo hướng dẫn ở trên.

### CORS Error

Nếu frontend báo lỗi CORS:
→ Backend đã được cấu hình CORS cho phép tất cả origins.
→ Kiểm tra lại URL API trong file `.env`.

### Frontend hiển thị "📊 Công thức" thay vì "🤖 AI Model"

→ API không khả dụng. Kiểm tra:
1. Backend đã chạy chưa?
2. URL API có đúng không?
3. Có firewall chặn port 8000 không?

## Development

### Chạy tests
```bash
cd backend
pytest
```

### Rebuild model
Nếu bạn muốn retrain model trên Kaggle:
1. Chỉnh sửa notebook
2. Chạy lại training
3. Download file `mo_hinh_hao_hut_final.pkl` mới
4. Thay thế file cũ trong `backend/models/`
5. Restart backend server

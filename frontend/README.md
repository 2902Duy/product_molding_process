# Product Molding Process

Huong dan chay du an frontend React/Vite va backend FastAPI.

## Yeu Cau

- Node.js va npm
- Python 3.10+ khuyen nghi
- Backend dependencies trong `backend/requirements.txt`
- Model hao hut tai `backend/models/mo_hinh_hao_hut_final.pkl` neu muon dung model du doan
- MCP token neu can dong bo du lieu tu MCP server

## Cau Truc Chinh

```text
product_molding_process/
  backend/
    main.py
    requirements.txt
    models/
  frontend/
    package.json
    .env.example
    src/
```

## 1. Cai Dat Backend

Chay tu thu muc goc du an:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Neu may dang dung virtualenv co san cua du an:

```powershell
.\venv_sklearn16\Scripts\Activate.ps1
```

## 2. Cau Hinh Backend

Backend doc cac bien moi truong sau:

```powershell
$env:MCP_TOKEN="your_mcp_token"
$env:MCP_URL="https://tool.vfmgroup.vn/db-mcp/mcp"
```

`MCP_URL` co gia tri mac dinh la `https://tool.vfmgroup.vn/db-mcp/mcp`, nen co the bo qua neu dung server nay.

Neu can chat Gemini:

```powershell
$env:GEMINI_API_KEY="your_gemini_api_key"
```

## 3. Chay Backend

Tu thu muc `backend`:

```powershell
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Backend se chay tai:

```text
http://127.0.0.1:8000
```

Kiem tra nhanh:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

Swagger UI:

```text
http://127.0.0.1:8000/docs
```

## 4. Cai Dat Frontend

Tu thu muc `frontend`:

```powershell
npm install
```

Tao file `.env` tu file mau:

```powershell
Copy-Item .env.example .env
```

Noi dung co ban:

```env
VITE_API_URL=http://localhost:8000
```

## 5. Chay Frontend

Tu thu muc `frontend`:

```powershell
npm run dev
```

Vite se hien URL, thuong la:

```text
http://localhost:5173
```

## 6. Build Kiem Tra

Tu thu muc `frontend`:

```powershell
npm run build
```

Preview ban build:

```powershell
npm run preview
```

## 7. Du Lieu MCP

Frontend goi backend endpoint:

```text
POST /mcp/run-template
```

Backend sau do goi MCP server. Cac template dang dung:

- `exec_tr_dondathang_getlisthtr`: danh sach don hang
- `exec_tr_dondathang_chitiet_getall`: chi tiet don hang
- `exec_dqt_dinhmuc_govan_get`: dinh muc/BOM san pham
- `exec_dqt_thongke_phoi_getall`: kho nguyen lieu/phoi

File mau du lieu MCP:

```text
mcp_exports/db-mcp-summary.md
```

## 8. Ghi Chu Quan Trong

- Nen chay backend truoc frontend de cac tinh nang MCP, chat va du doan hao hut hoat dong.
- Neu backend khong co `MCP_TOKEN`, app van chay nhung khong dong bo du lieu MCP moi.
- Du lieu tao trong app duoc luu localStorage tren trinh duyet.
- App hien khong fallback ve du lieu mau trong `db.js`; neu MCP chua sync va localStorage rong thi danh sach co the rong.

# Mo ta chuc nang du an

Du an la ung dung quan ly quy trinh san xuat phoi go va dinh hinh san pham go. He thong gom frontend React/Vite va backend FastAPI, co tich hop du lieu MCP, mo hinh du doan hao hut va chat ho tro van hanh.

## 1. Quan ly phieu san xuat

Man hinh danh sach phieu san xuat cho phep:

- Xem tat ca phieu san xuat trong he thong.
- Loc phieu theo loai:
  - Phieu san xuat phoi go.
  - Phieu dinh hinh.
- Tim kiem theo ma phieu hoac ten phieu.
- Phan trang danh sach de tranh bang qua dai.
- Tao phieu moi theo dung loai phieu.
- Xoa phieu sau khi xac nhan.
- Mo chi tiet phieu de tiep tuc thao tac.

Ma phieu duoc tao theo dang de doc:

- `PG-YYMMDD-001`: phieu san xuat phoi go.
- `DDH-YYMMDD-001`: phieu san xuat dinh hinh.

## 2. Phieu san xuat phoi go

Phieu san xuat phoi go dung de lap lenh san xuat phoi tu nguyen lieu dau vao.

Chuc nang chinh:

- Chon don hang va san pham can san xuat.
- Chon nguyen lieu dau vao tu kho.
- Nhap so luong hoac khoi luong su dung cua tung lo.
- Khai bao dau ra gom:
  - Phoi thanh pham.
  - Phoi du.
  - Phe pham.
- Du doan hao hut dua tren loai go va khoi luong dau vao.
- Luu nhap phieu.
- Hoan tat san xuat va tu dong nhap kho dau ra.
- Cap nhat lai kho dau vao sau khi su dung.
- Khi quay lai, he thong hoi co luu nhap hay khong.
- Nut huy se hoi xac nhan xoa phieu.

## 3. Du doan hao hut

Chuc nang du doan hao hut ho tro uoc tinh ty le hao hut truoc khi hoan tat phieu.

Nguon tinh toan:

- Goi backend FastAPI endpoint `/predict` hoac `/predict/batch`.
- Su dung mo hinh Random Forest neu model duoc load thanh cong.
- Neu khong co model hoac backend loi, frontend co cong thuc fallback.

Ket qua hien thi:

- Ty le hao hut du tinh.
- Muc do tin cay.
- Khoi vao va khoi ra du tinh.
- Hao hut tinh theo m3.

## 4. Phieu san xuat dinh hinh

Phieu dinh hinh dung de quan ly cong doan sau khi da co phoi.

Chuc nang chinh:

- Chon san pham/don hang can dinh hinh.
- Lay danh sach chi tiet can san xuat tu dinh muc san pham.
- Chon phoi dau vao tu kho phoi.
- Quan ly tung dong chi tiet theo quy cach:
  - Ten chi tiet.
  - Day x Rong x Dai.
  - So luong can lam.
  - So luong da hoan thanh.
- Quan ly tien do theo cong doan dinh hinh.
- Cho phep lam linh hoat, co the cap nhat cong doan sau truoc neu can.
- Luu nhap phieu.
- Hoan tat phieu va nhap kho thanh pham sau dinh hinh.
- Cap nhat lai kho dau vao sau khi su dung.
- Khi quay lai, he thong hoi co luu nhap hay khong.
- Nut huy se hoi xac nhan xoa phieu.

## 5. Cong doan dinh hinh

Danh sach cong doan duoc cau hinh trong `frontend/src/constants/moldingStages.js`.

He thong dang ho tro cac cong doan:

- Dinh hinh.
- Dinh hinh 2 dau.
- Dinh hinh mat.
- Dong bo dinh hinh.

Moi dong chi tiet co tien do rieng cho tung cong doan. He thong luu lai lich su cap nhat cong doan bang ticket noi bo.

## 6. Yeu cau san xuat phoi bo sung

Trong phieu dinh hinh, neu thieu phoi dung quy cach, nguoi dung co the tao yeu cau kich thuoc tuy y.

Chuc nang:

- Them nhieu dong yeu cau.
- Nhap loai go, day, rong, dai, so luong.
- Nhap ly do thieu.
- Gui yeu cau sang bo phan san xuat phoi.
- He thong tu dong tao mot phieu san xuat phoi bo sung.
- Ghi noi dung yeu cau va ly do vao ghi chu phieu bo sung.

## 7. Quan ly kho

Man hinh kho duoc tach thanh 2 nhom chinh:

### Kho phoi go

Quan ly:

- Nguyen lieu tho.
- Phoi san xuat tu phieu phoi.
- Phoi du co the tan dung.
- Phe pham neu co.

Co cac bo loc:

- Tat ca.
- Nguyen lieu.
- Phoi.
- Phoi du.
- Phe pham.

### Kho thanh pham

Quan ly thanh pham duoc nhap kho tu cong doan dinh hinh tro di.

Co cac bo loc:

- Tat ca.
- Thanh pham.
- Hang du.
- Phe pham.

Chuc nang chung cua kho:

- Tim kiem theo ma, loai go, ma lo, lenh san xuat.
- Hien thi quy cach day x rong x dai.
- Hien thi so luong va khoi luong m3.
- Hien thi nguon goc nhap kho.
- Phan trang tung kho.
- Menu kho co the thu gon/mo rong o sidebar.

## 8. Dong bo du lieu MCP

Frontend goi backend endpoint `/mcp/run-template` de lay du lieu tu MCP server.

Du lieu MCP dang duoc su dung cho:

- Danh sach don hang.
- Chi tiet don hang.
- Dinh muc/go van san pham.
- Thong ke phoi ton kho.

Frontend co co che cache du lieu MCP de tranh goi lap lien tuc:

- Cache trong localStorage.
- Thoi gian cache mac dinh 2 phut.
- Co dung chung request dang chay de tranh goi trung.

## 9. Chat ho tro van hanh

Ung dung co chatbot ho tro nguoi dung hoi ve du lieu hien tai.

Chat co the tra loi ve:

- Ton kho.
- Phieu san xuat.
- Don hang.
- Cong doan dinh hinh.
- Ly do chua hoan tat phieu.
- Yeu cau phoi bo sung.

Nguon du lieu chat:

- lots.
- inventory.
- orders.
- customRequests.
- currentView va currentLotId.

Backend su dung Gemini API. Frontend co xu ly loi quota de hien thi thong bao ngan gon thay vi hien payload loi dai.

Chat ho tro hien thi Markdown co ban:

- In dam.
- Danh sach bullet.
- Danh sach so.
- Inline code.
- Xuong dong.

## 10. Backend API

Backend dung FastAPI.

Endpoint chinh:

- `GET /`: thong tin API.
- `GET /health`: kiem tra trang thai backend va model.
- `POST /predict`: du doan hao hut cho mot loai go.
- `POST /predict/batch`: du doan hao hut theo nhieu loai go.
- `GET /wood-types`: lay danh sach loai go ho tro.
- `POST /chat`: goi AI chat.
- `POST /mcp/run-template`: proxy goi MCP template.

Backend doc bien moi truong:

- `GEMINI_API_KEY`.
- `GEMINI_MODEL`.
- `MCP_URL`.
- `MCP_TOKEN`.
- `CORS_ORIGINS`.

## 11. Luu tru du lieu hien tai

Ung dung dang luu du lieu thao tac moi tren frontend bang localStorage.

Dang luu:

- Phieu san xuat.
- Kho local.
- Du lieu MCP cache.
- Yeu cau phoi bo sung.
- Danh sach MCP bi xoa/an khoi kho.

Luu y: localStorage phu hop demo/noi bo may nguoi dung. Neu muon dung nhieu nguoi cung luc can chuyen phan luu tru sang database backend.

## 12. Deploy

Du an da co cau hinh:

- `render.yaml`: deploy backend len Render.
- `frontend/vercel.json`: deploy frontend len Vercel va ho tro route SPA.

Khi deploy:

- Render chay backend trong thu muc `backend`.
- Vercel chay frontend trong thu muc `frontend`.
- Vercel can bien `VITE_API_URL` tro ve URL backend Render.
- Render can `CORS_ORIGINS` tro ve domain frontend Vercel.


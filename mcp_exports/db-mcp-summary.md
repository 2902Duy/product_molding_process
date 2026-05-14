# MCP Data Samples

Generated from the local backend MCP proxy on 2026-05-14.

The app currently reads these MCP templates:

- `exec_tr_dondathang_getlisthtr`: order list.
- `exec_tr_dondathang_chitiet_getall`: order detail/product lines.
- `exec_dqt_dinhmuc_govan_get`: BOM/material detail for one product.
- `exec_dqt_thongke_phoi_getall`: inventory/material stock.

Note: Vietnamese text from the MCP response is currently decoded as mojibake in some fields, for example `CÃ´ng ty...` and `THÃNG`. Numeric fields are still usable.

## 1. Orders

Template:

```json
{
  "name": "exec_tr_dondathang_getlisthtr",
  "args": {
    "trangthai": "all"
  }
}
```

Sample rows:

```json
[
  {
    "maddh": "DQH-VFM16/0526",
    "mancc": "DQH",
    "tenncc": "CÃ´ng ty TNHH Äá»ng Quá»c HÆ°ng",
    "ngaydat": "2026-05-13T00:00:00.000Z",
    "donhang": "DQH-270,DQH-271,DQH-272"
  },
  {
    "maddh": "DQH-VFM17/0526",
    "mancc": "DQH",
    "tenncc": "CÃ´ng ty TNHH Äá»ng Quá»c HÆ°ng",
    "ngaydat": "2026-05-13T00:00:00.000Z",
    "donhang": "SPO-049.26-EPO-CAMILLE-R0"
  }
]
```

App mapping:

```js
{
  id: row.maddh,
  name: row.donhang || row.maddh,
  supplierCode: row.mancc,
  supplierName: row.tenncc,
  orderDate: row.ngaydat,
  products: []
}
```

## 2. Order Details

Template:

```json
{
  "name": "exec_tr_dondathang_chitiet_getall",
  "args": {
    "maddh": "DQH-VFM16/0526"
  }
}
```

Sample rows:

```json
[
  {
    "id": 286376,
    "maddh": "DQH-VFM16/0526",
    "masp": "D5472_R1_EDC001RI_EPO",
    "chitiet": "WD5472_R1_TL",
    "tenchitiet": "Pacifica Modeno Queen Bed",
    "soluong": 90,
    "dvt": "CÃ¡i",
    "sl_danhan": 0,
    "sl_conlai": 90,
    "donhang": "DQH-270",
    "ngaycangiao": "2026-06-25T00:00:00.000Z",
    "mota": "Pacifica Modeno Queen Bed",
    "mausac": "EDC001RI"
  },
  {
    "id": 286379,
    "maddh": "DQH-VFM16/0526",
    "masp": "D5476-R1_EDC001RI_EPO",
    "chitiet": "WD5476-R1_TL",
    "tenchitiet": "Pacifica Modeno Full Bed",
    "soluong": 65,
    "dvt": "CÃ¡i",
    "sl_danhan": 0,
    "sl_conlai": 65,
    "donhang": "DQH-271",
    "ngaycangiao": "2026-06-25T00:00:00.000Z",
    "mota": "Pacifica Modeno Full Bed",
    "mausac": "EDC001RI"
  },
  {
    "id": 286375,
    "maddh": "DQH-VFM16/0526",
    "masp": "D5474-R1_EDC001RI_EPO",
    "chitiet": "WD5474-R1_TL",
    "tenchitiet": "Pacifica Modeno Twin Bed",
    "soluong": 55,
    "dvt": "CÃ¡i",
    "sl_danhan": 0,
    "sl_conlai": 55,
    "donhang": "DQH-270",
    "ngaycangiao": "2026-06-25T00:00:00.000Z",
    "mota": "Pacifica Modeno Twin Bed",
    "mausac": "EDC001RI"
  }
]
```

App mapping:

```js
{
  id: row.masp || `MCP-PROD-${row.id}`,
  name: row.tenchitiet || row.mota || row.masp,
  quantity: Number(row.soluong) || 0,
  orderLineId: row.id,
  deliveryDate: row.ngaycangiao,
  color: row.mausac,
  items: []
}
```

## 3. Product BOM

Template:

```json
{
  "name": "exec_dqt_dinhmuc_govan_get",
  "args": {
    "masp": "D5472_R1_EDC001RI_EPO",
    "soluong": 90,
    "nguyenlieu": "all"
  }
}
```

Sample rows:

```json
[
  {
    "id": 240923,
    "masp": "D5472_R1_EDC001RI_EPO",
    "mact": "50483",
    "stt": "A01",
    "chitiet": "Äáº¦U GIÆ¯á»NG",
    "nguyenlieu": "0",
    "dayy_tc": 0,
    "rong_tc": 0,
    "dai_tc": 0,
    "soluong_tc": 1,
    "soluong_donhang": 90,
    "m3_tc": 0
  },
  {
    "id": 240924,
    "masp": "D5472_R1_EDC001RI_EPO",
    "mact": "50484",
    "stt": "A011",
    "chitiet": "Thanh ngang trÃªn Äáº§u giÆ°á»ng",
    "nguyenlieu": "THÃNG",
    "dayy_tc": 45,
    "rong_tc": 65,
    "dai_tc": 1588,
    "soluong_tc": 1,
    "soluong_donhang": 90,
    "m3_tc": 0.4176
  },
  {
    "id": 240925,
    "masp": "D5472_R1_EDC001RI_EPO",
    "mact": "50485",
    "stt": "A012",
    "chitiet": "Thanh ngang dÆ°á»i Äáº§u giÆ°á»ng",
    "nguyenlieu": "THÃNG",
    "dayy_tc": 20,
    "rong_tc": 150,
    "dai_tc": 1498,
    "soluong_tc": 1,
    "soluong_donhang": 90,
    "m3_tc": 0.4041
  }
]
```

App mapping:

```js
{
  id: row.mact || `MCP-ITEM-${row.id}`,
  name: row.chitiet,
  materialType: row.nguyenlieu,
  thickness: Number(row.dayy_tc) || 0,
  width: Number(row.rong_tc) || 0,
  length: Number(row.dai_tc) || 0,
  base_quantity: Number(row.soluong_tc) || 1,
  m3_tc: Number(row.m3_tc) || 0
}
```

Rows where `nguyenlieu` is `"0"` are section/group rows and are skipped by the app mapper.

## 4. Inventory

Template:

```json
{
  "name": "exec_dqt_thongke_phoi_getall",
  "args": {}
}
```

Sample rows:

```json
[
  {
    "id": 2415,
    "bengiao": "Kho gá»",
    "madonhang": "DQH-VFM01/0925",
    "nguyenlieu": "THÃNG",
    "day_sc": 28,
    "rong_sc": 75,
    "dai_sc": 3560,
    "soluong": 230,
    "sokhoi": 1.72,
    "ngaythang": "2025-09-12T00:00:00.000Z",
    "isIn": true,
    "malo_nguyenlieu": "3507/NL/2025",
    "p_id": "DF30582A-CA33-4AFB-ABC8-618619E8D2A5",
    "fsc_name": "Non FSC",
    "nguongoc": "Chile",
    "donhang": "DQH-232; DQH-234,DQH-232,DQH-233; DQH-235,DQH-233,DQH-234,DQH-235",
    "soluong_conlai": 0,
    "sokhoi_conlai": 0
  },
  {
    "id": 2417,
    "bengiao": "Kho gá»",
    "madonhang": "DQH-VFM01/0925",
    "nguyenlieu": "THÃNG",
    "day_sc": 28,
    "rong_sc": 95,
    "dai_sc": 3350,
    "soluong": 228,
    "sokhoi": 2.04,
    "ngaythang": "2025-09-12T00:00:00.000Z",
    "isIn": true,
    "malo_nguyenlieu": "3507/NL/2025",
    "p_id": "DF30582A-CA33-4AFB-ABC8-618619E8D2A5",
    "fsc_name": "Non FSC",
    "nguongoc": "Chile",
    "donhang": "DQH-232; DQH-234,DQH-232,DQH-233; DQH-235,DQH-233,DQH-234,DQH-235",
    "soluong_conlai": 0,
    "sokhoi_conlai": 0
  }
]
```

App mapping:

```js
{
  id: `MCP-INV-${row.id}`,
  mcp_id: row.id,
  batchId: row.malo_nguyenlieu || row.p_id || row.madonhang,
  name: row.nguyenlieu,
  thickness: Number(row.day_sc) || 0,
  width: Number(row.rong_sc) || 0,
  length: Number(row.dai_sc) || 0,
  quantity: firstPositive(row.soluong_conlai, row.soluong),
  volume: firstPositive(row.sokhoi_conlai, row.sokhoi),
  type: "RAW",
  source_lot_id: row.madonhang,
  source: "mcp",
  fsc_name: row.fsc_name,
  origin: row.nguongoc,
  orderName: row.donhang
}
```

Important inventory note: in current MCP rows, `soluong_conlai` and `sokhoi_conlai` can be `0` while `soluong` and `sokhoi` contain the usable quantity/volume. The app mapper therefore falls back to `soluong`/`sokhoi` when the `*_conlai` values are not positive.

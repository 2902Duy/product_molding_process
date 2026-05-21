-- ============================================================================
-- FULL DATABASE REBUILD - Product Molding Process
-- WARNING: This drops existing application tables and all data in them.
-- Run in Supabase SQL Editor only after you are ready to reset the database.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop dependent tables first.
DROP TABLE IF EXISTS detail_stage_progress CASCADE;
DROP TABLE IF EXISTS stage_tickets CASCADE;
DROP TABLE IF EXISTS production_detail_rows CASCADE;
DROP TABLE IF EXISTS production_lot_outputs CASCADE;
DROP TABLE IF EXISTS production_lot_inputs CASCADE;
DROP TABLE IF EXISTS production_lot_target_products CASCADE;
DROP TABLE IF EXISTS production_lots CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS inventory_batches CASCADE;
DROP TABLE IF EXISTS product_details CASCADE;
DROP TABLE IF EXISTS order_products CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- Compatibility cleanup for older schema names.
DROP TABLE IF EXISTS lot_outputs CASCADE;
DROP TABLE IF EXISTS lot_inputs CASCADE;
DROP TABLE IF EXISTS lot_targets CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;

DROP TYPE IF EXISTS slip_type CASCADE;
DROP TYPE IF EXISTS lot_status CASCADE;
DROP TYPE IF EXISTS inventory_type CASCADE;
DROP TYPE IF EXISTS inventory_status CASCADE;

CREATE TYPE slip_type AS ENUM (
  'PHOI_GO',
  'DINH_HINH',
  'ASSEMBLY',
  'PAINTING',
  'PACKING',
  'HOAN_THIEN'
);

CREATE TYPE lot_status AS ENUM (
  'DRAFT',
  'DANG_SAN_XUAT',
  'HOAN_THANH',
  'DA_HUY'
);

CREATE TYPE inventory_type AS ENUM (
  'RAW',
  'SEMIFINISHED',
  'FINISHED',
  'SURPLUS',
  'WASTE'
);

CREATE TYPE inventory_status AS ENUM (
  'AVAILABLE',
  'RESERVED',
  'USED',
  'SCRAPPED'
);

-- ============================================================================
-- MCP ORDERS: order -> products -> product details/BOM
-- ============================================================================

CREATE TABLE orders (
  id VARCHAR(120) PRIMARY KEY,                 -- MCP maddh
  name VARCHAR(255) NOT NULL,                  -- MCP donhang
  status VARCHAR(100),
  customer_id VARCHAR(120),
  customer_name VARCHAR(255),
  supplier_id VARCHAR(120),
  supplier_name VARCHAR(255),
  order_date DATE,
  delivery_date DATE,
  source VARCHAR(50) NOT NULL DEFAULT 'mcp',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_products (
  id VARCHAR(160) PRIMARY KEY,                 -- e.g. MCP-PROD-LINE-286573
  order_id VARCHAR(120) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  mcp_line_id VARCHAR(120),                    -- MCP detail row id
  product_code VARCHAR(160),                   -- MCP masp
  detail_code VARCHAR(160),                    -- MCP chitiet
  name TEXT NOT NULL,                          -- MCP tenchitiet / mota
  unit VARCHAR(50),
  quantity_ordered NUMERIC(14,4) NOT NULL DEFAULT 0,
  quantity_completed NUMERIC(14,4) NOT NULL DEFAULT 0,
  quantity_remaining NUMERIC(14,4) GENERATED ALWAYS AS (
    GREATEST(quantity_ordered - quantity_completed, 0)
  ) STORED,
  length NUMERIC(12,3),
  width NUMERIC(12,3),
  thickness NUMERIC(12,3),
  volume NUMERIC(14,6),
  color VARCHAR(120),
  delivery_date DATE,
  source VARCHAR(50) NOT NULL DEFAULT 'mcp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, mcp_line_id)
);

CREATE TABLE product_details (
  id VARCHAR(220) PRIMARY KEY,                 -- order_id__product_id__mact/id
  order_id VARCHAR(120) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(160) NOT NULL REFERENCES order_products(id) ON DELETE CASCADE,
  mcp_detail_id VARCHAR(120),                  -- MCP id
  detail_code VARCHAR(160),                    -- MCP mact
  name TEXT NOT NULL,                          -- MCP chitiet
  material_type VARCHAR(255),                  -- MCP nguyenlieu
  length NUMERIC(12,3),
  width NUMERIC(12,3),
  thickness NUMERIC(12,3),
  base_quantity NUMERIC(14,4) NOT NULL DEFAULT 1,
  order_quantity NUMERIC(14,4),
  volume_per_unit NUMERIC(14,6),
  process_note TEXT,
  source VARCHAR(50) NOT NULL DEFAULT 'mcp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, detail_code)
);

-- ============================================================================
-- INVENTORY: one batch can contain many size rows
-- ============================================================================

CREATE TABLE inventory_batches (
  id VARCHAR(160) PRIMARY KEY,                 -- MCP malo_nguyenlieu when present
  mcp_batch_id VARCHAR(160),                   -- MCP p_id or equivalent
  order_id VARCHAR(120) REFERENCES orders(id) ON DELETE SET NULL,
  order_name VARCHAR(255),
  wood_type VARCHAR(255),
  fsc_name VARCHAR(255),
  origin VARCHAR(255),
  source VARCHAR(50) NOT NULL DEFAULT 'mcp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inventory_items (
  id VARCHAR(160) PRIMARY KEY,                 -- e.g. MCP-INV-4290, unique per quy cach
  batch_id VARCHAR(160) NOT NULL REFERENCES inventory_batches(id) ON DELETE CASCADE,
  mcp_inventory_id VARCHAR(120) UNIQUE,        -- MCP row id
  name TEXT NOT NULL,
  type inventory_type NOT NULL DEFAULT 'RAW',
  status inventory_status NOT NULL DEFAULT 'AVAILABLE',
  length NUMERIC(12,3),
  width NUMERIC(12,3),
  thickness NUMERIC(12,3),
  quantity_original NUMERIC(14,4) NOT NULL DEFAULT 0,
  quantity_current NUMERIC(14,4) NOT NULL DEFAULT 0,
  quantity_consumed NUMERIC(14,4) NOT NULL DEFAULT 0,
  volume_original NUMERIC(14,6) NOT NULL DEFAULT 0,
  volume_current NUMERIC(14,6) NOT NULL DEFAULT 0,
  volume_consumed NUMERIC(14,6) NOT NULL DEFAULT 0,
  source_lot_id VARCHAR(80),
  source VARCHAR(50) NOT NULL DEFAULT 'mcp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- PRODUCTION LOTS
-- ============================================================================

CREATE TABLE production_lots (
  id VARCHAR(80) PRIMARY KEY,
  name VARCHAR(255),
  slip_type slip_type NOT NULL,
  status lot_status NOT NULL DEFAULT 'DANG_SAN_XUAT',
  created_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  created_by VARCHAR(120),
  source_lot_id VARCHAR(80) REFERENCES production_lots(id) ON DELETE SET NULL,
  handoff_lot_id VARCHAR(80),
  is_handoff BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE production_lot_target_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id VARCHAR(80) NOT NULL REFERENCES production_lots(id) ON DELETE CASCADE,
  order_id VARCHAR(120) NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  product_id VARCHAR(160) NOT NULL REFERENCES order_products(id) ON DELETE RESTRICT,
  quantity_produce NUMERIC(14,4) NOT NULL DEFAULT 0,
  quantity_completed NUMERIC(14,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lot_id, product_id)
);

CREATE TABLE production_lot_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id VARCHAR(80) NOT NULL REFERENCES production_lots(id) ON DELETE CASCADE,
  inventory_item_id VARCHAR(160) NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity_used NUMERIC(14,4) NOT NULL DEFAULT 0,
  volume_used NUMERIC(14,6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lot_id, inventory_item_id)
);

CREATE TABLE production_detail_rows (
  id VARCHAR(220) PRIMARY KEY,
  lot_id VARCHAR(80) NOT NULL REFERENCES production_lots(id) ON DELETE CASCADE,
  target_product_id UUID REFERENCES production_lot_target_products(id) ON DELETE CASCADE,
  product_id VARCHAR(160) REFERENCES order_products(id) ON DELETE SET NULL,
  product_detail_id VARCHAR(220) REFERENCES product_details(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  length NUMERIC(12,3),
  width NUMERIC(12,3),
  thickness NUMERIC(12,3),
  base_quantity NUMERIC(14,4) NOT NULL DEFAULT 1,
  quantity_required NUMERIC(14,4) NOT NULL DEFAULT 0,
  quantity_completed NUMERIC(14,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE production_lot_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id VARCHAR(80) NOT NULL REFERENCES production_lots(id) ON DELETE CASCADE,
  product_id VARCHAR(160) REFERENCES order_products(id) ON DELETE SET NULL,
  product_detail_id VARCHAR(220) REFERENCES product_details(id) ON DELETE SET NULL,
  inventory_item_id VARCHAR(160) REFERENCES inventory_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type inventory_type NOT NULL DEFAULT 'SEMIFINISHED',
  status inventory_status NOT NULL DEFAULT 'AVAILABLE',
  length NUMERIC(12,3),
  width NUMERIC(12,3),
  thickness NUMERIC(12,3),
  quantity NUMERIC(14,4) NOT NULL DEFAULT 0,
  volume NUMERIC(14,6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optional stage tracking for molding / finishing workflows.
CREATE TABLE stage_tickets (
  id VARCHAR(120) PRIMARY KEY,
  lot_id VARCHAR(80) NOT NULL REFERENCES production_lots(id) ON DELETE CASCADE,
  stage_id VARCHAR(80) NOT NULL,
  stage_name VARCHAR(160) NOT NULL,
  status VARCHAR(80) NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE detail_stage_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detail_row_id VARCHAR(220) NOT NULL REFERENCES production_detail_rows(id) ON DELETE CASCADE,
  ticket_id VARCHAR(120) REFERENCES stage_tickets(id) ON DELETE SET NULL,
  stage_id VARCHAR(80) NOT NULL,
  stage_name VARCHAR(160) NOT NULL,
  quantity_required NUMERIC(14,4) NOT NULL DEFAULT 0,
  quantity_completed NUMERIC(14,4) NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  UNIQUE (detail_row_id, stage_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_orders_name ON orders(name);
CREATE INDEX idx_order_products_order_id ON order_products(order_id);
CREATE INDEX idx_order_products_code ON order_products(product_code);
CREATE INDEX idx_product_details_product_id ON product_details(product_id);
CREATE INDEX idx_product_details_detail_code ON product_details(detail_code);

CREATE INDEX idx_inventory_batches_order_id ON inventory_batches(order_id);
CREATE INDEX idx_inventory_items_batch_id ON inventory_items(batch_id);
CREATE INDEX idx_inventory_items_type_status ON inventory_items(type, status);
CREATE INDEX idx_inventory_items_dimensions ON inventory_items(thickness, width, length);

CREATE INDEX idx_production_lots_slip_status ON production_lots(slip_type, status);
CREATE INDEX idx_production_lot_inputs_lot_id ON production_lot_inputs(lot_id);
CREATE INDEX idx_production_lot_inputs_inventory_item_id ON production_lot_inputs(inventory_item_id);
CREATE INDEX idx_production_detail_rows_lot_id ON production_detail_rows(lot_id);
CREATE INDEX idx_production_lot_outputs_lot_id ON production_lot_outputs(lot_id);

COMMIT;

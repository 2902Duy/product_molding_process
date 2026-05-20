-- ============================================================================
-- Supabase PostgreSQL Schema for Product Molding Process
-- Matches backend/models/orm.py ORM models
-- ============================================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE slip_type AS ENUM ('PHOI_GO', 'DINH_HINH', 'ASSEMBLY', 'PAINTING', 'PACKING', 'HOAN_THIEN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lot_status AS ENUM ('Đang sản xuất', 'Hoàn thành', 'Đã huỷ');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE inventory_type AS ENUM ('RAW', 'SEMIFINISHED', 'FINISHED', 'SURPLUS', 'WASTE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE inventory_status AS ENUM ('AVAILABLE', 'RESERVED', 'USED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Production Lots
CREATE TABLE IF NOT EXISTS production_lots (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'Đang sản xuất',
  created_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  slip_type VARCHAR(20) NOT NULL DEFAULT 'PHOI_GO',
  data JSONB DEFAULT '{}'::jsonb
);

-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'RAW',
  status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
  length NUMERIC(10,2) DEFAULT 0,
  width NUMERIC(10,2) DEFAULT 0,
  thickness NUMERIC(10,2) DEFAULT 0,
  quantity NUMERIC(12,4) NOT NULL DEFAULT 0,
  volume NUMERIC(12,6) DEFAULT 0,
  source_lot_id VARCHAR(50),
  source VARCHAR(50),
  wood_type VARCHAR(255),
  data JSONB DEFAULT '{}'::jsonb
);

-- Lot Inputs (composite PK)
CREATE TABLE IF NOT EXISTS lot_inputs (
  lot_id VARCHAR(50) NOT NULL,
  inventory_id VARCHAR(100) NOT NULL,
  quantity_used NUMERIC(12,4) NOT NULL DEFAULT 0,
  volume_used NUMERIC(12,6) DEFAULT 0,
  PRIMARY KEY (lot_id, inventory_id)
);

-- Lot Outputs
CREATE TABLE IF NOT EXISTS lot_outputs (
  id SERIAL PRIMARY KEY,
  lot_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  length NUMERIC(10,2) DEFAULT 0,
  width NUMERIC(10,2) DEFAULT 0,
  thickness NUMERIC(10,2) DEFAULT 0,
  quantity NUMERIC(12,4) DEFAULT 0,
  volume NUMERIC(12,6) NOT NULL DEFAULT 0,
  status VARCHAR(100)
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50),
  created_date DATE DEFAULT CURRENT_DATE,
  data JSONB DEFAULT '{}'::jsonb
);

-- Lot Targets
CREATE TABLE IF NOT EXISTS lot_targets (
  lot_id VARCHAR(50) NOT NULL,
  order_id VARCHAR(50),
  quantity_produce INT NOT NULL DEFAULT 0,
  PRIMARY KEY (lot_id)
);

-- Foreign Keys
ALTER TABLE inventory
  ADD CONSTRAINT fk_inventory_source_lot
  FOREIGN KEY (source_lot_id) REFERENCES production_lots(id)
  ON DELETE SET NULL DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE lot_inputs
  ADD CONSTRAINT fk_lot_inputs_lot
  FOREIGN KEY (lot_id) REFERENCES production_lots(id)
  ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE lot_inputs
  ADD CONSTRAINT fk_lot_inputs_inventory
  FOREIGN KEY (inventory_id) REFERENCES inventory(id)
  ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE lot_outputs
  ADD CONSTRAINT fk_lot_outputs_lot
  FOREIGN KEY (lot_id) REFERENCES production_lots(id)
  ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE lot_targets
  ADD CONSTRAINT fk_lot_targets_lot
  FOREIGN KEY (lot_id) REFERENCES production_lots(id)
  ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE lot_targets
  ADD CONSTRAINT fk_lot_targets_order
  FOREIGN KEY (order_id) REFERENCES orders(id)
  ON DELETE SET NULL DEFERRABLE INITIALLY IMMEDIATE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_production_lots_slip_type ON production_lots(slip_type);
CREATE INDEX IF NOT EXISTS idx_production_lots_status ON production_lots(status);
CREATE INDEX IF NOT EXISTS idx_inventory_type ON inventory(type);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_source_lot ON inventory(source_lot_id);
CREATE INDEX IF NOT EXISTS idx_lot_inputs_lot_id ON lot_inputs(lot_id);
CREATE INDEX IF NOT EXISTS idx_lot_outputs_lot_id ON lot_outputs(lot_id);

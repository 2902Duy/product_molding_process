-- ============================================================================
-- Supabase PostgreSQL Schema for Product Molding Process (Corrected)
-- Matches backend/models/orm.py ORM models exactly
-- ============================================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE slip_type AS ENUM ('PHOI_GO', 'DINH_HINH', 'ASSEMBLY', 'PAINTING', 'PACKING', 'HOAN_THIEN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lot_status AS ENUM ('DRAFT', 'Đang sản xuất', 'Hoàn thành');
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
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  created_date DATE NOT NULL DEFAULT CURRENT_DATE,
  slip_type VARCHAR(20) NOT NULL DEFAULT 'PHOI_GO',
  description TEXT,
  created_by VARCHAR(100),
  updated_at TIMESTAMPTZ,
  data JSONB DEFAULT '{}'::jsonb
);

-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'RAW',
  length INTEGER,
  width INTEGER,
  thickness INTEGER,
  quantity INTEGER NOT NULL DEFAULT 0,
  volume NUMERIC(10, 4),
  status VARCHAR(100) DEFAULT 'AVAILABLE',
  source_lot_id VARCHAR(50) REFERENCES production_lots(id) ON DELETE SET NULL,
  wood_type VARCHAR(50),
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Lot Inputs
CREATE TABLE IF NOT EXISTS lot_inputs (
  lot_id VARCHAR(50) NOT NULL REFERENCES production_lots(id) ON DELETE CASCADE,
  inventory_id VARCHAR(50) NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  quantity_used INTEGER NOT NULL,
  volume_used NUMERIC(10, 4),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (lot_id, inventory_id)
);

-- Lot Outputs
CREATE TABLE IF NOT EXISTS lot_outputs (
  id SERIAL PRIMARY KEY,
  lot_id VARCHAR(50) NOT NULL REFERENCES production_lots(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  length INTEGER,
  width INTEGER,
  thickness INTEGER,
  quantity INTEGER,
  volume NUMERIC(10, 4) NOT NULL,
  status VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50),
  created_date DATE DEFAULT CURRENT_DATE,
  customer_name VARCHAR(255),
  notes TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Lot Targets
CREATE TABLE IF NOT EXISTS lot_targets (
  lot_id VARCHAR(50) NOT NULL REFERENCES production_lots(id) ON DELETE CASCADE,
  order_id VARCHAR(50) REFERENCES orders(id) ON DELETE SET NULL,
  quantity_produce INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (lot_id)
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  username VARCHAR(100) PRIMARY KEY,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Custom Requests (phôi bổ sung)
CREATE TABLE IF NOT EXISTS custom_requests (
  id VARCHAR(100) PRIMARY KEY,
  wood_type VARCHAR(120) NOT NULL,
  thickness NUMERIC(12, 3) NOT NULL,
  width NUMERIC(12, 3) NOT NULL,
  length NUMERIC(12, 3) NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  source_molding_lot_id VARCHAR(50) REFERENCES production_lots(id) ON DELETE SET NULL,
  supplemental_lot_id VARCHAR(50) REFERENCES production_lots(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_production_lots_slip_type ON production_lots(slip_type);
CREATE INDEX IF NOT EXISTS idx_production_lots_status ON production_lots(status);
CREATE INDEX IF NOT EXISTS idx_inventory_type ON inventory(type);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_source_lot ON inventory(source_lot_id);
CREATE INDEX IF NOT EXISTS idx_lot_inputs_lot_id ON lot_inputs(lot_id);
CREATE INDEX IF NOT EXISTS idx_lot_outputs_lot_id ON lot_outputs(lot_id);
CREATE INDEX IF NOT EXISTS idx_custom_requests_molding_lot ON custom_requests(source_molding_lot_id);
CREATE INDEX IF NOT EXISTS idx_custom_requests_supplemental_lot ON custom_requests(supplemental_lot_id);


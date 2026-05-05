CREATE TABLE "ProductionLots" (
  "id" "VARCHAR(50)" PRIMARY KEY,
  "name" "VARCHAR(255)",
  "status" "VARCHAR(50)" NOT NULL,
  "created_date" DATE NOT NULL,
  "description" TEXT
);

CREATE TABLE "Inventory" (
  "id" "VARCHAR(50)" PRIMARY KEY,
  "name" "VARCHAR(255)" NOT NULL,
  "type" "VARCHAR(20)" NOT NULL,
  "length" INT,
  "width" INT,
  "thickness" INT,
  "quantity" INT NOT NULL DEFAULT 0,
  "volume" "DECIMAL(10,4)",
  "status" "VARCHAR(100)",
  "source_lot_id" "VARCHAR(50)"
);

CREATE TABLE "Lot_Inputs" (
  "lot_id" "VARCHAR(50)" NOT NULL,
  "inventory_id" "VARCHAR(50)" NOT NULL,
  "quantity_used" INT NOT NULL,
  "volume_used" "DECIMAL(10,4)",
  PRIMARY KEY ("lot_id", "inventory_id")
);

CREATE TABLE "Lot_Outputs" (
  "id" SERIAL PRIMARY KEY,
  "lot_id" "VARCHAR(50)" NOT NULL,
  "name" "VARCHAR(255)" NOT NULL,
  "length" INT,
  "width" INT,
  "thickness" INT,
  "quantity" INT,
  "volume" "DECIMAL(10,4)" NOT NULL,
  "status" "VARCHAR(100)"
);

CREATE TABLE "Orders" (
  "id" "VARCHAR(50)" PRIMARY KEY,
  "name" "VARCHAR(255)" NOT NULL,
  "status" "VARCHAR(50)",
  "created_date" DATE DEFAULT (CURRENT_DATE)
);

CREATE TABLE "Products" (
  "id" "VARCHAR(50)" PRIMARY KEY,
  "order_id" "VARCHAR(50)" NOT NULL,
  "name" "VARCHAR(255)" NOT NULL,
  "quantity" INT NOT NULL
);

CREATE TABLE "Product_Parts" (
  "id" SERIAL PRIMARY KEY,
  "product_id" "VARCHAR(50)" NOT NULL,
  "name" "VARCHAR(255)" NOT NULL,
  "length" INT,
  "width" INT,
  "thickness" INT,
  "base_quantity" INT NOT NULL
);

CREATE TABLE "Lot_Targets" (
  "lot_id" "VARCHAR(50)" NOT NULL,
  "order_id" "VARCHAR(50)",
  "quantity_produce" INT NOT NULL,
  PRIMARY KEY ("lot_id")
);

ALTER TABLE "Inventory" ADD FOREIGN KEY ("source_lot_id") REFERENCES "ProductionLots" ("id") ON DELETE SET NULL DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Lot_Inputs" ADD FOREIGN KEY ("lot_id") REFERENCES "ProductionLots" ("id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Lot_Inputs" ADD FOREIGN KEY ("inventory_id") REFERENCES "Inventory" ("id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Lot_Outputs" ADD FOREIGN KEY ("lot_id") REFERENCES "ProductionLots" ("id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Products" ADD FOREIGN KEY ("order_id") REFERENCES "Orders" ("id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Product_Parts" ADD FOREIGN KEY ("product_id") REFERENCES "Products" ("id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Lot_Targets" ADD FOREIGN KEY ("lot_id") REFERENCES "ProductionLots" ("id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Lot_Targets" ADD FOREIGN KEY ("order_id") REFERENCES "Orders" ("id") ON DELETE SET NULL DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Inventory" ADD FOREIGN KEY ("quantity") REFERENCES "Lot_Targets" ("quantity_produce") DEFERRABLE INITIALLY IMMEDIATE;

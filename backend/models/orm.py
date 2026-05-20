"""
SQLAlchemy ORM models for Supabase PostgreSQL.
"""
import enum
from datetime import date, datetime

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from database import Base


class SlipType(str, enum.Enum):
    PHOI_GO = "PHOI_GO"
    DINH_HINH = "DINH_HINH"
    ASSEMBLY = "ASSEMBLY"
    PAINTING = "PAINTING"
    PACKING = "PACKING"
    HOAN_THIEN = "HOAN_THIEN"


class LotStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    DANG_SAN_XUAT = "Đang sản xuất"
    HOAN_THANH = "Hoàn thành"


class InventoryType(str, enum.Enum):
    RAW = "RAW"
    SEMIFINISHED = "SEMIFINISHED"
    FINISHED = "FINISHED"
    SURPLUS = "SURPLUS"
    WASTE = "WASTE"


class InventoryStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    RESERVED = "RESERVED"
    USED = "USED"


class ProductionLot(Base):
    __tablename__ = "production_lots"

    id = Column(String(50), primary_key=True)
    name = Column(String(255))
    status = Column(String(50), nullable=False, default="DRAFT")
    created_date = Column(Date, nullable=False, default=date.today)
    slip_type = Column(String(20), nullable=False, default="PHOI_GO")
    description = Column(Text)
    created_by = Column(String(100))
    updated_at = Column(DateTime, onupdate=func.now())
    data = Column(JSONB)

    inputs = relationship("LotInput", back_populates="lot", cascade="all, delete-orphan")
    outputs = relationship("LotOutput", back_populates="lot", cascade="all, delete-orphan")
    target = relationship("LotTarget", back_populates="lot", uselist=False, cascade="all, delete-orphan")


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False)
    type = Column(String(20), nullable=False, default="RAW")
    length = Column(Integer)
    width = Column(Integer)
    thickness = Column(Integer)
    quantity = Column(Integer, nullable=False, default=0)
    volume = Column(Numeric(10, 4))
    status = Column(String(100), default="AVAILABLE")
    source_lot_id = Column(String(50), ForeignKey("production_lots.id", ondelete="SET NULL"))
    wood_type = Column(String(50))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class LotInput(Base):
    __tablename__ = "lot_inputs"

    lot_id = Column(String(50), ForeignKey("production_lots.id", ondelete="CASCADE"), primary_key=True)
    inventory_id = Column(String(50), ForeignKey("inventory.id", ondelete="CASCADE"), primary_key=True)
    quantity_used = Column(Integer, nullable=False)
    volume_used = Column(Numeric(10, 4))
    created_at = Column(DateTime, default=func.now())

    lot = relationship("ProductionLot", back_populates="inputs")
    inventory = relationship("Inventory")


class LotOutput(Base):
    __tablename__ = "lot_outputs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    lot_id = Column(String(50), ForeignKey("production_lots.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    length = Column(Integer)
    width = Column(Integer)
    thickness = Column(Integer)
    quantity = Column(Integer)
    volume = Column(Numeric(10, 4), nullable=False)
    status = Column(String(100))
    created_at = Column(DateTime, default=func.now())

    lot = relationship("ProductionLot", back_populates="outputs")


class Order(Base):
    __tablename__ = "orders"

    id = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False)
    status = Column(String(50))
    created_date = Column(Date, default=date.today)
    customer_name = Column(String(255))
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class LotTarget(Base):
    __tablename__ = "lot_targets"

    lot_id = Column(String(50), ForeignKey("production_lots.id", ondelete="CASCADE"), primary_key=True)
    order_id = Column(String(50), ForeignKey("orders.id", ondelete="SET NULL"))
    quantity_produce = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=func.now())

    lot = relationship("ProductionLot", back_populates="target")
    order = relationship("Order")

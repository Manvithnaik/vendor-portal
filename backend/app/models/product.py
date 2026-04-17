"""
SQLAlchemy models for schema.sql section 4 — product_categories, products,
product_tags, product_tag_map, contract_product_pricing, supply_chain_logistics.
"""
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, Date, ForeignKey, Integer,
    Numeric, SmallInteger, String, Text,
    TIMESTAMP, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class ProductCategory(Base):
    __tablename__ = "product_categories"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("product_categories.id"))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    sort_order = Column(SmallInteger, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)

    # Self-referential relationship
    parent = relationship("ProductCategory", remote_side=[id], back_populates="children")
    children = relationship("ProductCategory", back_populates="parent")
    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    manufacturer_org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("product_categories.id"), nullable=False, index=True)
    sku = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    specifications = Column(JSONB)
    unit_of_measure = Column(String(50))
    min_order_quantity = Column(Integer, nullable=False, default=1)
    lead_time_days = Column(Integer)
    is_active = Column(Boolean, nullable=False, default=True)
    deactivated_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("manufacturer_org_id", "sku", name="uq_manufacturer_sku"),
    )

    # Relationships
    manufacturer_org = relationship("Organization", back_populates="products")
    category = relationship("ProductCategory", back_populates="products")
    tag_map = relationship("ProductTagMap", back_populates="product", cascade="all, delete-orphan")
    contract_pricing = relationship("ContractProductPricing", back_populates="product")
    order_items = relationship("OrderItem", back_populates="product")


class ProductTag(Base):
    __tablename__ = "product_tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)

    # Relationships
    tag_map = relationship("ProductTagMap", back_populates="tag", cascade="all, delete-orphan")


class ProductTagMap(Base):
    __tablename__ = "product_tag_map"

    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("product_tags.id", ondelete="CASCADE"), primary_key=True)

    # Relationships
    product = relationship("Product", back_populates="tag_map")
    tag = relationship("ProductTag", back_populates="tag_map")


class ContractProductPricing(Base):
    __tablename__ = "contract_product_pricing"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    agreed_unit_price = Column(Numeric(12, 4), nullable=False)
    currency = Column(String(10), nullable=False, default="USD")
    discount_percent = Column(Numeric(5, 2), nullable=False, default=0.00)
    max_order_quantity = Column(Integer)
    is_active = Column(Boolean, nullable=False, default=True)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("contract_id", "product_id", name="uq_contract_product"),
    )

    # Relationships
    contract = relationship("Contract", back_populates="product_pricing")
    product = relationship("Product", back_populates="contract_pricing")
    order_items = relationship("OrderItem", back_populates="contract_pricing")


class SupplyChainLogistics(Base):
    __tablename__ = "supply_chain_logistics"

    id = Column(Integer, primary_key=True, index=True)
    manufacturer_org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    warehouse_name = Column(String(255))
    address = Column(String(500))
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))
    postal_code = Column(String(20))
    shipping_methods = Column(JSONB)
    incoterms = Column(String(50))
    is_primary = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, default=datetime.utcnow)

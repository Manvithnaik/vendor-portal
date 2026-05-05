"""
Python Enum classes mirroring every PostgreSQL ENUM type in schema.sql.
These are used by SQLAlchemy models AND Pydantic schemas.
"""
import enum


class OrgTypeEnum(str, enum.Enum):
    """
    DB-level org classification.

    IMPORTANT — Domain inversion:
      customer     = the BUYER role  → called "Manufacturer" in the UI
      manufacturer = the VENDOR/SUPPLIER role → called "Vendor" in the UI

    Use mappers.py to convert between DB values and frontend role strings.
    In Python code, prefer the semantic aliases 'buyer_org_id' / 'buyer_org'
    (column-aliased attributes) over direct use of these enum names where possible.
    """
    customer = "customer"        # Represents the BUYER ("Manufacturer" in UI)
    manufacturer = "manufacturer"  # Represents the VENDOR/SUPPLIER ("Vendor" in UI)


class RoleOrgTypeEnum(str, enum.Enum):
    """
    Scopes roles to an org classification.
    Mirrors the OrgTypeEnum inversion:
      customer     = role for BUYER orgs
      manufacturer = role for VENDOR orgs
    """
    customer = "customer"        # Role for BUYER (Manufacturer in UI)
    manufacturer = "manufacturer"  # Role for VENDOR (Vendor in UI)
    both = "both"


class VerifyStatusEnum(str, enum.Enum):
    pending = "pending"
    verified = "verified"
    rejected = "rejected"
    expired = "expired"


class ContractStatusEnum(str, enum.Enum):
    draft = "draft"
    active = "active"
    suspended = "suspended"
    expired = "expired"
    terminated = "terminated"


class OrderStatusEnum(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    confirmed = "confirmed"
    vendor_review = "vendor_review"    # PO sent to vendor; awaiting accept/reject
    accepted = "accepted"              # Vendor accepted the PO → moves to processing
    rejected = "rejected"              # Vendor rejected the PO (terminal)
    processing = "processing"
    ready_to_ship = "ready_to_ship"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"
    disputed = "disputed"


class QuoteStatusEnum(str, enum.Enum):
    submitted = "submitted"
    accepted = "accepted"    # Manufacturer selected this quote
    rejected = "rejected"    # Manufacturer rejected / chose another


class OrderPriorityEnum(str, enum.Enum):
    normal = "normal"
    urgent = "urgent"


class ShipmentStatusEnum(str, enum.Enum):
    pending = "pending"
    preparing = "preparing"
    picked_up = "picked_up"
    dispatched = "dispatched"
    in_transit = "in_transit"
    out_for_delivery = "out_for_delivery"
    delivered = "delivered"
    failed = "failed"
    returned = "returned"
    cancelled = "cancelled"


class EventSourceEnum(str, enum.Enum):
    carrier_api = "carrier_api"
    manual = "manual"
    system = "system"


class TicketCategoryEnum(str, enum.Enum):
    order_issue = "order_issue"
    payment_dispute = "payment_dispute"
    shipment_issue = "shipment_issue"
    product_quality = "product_quality"
    account = "account"
    other = "other"


class PriorityEnum(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class TicketStatusEnum(str, enum.Enum):
    # Customer portal states
    open = "open"
    in_progress = "in_progress"
    awaiting_customer = "awaiting_customer"
    awaiting_manufacturer = "awaiting_manufacturer"
    # Vendor portal dispute states
    requested = "requested"
    acknowledged = "acknowledged"
    investigating = "investigating"
    escalated = "escalated"
    # Shared terminal states
    resolved = "resolved"
    closed = "closed"


class PaymentMethodEnum(str, enum.Enum):
    bank_transfer = "bank_transfer"
    credit_card = "credit_card"
    letter_of_credit = "letter_of_credit"
    net_terms = "net_terms"


class PaymentStatusEnum(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"


class InvoiceStatusEnum(str, enum.Enum):
    draft = "draft"
    issued = "issued"
    partially_paid = "partially_paid"
    paid = "paid"
    overdue = "overdue"
    cancelled = "cancelled"
    disputed = "disputed"


class CrmInteractionEnum(str, enum.Enum):
    call = "call"
    email = "email"
    meeting = "meeting"
    demo = "demo"
    follow_up = "follow_up"
    note = "note"


class CrmTaskTypeEnum(str, enum.Enum):
    follow_up = "follow_up"
    contract_renewal = "contract_renewal"
    onboarding = "onboarding"
    issue_resolution = "issue_resolution"
    other = "other"


class CrmTaskStatusEnum(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class ResetMethodEnum(str, enum.Enum):
    otp = "otp"
    email_link = "email_link"


class PayoutStatusEnum(str, enum.Enum):
    scheduled = "scheduled"
    approved = "approved"
    processing = "processing"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class RfqStatusEnum(str, enum.Enum):
    draft = "draft"
    active = "active"
    extended = "extended"
    closed = "closed"
    cancelled = "cancelled"


class RefundStatusEnum(str, enum.Enum):
    initiated = "initiated"
    approved = "approved"
    processing = "processing"
    completed = "completed"
    rejected = "rejected"

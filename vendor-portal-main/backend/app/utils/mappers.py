# ---------------------------------------------------------------------------
# app/utils/mappers.py
#
# THE TRANSLATION LAYER — resolves all mismatches between the frontend's
# simplified vocabulary and the database's strict, normalized enums.
#
# Rules:
#   - Frontend → DB mapping is used on all incoming request data.
#   - DB → Frontend mapping is used when constructing API responses.
#   - These dicts must stay in sync with schema.sql ENUM definitions.
# ---------------------------------------------------------------------------

from typing import Optional
from app.models.enums import (
    OrgTypeEnum, OrderStatusEnum, RfqStatusEnum, VerifyStatusEnum,
)


# ---------------------------------------------------------------------------
# 1.  Role / Org type  (Frontend role string → DB org_type_enum)
# ---------------------------------------------------------------------------
# Frontend uses "vendor" for the supplier side (manufacturer org in DB)
# and "manufacturer" for the buying side (customer org in DB).
# This inversion is a product decision; the mapper handles it silently.

FRONTEND_ROLE_TO_ORG_TYPE: dict[str, Optional[OrgTypeEnum]] = {
    "vendor":       OrgTypeEnum.manufacturer,  # supplier side
    "manufacturer": OrgTypeEnum.customer,      # buyer side
    "admin":        None,                      # uses admins table, not organizations
}

ORG_TYPE_TO_FRONTEND_ROLE: dict[OrgTypeEnum, str] = {
    OrgTypeEnum.manufacturer: "vendor",
    OrgTypeEnum.customer:     "manufacturer",
}


def map_role_to_org_type(frontend_role: str) -> Optional[OrgTypeEnum]:
    """Convert frontend role string to database org_type_enum."""
    return FRONTEND_ROLE_TO_ORG_TYPE.get(frontend_role)


def map_org_type_to_role(org_type: OrgTypeEnum) -> str:
    """Convert database org_type_enum to frontend role string."""
    return ORG_TYPE_TO_FRONTEND_ROLE.get(org_type, org_type.value)


# ---------------------------------------------------------------------------
# 2.  Order Status  (Frontend → DB)
# ---------------------------------------------------------------------------
# New workflow states:
#   draft → submitted → vendor_review → accepted → processing → ready_to_ship → shipped → delivered
#                                    ↘ rejected (vendor declines PO)
# ---------------------------------------------------------------------------
FRONTEND_TO_DB_ORDER_STATUS: dict[str, OrderStatusEnum] = {
    # New workflow-specific states
    "vendor_review":  OrderStatusEnum.vendor_review,   # PO sent; awaiting vendor decision
    "accepted":       OrderStatusEnum.accepted,         # Vendor accepted the PO
    "rejected":       OrderStatusEnum.rejected,         # Vendor rejected the PO

    # Legacy pass-through / common states
    "draft":          OrderStatusEnum.draft,
    "submitted":      OrderStatusEnum.submitted,
    "confirmed":      OrderStatusEnum.confirmed,
    "processing":     OrderStatusEnum.processing,
    "ready_to_ship":  OrderStatusEnum.ready_to_ship,
    "shipped":        OrderStatusEnum.shipped,
    "delivered":      OrderStatusEnum.delivered,
    "cancelled":      OrderStatusEnum.cancelled,
    "disputed":       OrderStatusEnum.disputed,

    # Frontend legacy aliases (kept for backward compat)
    "pending":        OrderStatusEnum.vendor_review,   # "pending" now means waiting vendor review
}

DB_TO_FRONTEND_ORDER_STATUS: dict[OrderStatusEnum, str] = {
    OrderStatusEnum.draft:          "draft",
    OrderStatusEnum.submitted:      "submitted",
    OrderStatusEnum.confirmed:      "confirmed",
    OrderStatusEnum.vendor_review:  "pending",          # frontend shows "pending" for vendor_review
    OrderStatusEnum.accepted:       "accepted",
    OrderStatusEnum.rejected:       "rejected",
    OrderStatusEnum.processing:     "processing",
    OrderStatusEnum.ready_to_ship:  "ready_to_ship",
    OrderStatusEnum.shipped:        "shipped",
    OrderStatusEnum.delivered:      "delivered",
    OrderStatusEnum.cancelled:      "cancelled",
    OrderStatusEnum.disputed:       "disputed",
}


def map_order_status_to_db(frontend_status: str) -> Optional[OrderStatusEnum]:
    """Translate a frontend order status string to the DB enum value."""
    return FRONTEND_TO_DB_ORDER_STATUS.get(frontend_status.lower())


def map_order_status_to_frontend(db_status: OrderStatusEnum) -> str:
    """Translate DB enum back to the frontend-friendly status string."""
    return DB_TO_FRONTEND_ORDER_STATUS.get(db_status, db_status.value)


# ---------------------------------------------------------------------------
# 3.  RFQ Status  (Frontend → DB)
# ---------------------------------------------------------------------------
FRONTEND_TO_DB_RFQ_STATUS: dict[str, RfqStatusEnum] = {
    "open":      RfqStatusEnum.active,
    "submitted": RfqStatusEnum.active,   # vendor responded, RFQ still active
    "closed":    RfqStatusEnum.closed,
    "cancelled": RfqStatusEnum.cancelled,
    # Pass-through
    "draft":     RfqStatusEnum.draft,
    "active":    RfqStatusEnum.active,
    "extended":  RfqStatusEnum.extended,
}

DB_TO_FRONTEND_RFQ_STATUS: dict[RfqStatusEnum, str] = {
    RfqStatusEnum.draft:     "draft",
    RfqStatusEnum.active:    "open",
    RfqStatusEnum.extended:  "extended",
    RfqStatusEnum.closed:    "closed",
    RfqStatusEnum.cancelled: "cancelled",
}


def map_rfq_status_to_db(frontend_status: str) -> Optional[RfqStatusEnum]:
    return FRONTEND_TO_DB_RFQ_STATUS.get(frontend_status.lower())


def map_rfq_status_to_frontend(db_status: RfqStatusEnum) -> str:
    return DB_TO_FRONTEND_RFQ_STATUS.get(db_status, db_status.value)


# ---------------------------------------------------------------------------
# 4.  Application / Verification Status  (Frontend → DB)
# ---------------------------------------------------------------------------
FRONTEND_TO_DB_VERIFY_STATUS: dict[str, VerifyStatusEnum] = {
    "pending":   VerifyStatusEnum.pending,
    "approved":  VerifyStatusEnum.verified,
    "verified":  VerifyStatusEnum.verified,
    "rejected":  VerifyStatusEnum.rejected,
    "resubmit":  VerifyStatusEnum.pending,   # resubmit resets to pending
    "expired":   VerifyStatusEnum.expired,
}

DB_TO_FRONTEND_VERIFY_STATUS: dict[VerifyStatusEnum, str] = {
    VerifyStatusEnum.pending:  "pending",
    VerifyStatusEnum.verified: "approved",
    VerifyStatusEnum.rejected: "rejected",
    VerifyStatusEnum.expired:  "expired",
}


def map_verify_status_to_db(frontend_status: str) -> Optional[VerifyStatusEnum]:
    return FRONTEND_TO_DB_VERIFY_STATUS.get(frontend_status.lower())


def map_verify_status_to_frontend(db_status: VerifyStatusEnum) -> str:
    return DB_TO_FRONTEND_VERIFY_STATUS.get(db_status, db_status.value)


# ---------------------------------------------------------------------------
# 5.  Display helpers (DB value → human-readable label)
# ---------------------------------------------------------------------------
def humanize(snake_str: str) -> str:
    """Convert 'ready_to_ship' → 'Ready to Ship' for UI display."""
    return snake_str.replace("_", " ").title()

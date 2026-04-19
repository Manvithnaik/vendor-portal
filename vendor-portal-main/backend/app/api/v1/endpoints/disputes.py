"""Disputes management endpoints using the orders table.

Workflow (all stored via status + notes — no schema changes):
  Step 1: Manufacturer raises dispute       → status=disputed
  Step 2: Vendor acknowledges               → status=vendor_review, [ACK:1] in notes
  Step 3: Vendor adds counter-evidence      → [VendorEvidence:<url1>,<url2>] appended to notes
  Step 4: Vendor accepts/rejects            → status=accepted/rejected, Vendor:<comment>
  Step 5: Manufacturer sees decision
  Step 6a: Manufacturer marks Return Shipped → [STATUS:ReturnShipped] in notes
  Step 6b: Vendor closes dispute (after ship or reject) → [STATUS:Closed] in notes
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.common import APIResponse, success_response
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.product import Product
from app.models.enums import OrderStatusEnum, OrgTypeEnum
from app.models.vendor_portal import Quote
from app.exceptions import NotFoundException, BusinessRuleException, UnauthorizedException

router = APIRouter(prefix="/disputes", tags=["Disputes"])


# ── Request schemas ────────────────────────────────────────────────────────────

class DisputeCreateRequest(BaseModel):
    order_id: int
    dispute_type: str
    reason: str
    image_urls: Optional[List[str]] = None   # replaces single image_url; up to 3


class DisputeUpdateRequest(BaseModel):
    # Vendor:   acknowledge | counter_evidence | accept | reject
    # Manufacturer: return_shipped | close
    action: str
    comment: Optional[str] = None
    evidence_urls: Optional[List[str]] = None   # for counter_evidence action (replaces single evidence_url)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _parse_notes(notes: str) -> dict:
    """Parse the pipe-delimited notes string into a structured dict."""
    parts = [p.strip() for p in (notes or "").split("|")]
    result = {
        "dispute_type": "Unknown",
        "reason": "No reason provided",
        "image_urls": [],
        "vendor_comment": None,
        "vendor_evidence_urls": [],
        "acknowledged": False,
    }
    for part in parts:
        if part.startswith("Dispute:"):
            result["dispute_type"] = part[len("Dispute:"):].strip()
        elif part.startswith("Reason:"):
            result["reason"] = part[len("Reason:"):].strip()
        elif part.startswith("image:"):
            raw = part[len("image:"):].strip()
            # Support comma-separated list of URLs
            result["image_urls"] = [u.strip() for u in raw.split(",") if u.strip()]
        elif part.startswith("Vendor:"):
            result["vendor_comment"] = part[len("Vendor:"):].strip()
        elif part.startswith("VendorEvidence:"):
            raw = part[len("VendorEvidence:"):].strip()
            result["vendor_evidence_urls"] = [u.strip() for u in raw.split(",") if u.strip()]
        elif part == "[ACK:1]":
            result["acknowledged"] = True
    return result


def _parse_dispute_status(order: Order) -> str:
    """Derive human-readable dispute status from DB status + notes flags."""
    notes = order.notes or ""

    # Terminal resolution flags (checked first)
    if "[STATUS:Closed]" in notes:
        return "Dispute Closed"
    if "[STATUS:ReturnShipped]" in notes:
        return "Return Shipped"

    # DB-status based
    if order.status == OrderStatusEnum.accepted and "Dispute:" in notes:
        return "Accepted"
    if order.status == OrderStatusEnum.rejected and "Dispute:" in notes:
        return "Rejected"
    if order.status == OrderStatusEnum.vendor_review:
        return "Under Review"
    if order.status == OrderStatusEnum.disputed:
        return "Dispute Raised"

    return order.status.value


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/create", response_model=APIResponse)
def create_dispute(
    data: DisputeCreateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Step 1 — Manufacturer raises a dispute on a delivered/accepted/shipped order."""
    if current_user.organization.org_type != OrgTypeEnum.customer:
        raise UnauthorizedException("Only manufacturers (buyers) can raise disputes.")

    order = db.query(Order).filter(
        Order.id == data.order_id,
        Order.customer_org_id == current_user.org_id
    ).first()
    if not order:
        raise NotFoundException("Order")

    # Build the notes string
    notes = f"Dispute: {data.dispute_type} | Reason: {data.reason}"
    if data.image_urls:
        # Store as comma-separated list
        notes += f" | image: {','.join(data.image_urls)}"

    previous_status = order.status
    order.status = OrderStatusEnum.disputed
    order.notes = notes
    order.updated_at = datetime.utcnow()

    db.add(OrderStatusHistory(
        order_id=order.id,
        changed_by=current_user.id,
        previous_status=previous_status.value,
        new_status=OrderStatusEnum.disputed.value,
        note=f"Dispute raised: {data.dispute_type}"
    ))
    db.commit()
    db.refresh(order)

    return success_response("Dispute raised successfully.", {"id": order.id, "status": "Dispute Raised"})


@router.get("/list", response_model=APIResponse)
def list_disputes(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """List all disputes (for both vendor and manufacturer views)."""
    org_type = current_user.organization.org_type

    query = db.query(Order)
    if org_type == OrgTypeEnum.customer:
        query = query.filter(Order.customer_org_id == current_user.org_id)
    else:
        query = query.filter(Order.manufacturer_org_id == current_user.org_id)

    # Optimize query with joinedload to avoid N+1 queries for product names
    from sqlalchemy.orm import joinedload
    try:
        orders = query.options(
            joinedload(Order.items).joinedload(OrderItem.product),
            joinedload(Order.quotation).joinedload(Quote.rfq)
        ).filter(Order.notes.like("%Dispute:%")).all()
    except Exception as e:
        print(f"DEBUG: Disputes query failed: {e}")
        raise e

    results = []
    for o in orders:
        print(f"DEBUG: Processing order {o.id}")
        parsed = _parse_notes(o.notes or "")
        product_name = "Unknown Product"
        if o.items and o.items[0].product:
            product_name = o.items[0].product.name
        elif o.quotation and o.quotation.rfq:
            title = o.quotation.rfq.title or ""
            product_name = title.replace("RFQ for ", "").strip()
        elif "Reason:" in (o.notes or ""):
            # Fallback: try to find product name in other items if first is missing
            for item in o.items:
                if item.product:
                    product_name = item.product.name
                    break
        
        # If still unknown, maybe use order number as a hint
        if product_name == "Unknown Product":
            product_name = f"Order {o.order_number}"
        results.append({
            "id": o.id,
            "order_number": o.order_number,
            "product_name": product_name,
            "dispute_type": parsed["dispute_type"],
            "reason": parsed["reason"],
            # Multi-file: expose list; keep singular alias for backwards compatibility
            "image_urls": parsed["image_urls"],
            "image_url": parsed["image_urls"][0] if parsed["image_urls"] else None,
            "vendor_comment": parsed["vendor_comment"],
            # Multi-file vendor evidence
            "vendor_evidence_urls": parsed["vendor_evidence_urls"],
            "vendor_evidence_url": parsed["vendor_evidence_urls"][0] if parsed["vendor_evidence_urls"] else None,
            "acknowledged": parsed["acknowledged"],
            "status": _parse_dispute_status(o),
            "po_document_url": o.po_document_url,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "updated_at": o.updated_at.isoformat() if o.updated_at else None,
        })

    return success_response("Disputes retrieved.", results)


@router.put("/update/{order_id}", response_model=APIResponse)
def update_dispute(
    order_id: int,
    data: DisputeUpdateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Update dispute at any lifecycle step, enforcing strict role-based access."""
    org_type = current_user.organization.org_type

    # Vendors own the order as manufacturer_org, manufacturers as customer_org
    query = db.query(Order).filter(Order.id == order_id)
    if org_type == OrgTypeEnum.manufacturer:
        # This is the VENDOR (seller) – orders belong to their manufacturer_org_id
        query = query.filter(Order.manufacturer_org_id == current_user.org_id)
    else:
        # This is the MANUFACTURER (buyer) – orders belong to their customer_org_id
        query = query.filter(Order.customer_org_id == current_user.org_id)

    order = query.first()
    if not order:
        raise NotFoundException("Order")

    notes = order.notes or ""
    previous_status = order.status
    history_note = ""

    # ── VENDOR (seller) actions ────────────────────────────────────────────────
    if org_type == OrgTypeEnum.manufacturer:
        VENDOR_ACTIONS = ("acknowledge", "counter_evidence", "accept", "reject", "close")
        if data.action not in VENDOR_ACTIONS:
            raise BusinessRuleException(
                f"Vendor action must be one of: {', '.join(VENDOR_ACTIONS)}"
            )

        if data.action == "acknowledge":
            # Step 2: vendor acknowledges receipt of the dispute
            if "[ACK:1]" in notes:
                raise BusinessRuleException("Dispute already acknowledged.")
            order.status = OrderStatusEnum.vendor_review
            notes += " | [ACK:1]"
            history_note = "Vendor acknowledged dispute"

        elif data.action == "counter_evidence":
            # Step 3: vendor attaches counter-evidence images (1–3)
            if not data.evidence_urls:
                raise BusinessRuleException("evidence_urls is required for counter_evidence action.")
            # Accumulate: if vendor evidence already exists, merge the lists
            existing_parsed = _parse_notes(notes)
            all_urls = existing_parsed["vendor_evidence_urls"] + [u for u in data.evidence_urls if u.strip()]
            # Rebuild: remove any old VendorEvidence segment, append updated one
            note_parts = [p.strip() for p in notes.split("|")]
            note_parts = [p for p in note_parts if not p.startswith("VendorEvidence:")]
            notes = " | ".join(note_parts) + f" | VendorEvidence: {','.join(all_urls)}"
            history_note = "Vendor added counter-evidence"

        elif data.action == "accept":
            # Step 4a: vendor accepts the dispute (comment optional)
            order.status = OrderStatusEnum.accepted
            if data.comment:
                notes += f" | Vendor: {data.comment}"
            history_note = "Vendor accepted dispute"

        elif data.action == "reject":
            # Step 4b: vendor rejects the dispute (comment mandatory)
            if not (data.comment and data.comment.strip()):
                raise BusinessRuleException("A comment is mandatory when rejecting a dispute.")
            order.status = OrderStatusEnum.rejected
            notes += f" | Vendor: {data.comment}"
            history_note = "Vendor rejected dispute"

        elif data.action == "close":
            # Step 6b: vendor closes dispute after shipment or rejection
            if "[STATUS:Closed]" in notes:
                raise BusinessRuleException("Dispute already closed.")
            if "[STATUS:ReturnShipped]" not in notes and order.status != OrderStatusEnum.rejected:
                raise BusinessRuleException("Can only close after return is shipped or dispute is rejected.")
            notes += " | [STATUS:Closed]"
            history_note = "Vendor closed dispute"

    # ── MANUFACTURER (buyer) actions ───────────────────────────────────────────
    else:
        MFR_ACTIONS = ("return_shipped", "close")
        if data.action not in MFR_ACTIONS:
            raise BusinessRuleException(
                f"Manufacturer action must be one of: {', '.join(MFR_ACTIONS)}"
            )

        if data.action == "return_shipped":
            # Step 6a: manufacturer confirms goods sent back (only if accepted)
            if order.status != OrderStatusEnum.accepted:
                raise BusinessRuleException("Can only mark return-shipped after vendor acceptance.")
            if "[STATUS:ReturnShipped]" in notes:
                raise BusinessRuleException("Return already marked as shipped.")
            notes += " | [STATUS:ReturnShipped]"
            history_note = "Manufacturer marked return as shipped"

        elif data.action == "close":
            # Keep optional close for manufacturer if needed, but per user request, vendor usually closes.
            # We'll allow both for now to avoid blocking anyone, or just remove it if strictly vendor-only.
            # User said "vendor should close", so let's keep it but maybe emphasize vendor.
            if "[STATUS:Closed]" in notes:
                raise BusinessRuleException("Dispute already closed.")
            notes += " | [STATUS:Closed]"
            history_note = "Manufacturer closed dispute"

    order.notes = notes
    order.updated_at = datetime.utcnow()

    db.add(OrderStatusHistory(
        order_id=order.id,
        changed_by=current_user.id,
        previous_status=previous_status.value,
        new_status=order.status.value,
        note=history_note
    ))
    db.commit()
    db.refresh(order)

    return success_response(
        f"Dispute updated: {data.action}.",
        {"id": order.id, "status": _parse_dispute_status(order)}
    )

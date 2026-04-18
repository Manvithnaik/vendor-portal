# Import all models so SQLAlchemy registers them with Base.metadata
# and Alembic can discover them for migrations.

from app.models.enums import *  # noqa: F401,F403

from app.models.organization import (  # noqa: F401
    Organization, Role,
    BusinessVerificationCertificate, ManufacturerFinancialDetails,
)
from app.models.user import User, UserSession, PasswordResetToken  # noqa: F401
from app.models.contract import Contract  # noqa: F401
from app.models.product import (  # noqa: F401
    ProductCategory, Product, ProductTag, ProductTagMap,
    ContractProductPricing, SupplyChainLogistics,
)
from app.models.order import Order, OrderItem, OrderStatusHistory  # noqa: F401
from app.models.financial import PaymentProfile, Invoice, Payment  # noqa: F401
from app.models.shipment import Shipment, ShipmentEvent, DeliveryConfirmation  # noqa: F401
from app.models.support import SupportTicket, TicketMessage, TicketStatusHistory  # noqa: F401
from app.models.dashboard import DashboardSnapshot  # noqa: F401
from app.models.vendor_portal import (  # noqa: F401
    Admin, AuditLog, Document, VendorBankAccount, Inventory,
    RFQ, RFQBroadcast, Quote, PONegotiation, VendorPayout,
    Dispute, Refund,
    CRMInteraction, CRMTask, CRMNote,
)
from app.models.rating import Rating  # noqa: F401

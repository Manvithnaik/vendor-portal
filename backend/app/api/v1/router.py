from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, organizations, products, contracts, orders, shipments, financial, support, vendor_portal
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(organizations.router)
api_router.include_router(products.router)
api_router.include_router(contracts.router)
api_router.include_router(orders.router)
api_router.include_router(shipments.router)
api_router.include_router(financial.router)
api_router.include_router(support.router)
api_router.include_router(vendor_portal.router)

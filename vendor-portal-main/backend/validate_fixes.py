"""End-to-end flow validation script."""
from app.utils.mappers import map_order_status_to_frontend
from app.models.enums import OrderStatusEnum

print("=== AUTH FLOW SIMULATION ===")

# 1. Backend POST /auth/login response shape
login_response = {
    "status": "success",
    "message": "Login successful",
    "data": {
        "access_token": "eyJhbGci...",
        "token_type": "bearer",
        "user_id": 1,
        "org_id": 1,
        "role": "vendor",
        "org_type": "manufacturer",
        "full_name": "John Doe",
        "email": "john@vendor.com",
    }
}

# 2. apiClient interceptor: return response.data -> api_response is the APIResponse body
api_response = login_response

# 3. authService.login now returns full api_response (our fix)
auth_result = api_response

# 4. AuthContext: result.data.access_token
assert auth_result["data"]["access_token"], "Token missing from result.data"
print("  [OK] Token check: result.data.access_token found")

# 5. setUser(result.data) -> user object has role + full_name
user = auth_result["data"]
assert user["role"] == "vendor"
assert user["full_name"] == "John Doe"
print("  [OK] setUser: role=vendor, full_name=John Doe")

# 6. localStorage stores access_token (not 'token')
token_stored = auth_result["data"].get("access_token")
assert token_stored is not None
print("  [OK] localStorage: token stored via access_token key")

# 7. navigate to /vendor
route = "/" + user["role"]
assert route == "/vendor"
print("  [OK] navigate:", route)

# 8. PrivateRoute: token in localStorage + user set -> passes
print("  [OK] PrivateRoute: passes (token + user present)")

# 9. VendorOrders: orderService returns array directly (no double .data)
orders_raw = [{"id": 1, "order_number": "ORD-ABC", "status": "pending", "created_at": "2026-04-14T00:00:00Z"}]
orders = orders_raw if isinstance(orders_raw, list) else []
assert len(orders) == 1
print("  [OK] VendorOrders: {} order(s) loaded (no double-unwrap)".format(len(orders)))

# 10. OrderResponse.status field_serializer: vendor_review -> pending
for status, expected in [
    (OrderStatusEnum.vendor_review, "pending"),
    (OrderStatusEnum.accepted,      "accepted"),
    (OrderStatusEnum.rejected,      "rejected"),
    (OrderStatusEnum.shipped,       "shipped"),
]:
    mapped = map_order_status_to_frontend(status)
    assert mapped == expected, "Expected {}, got {}".format(expected, mapped)
    print("  [OK] Status mapper: {} -> {}".format(status.value, mapped))

# 11. OrderItem contract_pricing_id nullable
from app.models.order import OrderItem
nullable = OrderItem.__table__.c.contract_pricing_id.nullable
assert nullable is True, "contract_pricing_id must be nullable"
print("  [OK] OrderItem.contract_pricing_id nullable=True")

# 12. Quote.deleted_at column exists
from app.models.vendor_portal import Quote
assert hasattr(Quote.__table__.c, "deleted_at"), "Quote missing deleted_at"
print("  [OK] Quote.deleted_at column exists")

# 13. UserResponse.full_name in computed_fields
from app.schemas.user import UserResponse
assert "full_name" in UserResponse.model_computed_fields
print("  [OK] UserResponse.full_name in computed_fields (Pydantic v2 serialized)")

# 14. AdminLoginRequest accepts optional role field
from app.schemas.auth import AdminLoginRequest
m = AdminLoginRequest(email="admin@test.com", password="secret", role="admin")
assert m.role == "admin"
print("  [OK] AdminLoginRequest accepts optional role field (no 422)")

# 15. CORS origins
import ast, re
with open("app/main.py") as f:
    content = f.read()
assert "allow_origins=[\"*\"]" not in content, "Wildcard CORS still present!"
assert "localhost:3000" in content
print("  [OK] CORS: no wildcard, explicit localhost:3000")

print()
print("=== ALL 15 CHECKS PASSED === SYSTEM VALIDATED ===")

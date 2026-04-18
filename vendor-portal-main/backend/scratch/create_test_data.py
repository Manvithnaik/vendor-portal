from app.core.database import SessionLocal
from app.models.user import User
from app.models.organization import Organization
from app.models.order import Order
from app.models.product import Product
from app.models.enums import OrderStatusEnum
from datetime import datetime

def create_test_data():
    db = SessionLocal()
    try:
        # Find Manufacturer (manu@gmail.com)
        m_user = db.query(User).filter(User.email == "manu@gmail.com").first()
        if not m_user:
            print("Manufacturer user not found")
            return

        # Find Vendor (a@gmail.com)
        v_user = db.query(User).filter(User.email == "a@gmail.com").first()
        if not v_user:
            print("Vendor user not found")
            return

        # Find or create a Product
        product = db.query(Product).filter(Product.manufacturer_org_id == v_user.org_id).first()
        if not product:
            product = Product(
                name="Industrial Bolt XL",
                description="Heavy duty bolt",
                price=50.0,
                manufacturer_org_id=v_user.org_id,
                category_id=1, # Assume category 1 exists
                sku="BOLT-XL-001"
            )
            db.add(product)
            db.commit()
            db.refresh(product)

        # Create a SHIPPED Order
        order = Order(
            order_number=f"ORD-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            customer_org_id=m_user.org_id,
            manufacturer_org_id=v_user.org_id, # In DB schema manufacturer_org_id is the seller
            product_id=product.id,
            quantity=100,
            unit_price=50.0,
            status=OrderStatusEnum.shipped,
            delivery_address="123 Manufacturer Lane, Factory City",
            po_document_url="http://example.com/po.pdf",
            created_at=datetime.utcnow()
        )
        db.add(order)
        db.commit()
        db.refresh(order)
        print(f"Created shipped order {order.order_number} for {m_user.email} (Vendor: {v_user.email})")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_data()


from app.core.database import SessionLocal
from app.models.organization import Organization, BusinessVerificationCertificate, ManufacturerFinancialDetails

db = SessionLocal()
try:
    org = db.query(Organization).order_by(Organization.id.desc()).first()
    if org:
        print(f"Latest Org: ID={org.id}, Name={org.name}, About={org.about}")
        
        fin = db.query(ManufacturerFinancialDetails).filter_by(org_id=org.id).first()
        if fin:
            print(f"Financial Details: TaxID={fin.tax_id_encrypted}")
        else:
            print("No Financial Details found.")
            
        cert = db.query(BusinessVerificationCertificate).filter_by(org_id=org.id).first()
        if cert:
            print(f"Certificate: Number={cert.certificate_number}")
        else:
            print("No Certificate found.")
    else:
        print("No Organizations found.")
finally:
    db.close()

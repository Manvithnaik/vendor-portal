from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.models.sequence import SequenceTracker
from app.models.enums import OrgTypeEnum


class IdGeneratorService:
    @staticmethod
    def generate_sequence_code(db: Session, entity_type: str) -> str:
        """
        Generates a unique ID code with year and running sequence based on entity_type.
        entity_type can be: "vendor", "manufacturer", "customer", "admin"
        
        Formats:
        - vendor -> VYYYYNN
        - manufacturer -> MYYYYNN
        - customer -> CYYYYNN
        - admin -> AYYYYNN
        """
        prefix_mapping = {
            "vendor": "V",
            "manufacturer": "M",
            "customer": "C",
            "admin": "A",
        }
        
        prefix = prefix_mapping.get(entity_type.lower())
        if not prefix:
            raise ValueError(f"Unknown entity type for ID generation: {entity_type}")

        current_year = datetime.utcnow().year

        # Explicitly lock the sequence row to avoid race conditions
        seq = db.query(SequenceTracker).with_for_update().filter(
            and_(
                SequenceTracker.role_prefix == prefix,
                SequenceTracker.year == current_year
            )
        ).first()

        if not seq:
            # First of the year
            seq = SequenceTracker(role_prefix=prefix, year=current_year, last_value=0)
            db.add(seq)
            # flush to get it into the transaction context (so subsequent updates lock it if needed)
            db.flush()

        seq.last_value += 1
        db.flush()

        # Format: Prefix + Year + 2-digit zero-padded number (e.g., V202601)
        sequence_number_str = str(seq.last_value).zfill(2)
        return f"{prefix}{current_year}{sequence_number_str}"

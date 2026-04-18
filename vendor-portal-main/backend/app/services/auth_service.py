"""
Authentication service — handles registration and login for both
portal users (users table) and platform admins (admins table).
"""
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password, create_access_token
from app.models.organization import Organization, Role
from app.models.user import User, PasswordResetToken
from app.models.vendor_portal import Admin
from app.models.enums import OrgTypeEnum, RoleOrgTypeEnum, VerifyStatusEnum
from app.repositories.user_repo import UserRepository, AdminRepository
from app.repositories.organization_repo import OrganizationRepository
from app.schemas.auth import RegisterRequest, LoginRequest, AdminLoginRequest, PasswordChangeRequest
from app.utils.mappers import map_role_to_org_type, map_org_type_to_role
from app.exceptions import (
    ConflictException, UnauthorizedException, NotFoundException,
    ValidationException, DatabaseException, BusinessRuleException,
)
import secrets
from datetime import timedelta
from app.services.email_service import send_password_reset_email
from app.models.enums import OrgTypeEnum, RoleOrgTypeEnum, VerifyStatusEnum, ResetMethodEnum


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.admin_repo = AdminRepository(db)
        self.org_repo = OrganizationRepository(db)

    # ------------------------------------------------------------------
    # Registration
    # ------------------------------------------------------------------
    def register(self, data: RegisterRequest) -> dict:
        """
        Creates an Organization and a first User in a single transaction.
        Maps frontend role ('vendor'/'manufacturer') to the correct org_type.
        """
        org_type = map_role_to_org_type(data.role)
        if org_type is None:
            raise ValidationException(
                "Admins cannot self-register. Use the admin creation endpoint."
            )

        # Conflict: email already registered as an org
        existing_org = self.org_repo.get_by_email(data.email)
        if existing_org:
            if existing_org.verification_status == VerifyStatusEnum.rejected:
                return self._handle_resubmission(existing_org, data, org_type)
            else:
                raise ConflictException(
                    f"An organization with email '{data.email}' already exists."
                )

        # Conflict: email already registered as a user
        if self.user_repo.get_by_email(data.email):
            raise ConflictException(
                f"A user with email '{data.email}' already exists."
            )

        try:
            from app.services.id_generator import IdGeneratorService
            org_code = IdGeneratorService.generate_sequence_code(self.db, data.role)

            # 1. Create Organization
            org = Organization(
                org_code=org_code,
                name=data.org_name,
                org_type=org_type,
                email=data.email,
                phone=data.phone,
                address_line1=data.address_line1,
                city=data.city,
                state=data.state,
                country=data.country,
                postal_code=data.postal_code,
                website=data.website,
                business_doc=data.business_doc,
                business_doc_data=data.business_doc_data,
                verification_status=VerifyStatusEnum.pending,
                is_active=True,
            )
            self.db.add(org)
            self.db.flush()  # get org.id before committing

            # 2. Resolve or create a default role for this org_type
            role_org_type = (
                RoleOrgTypeEnum.manufacturer
                if org_type == OrgTypeEnum.manufacturer
                else RoleOrgTypeEnum.customer
            )
            role = (
                self.db.query(Role)
                .filter(Role.name == "default", Role.org_type == role_org_type)
                .first()
            )
            if not role:
                role = Role(name="default", org_type=role_org_type)
                self.db.add(role)
                self.db.flush()

            # 3. Create User
            user = User(
                org_id=org.id,
                role_id=role.id,
                first_name=data.first_name,
                last_name=data.last_name,
                email=data.email,
                phone=data.user_phone,
                password_hash=hash_password(data.password),
                is_active=True,
            )
            self.db.add(user)
            self.db.commit()
            self.db.refresh(org)
            self.db.refresh(user)
        except Exception as exc:
            self.db.rollback()
            raise DatabaseException(details={"error": str(exc)})

        return {
            "org_id": org.id,
            "user_id": user.id,
            "email": user.email,
            "org_name": org.name,
            "role": data.role,
            "verification_status": org.verification_status.value,
            "message": (
                "Registration successful. Your account is pending admin approval."
            ),
        }

    def _handle_resubmission(self, org: Organization, data: RegisterRequest, org_type: OrgTypeEnum) -> dict:
        """
        Handles resubmitting a rejected application.
        Updates the organization and user details, and sets status back to pending.
        """
        try:
            # Update Organization
            org.name = data.org_name
            org.org_type = org_type
            org.phone = data.phone
            org.address_line1 = data.address_line1
            org.city = data.city
            org.state = data.state
            org.country = data.country
            org.postal_code = data.postal_code
            org.website = data.website
            org.verification_status = VerifyStatusEnum.pending
            org.updated_at = datetime.utcnow()

            # Find and update User
            user = self.user_repo.get_by_email(data.email)
            if not user:
                # Should not happen ideally, but if missing, raise error
                raise DatabaseException(details={"error": "Associated user record missing for this organization."})
            
            user.first_name = data.first_name
            user.last_name = data.last_name
            user.phone = data.user_phone
            user.password_hash = hash_password(data.password)
            user.updated_at = datetime.utcnow()

            self.db.commit()
            self.db.refresh(org)
            self.db.refresh(user)
        except Exception as exc:
            self.db.rollback()
            raise DatabaseException(details={"error": str(exc)})

        return {
            "org_id": org.id,
            "user_id": user.id,
            "email": user.email,
            "org_name": org.name,
            "role": data.role,
            "verification_status": org.verification_status.value,
            "message": (
                "Registration resubmitted successfully. Your account is pending admin approval."
            ),
        }

    # ------------------------------------------------------------------
    # Login — Portal Users
    # ------------------------------------------------------------------
    def login(self, data: LoginRequest) -> dict:
        # First check if the user is an admin
        admin = self.admin_repo.get_by_email(data.email)
        if admin:
            if not verify_password(data.password, admin.password_hash):
                raise UnauthorizedException("Invalid email or password.")

            if not admin.is_active or admin.status != "active":
                raise UnauthorizedException("Admin account is inactive or suspended.")

            admin.last_login_at = datetime.utcnow()
            self.db.commit()

            token = create_access_token(
                subject=admin.id,
                extra_claims={"role": admin.role, "type": "admin"},
            )

            return {
                "access_token": token,
                "token_type": "bearer",
                "admin_id": admin.id,
                "user_id": admin.id,
                "role": "admin",
                "name": admin.name,
                "full_name": admin.name,
                "email": admin.email,
            }

        # Otherwise, handle as portal user
        user = self.user_repo.get_by_email(data.email)
        if not user or not verify_password(data.password, user.password_hash):
            raise UnauthorizedException("Invalid email or password.")

        if not user.is_active:
            raise UnauthorizedException("Your account has been deactivated.")

        # Org info is pre-fetched via joinedload in get_by_email
        org = user.organization
        if org and org.verification_status != VerifyStatusEnum.verified:
            if org.verification_status == VerifyStatusEnum.pending:
                raise BusinessRuleException("Your application is not approved yet. Please check your application status.")
            elif org.verification_status == VerifyStatusEnum.rejected:
                raise BusinessRuleException("Your application was rejected. Please resubmit.")
            else:
                raise BusinessRuleException(
                    f"Your organization's application is currently "
                    f"'{org.verification_status.value}'. Only approved accounts can log in."
                )

        # Map org type to frontend role
        role = map_org_type_to_role(org.org_type) if org else "vendor"

        # Update last_login
        user.last_login = datetime.utcnow()
        self.db.commit()

        token = create_access_token(
            subject=user.id,
            extra_claims={
                "org_id": user.org_id,
                "role_id": user.role_id,
                "org_type": org.org_type.value if org else None,
                "type": "user",
            },
        )

        return {
            "access_token": token,
            "token_type": "bearer",
            "user_id": user.id,
            "org_id": user.org_id,
            "role": role,
            "org_type": org.org_type.value if org else None,
            "full_name": f"{user.first_name} {user.last_name}",
            "email": user.email,
        }

    # ------------------------------------------------------------------
    # Login — Platform Admins
    # ------------------------------------------------------------------
    def admin_login(self, data: AdminLoginRequest) -> dict:
        admin = self.admin_repo.get_by_email(data.email)
        if not admin or not verify_password(data.password, admin.password_hash):
            raise UnauthorizedException("Invalid admin credentials.")

        if not admin.is_active or admin.status != "active":
            raise UnauthorizedException("Admin account is inactive or suspended.")

        admin.last_login_at = datetime.utcnow()
        self.db.commit()

        token = create_access_token(
            subject=admin.id,
            extra_claims={"role": admin.role, "type": "admin"},
        )

        return {
            "access_token": token,
            "token_type": "bearer",
            "admin_id": admin.id,
            "role": admin.role,
            "name": admin.name,
            "email": admin.email,
        }

    # ------------------------------------------------------------------
    # Get current user from token subject
    # ------------------------------------------------------------------
    def get_user_by_id(self, user_id: int) -> User:
        user = self.user_repo.get(user_id)
        if not user:
            raise NotFoundException("User")
        return user

    def get_admin_by_id(self, admin_id: int) -> Admin:
        admin = self.admin_repo.get(admin_id)
        if not admin:
            raise NotFoundException("Admin")
        return admin

    # ------------------------------------------------------------------
    # Forgot Password Flow
    # ------------------------------------------------------------------
    def forgot_password(self, email: str) -> None:
        user = self.user_repo.get_by_email(email)
        # Always return 200 effectively by not raising an error if user not found, avoiding enumeration
        if not user:
            return

        # Generate secure random token
        raw_token = secrets.token_urlsafe(32)
        # Hash the token before storing
        hashed_token = hash_password(raw_token)

        reset_entry = PasswordResetToken(
            user_id=user.id,
            token_hash=hashed_token,
            reset_method=ResetMethodEnum.email_link,
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )

        try:
            self.db.add(reset_entry)
            self.db.commit()
            # Send the email with the raw_token
            send_password_reset_email(user.email, raw_token)
        except Exception as exc:
            self.db.rollback()
            raise DatabaseException(details={"error": "Could not create reset token"})

    def validate_reset_token(self, token: str) -> PasswordResetToken:
        """Finds token by validating hashes. Returns token object if valid, else raises Exception."""
        # Find all tokens that are unexpired and unused
        now = datetime.utcnow()
        active_tokens = self.db.query(PasswordResetToken).filter(
            PasswordResetToken.expires_at > now,
            PasswordResetToken.used_at == None
        ).all()

        for t in active_tokens:
            if verify_password(token, t.token_hash):
                return t

        raise ValidationException("Invalid, expired, or already used reset token.")

    def reset_password(self, token: str, new_password: str) -> None:
        reset_entry = self.validate_reset_token(token)
        
        user = reset_entry.user
        if not user:
            raise NotFoundException("User associated with reset token not found in database.")
            
        user.password_hash = hash_password(new_password)
        reset_entry.used_at = datetime.utcnow()
        
        try:
            self.db.commit()
        except Exception as exc:
            self.db.rollback()
            raise DatabaseException(details={"error": "Could not update password"})

    def get_application_status(self, email: str) -> dict:
        """
        Retrieves the application status for a given email.
        """
        org = self.org_repo.get_by_email(email)
        if not org:
            return {"status": "not_found"}
        
        result = {
            "status": org.verification_status.value,
            "role": map_org_type_to_role(org.org_type)
        }
        
        # If rejected, provide some basic pre-fill data for resubmission
        if org.verification_status == VerifyStatusEnum.rejected:
            user = self.user_repo.get_by_email(email)
            result.update({
                "org_name": org.name,
                "phone": org.phone,
                "address_line1": org.address_line1,
                "city": org.city,
                "state": org.state,
                "country": org.country,
                "postal_code": org.postal_code,
                "website": org.website,
                "first_name": user.first_name if user else "",
                "last_name": user.last_name if user else "",
                "user_phone": user.phone if user else ""
            })
            
        return result

    def change_password(self, user_id: int, data: PasswordChangeRequest) -> None:
        """
        Updates the password for a portal user.
        """
        user = self.get_user_by_id(user_id)
        if not verify_password(data.current_password, user.password_hash):
            raise UnauthorizedException("Incorrect current password.")

        try:
            user.password_hash = hash_password(data.new_password)
            user.updated_at = datetime.utcnow()
            self.db.commit()
        except Exception as exc:
            self.db.rollback()
            raise DatabaseException(details={"error": str(exc)})


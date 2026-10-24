from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from backend.app.models.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="viewer", nullable=False, index=True)  # 'admin', 'owner', 'viewer'
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")
    permissions = relationship("DocumentPermission", foreign_keys="[DocumentPermission.user_id]", back_populates="user", cascade="all, delete-orphan")
    granted_permissions = relationship("DocumentPermission", foreign_keys="[DocumentPermission.granted_by_id]", back_populates="granter")
    sessions = relationship("SessionModel", back_populates="user", cascade="all, delete-orphan")
    role_requests = relationship("RoleRequest", foreign_keys="[RoleRequest.user_id]", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="actor")

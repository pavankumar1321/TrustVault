from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict, model_validator

class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    created_at: Optional[datetime] = None
    actor_id: Optional[int] = None
    actor_email: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    outcome: str
    reason: Optional[str] = None
    details: Optional[str] = None
    client_ip: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def populate_aliases(cls, data: Any) -> Any:
        # If object is an ORM model
        if hasattr(data, "timestamp"):
            ts = data.timestamp
            reason_val = getattr(data, "reason", None)
            actor = getattr(data, "actor", None)
            actor_role = getattr(actor, "role", None) if actor else None
            return {
                "id": data.id,
                "timestamp": ts,
                "created_at": ts,
                "actor_id": data.actor_id,
                "actor_email": data.actor_email,
                "actor_role": actor_role,
                "action": data.action,
                "resource_type": data.resource_type,
                "resource_id": data.resource_id,
                "outcome": data.outcome,
                "reason": reason_val,
                "details": reason_val,
                "client_ip": data.client_ip,
                "user_agent": data.user_agent,
                "request_id": data.request_id,
            }
        # If dict
        if isinstance(data, dict):
            if "timestamp" in data and "created_at" not in data:
                data["created_at"] = data["timestamp"]
            if "reason" in data and "details" not in data:
                data["details"] = data["reason"]
        return data

class AuditLogFilter(BaseModel):
    action: Optional[str] = None
    outcome: Optional[str] = None
    actor_email: Optional[str] = None
    resource_type: Optional[str] = None
    page: int = 1
    limit: int = 20

class SecurityStatsResponse(BaseModel):
    total_users: int
    total_documents: int
    total_events: int
    audit_events_24h: Optional[int] = None
    failed_logins: int
    failed_logins_24h: Optional[int] = None
    denied_access_events: int
    denied_access_24h: Optional[int] = None
    pending_role_requests: int

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def populate_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "total_events" in data and "audit_events_24h" not in data:
                data["audit_events_24h"] = data["total_events"]
            if "failed_logins" in data and "failed_logins_24h" not in data:
                data["failed_logins_24h"] = data["failed_logins"]
            if "denied_access_events" in data and "denied_access_24h" not in data:
                data["denied_access_24h"] = data["denied_access_events"]
        return data

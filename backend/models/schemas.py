"""
Pydantic models for request/response validation.
"""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, validator


# ──────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────

class MineStatus(str, Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    REVOKED = "REVOKED"


class BatchStatus(str, Enum):
    EXTRACTED = "EXTRACTED"
    IN_TRANSIT = "IN_TRANSIT"
    PROCESSING = "PROCESSING"
    DELIVERED = "DELIVERED"
    REJECTED = "REJECTED"
    FLAGGED = "FLAGGED"


class ActorRole(str, Enum):
    MINE = "MINE"
    TRANSPORTER = "TRANSPORTER"
    PROCESSOR = "PROCESSOR"
    REFINERY = "REFINERY"
    MANUFACTURER = "MANUFACTURER"


class ShipmentStatus(str, Enum):
    CREATED = "CREATED"
    IN_TRANSIT = "IN_TRANSIT"
    CUSTOMS = "CUSTOMS"
    DELIVERED = "DELIVERED"
    DELAYED = "DELAYED"


class ComplianceStatus(str, Enum):
    PENDING = "PENDING"
    PASSED = "PASSED"
    FAILED = "FAILED"
    UNDER_REVIEW = "UNDER_REVIEW"


# ──────────────────────────────────────────────
# Mine Models
# ──────────────────────────────────────────────

class MineRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    country: str = Field(..., min_length=2, max_length=60)
    coordinates: str = Field(..., description="lat,lng format e.g. -10.5,25.3")
    operator_id: str = Field(..., min_length=2)
    operator_address: str = Field(..., description="Ethereum address of operator")
    certifications: List[str] = Field(default_factory=list)
    metadata_ipfs_hash: Optional[str] = None

    @validator("coordinates")
    def validate_coordinates(cls, v):
        parts = v.split(",")
        if len(parts) != 2:
            raise ValueError("Coordinates must be 'lat,lng'")
        try:
            lat, lng = float(parts[0]), float(parts[1])
            if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
                raise ValueError("Out of range")
        except ValueError:
            raise ValueError("Invalid coordinate values")
        return v

    @validator("operator_address")
    def validate_eth_address(cls, v):
        if not v.startswith("0x") or len(v) != 42:
            raise ValueError("Invalid Ethereum address")
        return v.lower()


class MineResponse(BaseModel):
    mine_id: str
    name: str
    country: str
    coordinates: str
    operator_id: str
    operator_address: str
    certifications: List[str]
    status: MineStatus
    registered_at: datetime
    last_audit_date: Optional[datetime]
    metadata_ipfs_hash: Optional[str]
    tx_hash: Optional[str]

    class Config:
        use_enum_values = True


class MineComplianceUpdateRequest(BaseModel):
    status: MineStatus
    audit_ipfs_hash: Optional[str] = None
    notes: Optional[str] = None


# ──────────────────────────────────────────────
# Batch Models
# ──────────────────────────────────────────────

class BatchCreateRequest(BaseModel):
    mine_id: str
    extraction_date: datetime
    weight_kg: float = Field(..., gt=0, description="Weight in kilograms")
    purity_percent: float = Field(..., ge=0, le=100, description="Purity percentage")
    geolocation: str = Field(..., description="lat,lng")
    photo_ipfs_hash: Optional[str] = None

    @validator("geolocation")
    def validate_geo(cls, v):
        parts = v.split(",")
        if len(parts) != 2:
            raise ValueError("Geolocation must be 'lat,lng'")
        return v


class CustodyRecord(BaseModel):
    actor_id: str
    actor_address: str
    role: ActorRole
    timestamp: datetime
    location: str
    signature: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        use_enum_values = True


class BatchResponse(BaseModel):
    batch_id: str
    mine_id: str
    extraction_date: datetime
    weight_kg: float
    purity_percent: float
    geolocation: str
    photo_ipfs_hash: Optional[str]
    status: BatchStatus
    custody_chain: List[CustodyRecord] = []
    created_at: datetime
    tx_hash: Optional[str]

    class Config:
        use_enum_values = True


class CustodyAddRequest(BaseModel):
    actor_id: str
    role: ActorRole
    location: str
    signature: Optional[str] = None
    notes: Optional[str] = None


class BatchSearchParams(BaseModel):
    mine_id: Optional[str] = None
    status: Optional[BatchStatus] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    min_weight_kg: Optional[float] = None
    max_weight_kg: Optional[float] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


# ──────────────────────────────────────────────
# Shipment Models
# ──────────────────────────────────────────────

class IoTReading(BaseModel):
    timestamp: datetime
    temperature_c: Optional[float] = None
    humidity_percent: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude_m: Optional[float] = None
    shock_g: Optional[float] = None
    device_id: str


class ShipmentCreateRequest(BaseModel):
    batch_id: str
    origin: str
    destination: str
    carrier: str
    carrier_id: str
    estimated_arrival: datetime
    container_id: Optional[str] = None
    notes: Optional[str] = None


class ShipmentResponse(BaseModel):
    shipment_id: str
    batch_id: str
    origin: str
    destination: str
    carrier: str
    carrier_id: str
    status: ShipmentStatus
    estimated_arrival: datetime
    actual_arrival: Optional[datetime]
    iot_readings: List[IoTReading] = []
    container_id: Optional[str]
    created_at: datetime

    class Config:
        use_enum_values = True


# ──────────────────────────────────────────────
# Compliance Models
# ──────────────────────────────────────────────

class ComplianceCheckRequest(BaseModel):
    batch_id: str
    labor_standards: bool
    environmental_safety: bool
    conflict_free: bool
    documentation_valid: bool
    audit_passed: bool
    report_ipfs_hash: Optional[str] = None
    notes: Optional[str] = None


class ComplianceResponse(BaseModel):
    batch_id: str
    labor_standards: bool
    environmental_safety: bool
    conflict_free: bool
    documentation_valid: bool
    audit_passed: bool
    status: ComplianceStatus
    checked_at: datetime
    verifier: str
    report_ipfs_hash: Optional[str]
    tx_hash: Optional[str]

    class Config:
        use_enum_values = True


class ESGCertificateRequest(BaseModel):
    batch_id: str
    recipient_address: str
    metadata_uri: str
    validity_days: int = Field(default=365, ge=1, le=1825)


# ──────────────────────────────────────────────
# Auth Models
# ──────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    password: str = Field(..., min_length=8)
    full_name: str
    role: str = Field(default="viewer")
    organization: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    organization: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        orm_mode = True


# ──────────────────────────────────────────────
# Generic
# ──────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    pages: int


class MessageResponse(BaseModel):
    message: str
    data: Optional[Dict[str, Any]] = None

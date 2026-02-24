from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


# --- Policy ---
class PolicyBase(BaseModel):
    jurisdiction: str
    state_code: Optional[str] = None
    policy_type: str
    title: str
    vehicle_class: Optional[str] = None
    date_enacted: Optional[date] = None
    status: str
    summary: Optional[str] = None
    source_url: Optional[str] = None


class PolicyCreate(PolicyBase):
    pass


class PolicyOut(PolicyBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Deployment ---
class DeploymentBase(BaseModel):
    operator: str
    program_name: Optional[str] = None
    city: str
    state: str
    state_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    vehicle_type: Optional[str] = None
    operational_domain: Optional[str] = None
    status: str
    start_date: Optional[date] = None
    description: Optional[str] = None
    source_url: Optional[str] = None


class DeploymentCreate(DeploymentBase):
    pass


class DeploymentOut(DeploymentBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Funding Program ---
class FundingProgramBase(BaseModel):
    program_name: str
    agency: str
    funding_type: Optional[str] = None
    total_funding: Optional[str] = None
    award_range: Optional[str] = None
    application_deadline: Optional[date] = None
    date_enacted: Optional[date] = None
    date_closed: Optional[date] = None
    eligibility: Optional[str] = None
    description: Optional[str] = None
    av_relevance: Optional[str] = None
    status: str
    source_url: Optional[str] = None


class FundingProgramCreate(FundingProgramBase):
    pass


class FundingProgramOut(FundingProgramBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Safety Incident ---
class SafetyIncidentBase(BaseModel):
    report_id: Optional[str] = None
    date: date
    manufacturer: str
    vehicle_model: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    state_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    incident_type: str
    severity: Optional[str] = None
    ads_engaged: Optional[bool] = None
    description: Optional[str] = None
    source: Optional[str] = None
    source_url: Optional[str] = None


class SafetyIncidentCreate(SafetyIncidentBase):
    pass


class SafetyIncidentOut(SafetyIncidentBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Resource ---
class ResourceBase(BaseModel):
    title: str
    author_org: str
    resource_type: str
    publication_date: Optional[date] = None
    tags: Optional[str] = None
    topic_area: Optional[str] = None
    summary: Optional[str] = None
    url: Optional[str] = None


class ResourceCreate(ResourceBase):
    pass


class ResourceOut(ResourceBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Curbside Regulation ---
class CurbsideRegulationBase(BaseModel):
    city: str
    state: str
    state_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    regulation_type: Optional[str] = None
    description: Optional[str] = None
    applies_to: Optional[str] = None
    date_adopted: Optional[date] = None
    status: str
    source_url: Optional[str] = None


class CurbsideRegulationCreate(CurbsideRegulationBase):
    pass


class CurbsideRegulationOut(CurbsideRegulationBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- News Article ---
class NewsArticleBase(BaseModel):
    headline: str
    source_org: str
    publication_date: date
    summary: Optional[str] = None
    url: Optional[str] = None
    category: Optional[str] = None


class NewsArticleCreate(NewsArticleBase):
    pass


class NewsArticleOut(NewsArticleBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Dashboard Summary ---
class DashboardSummary(BaseModel):
    total_policies: int
    total_deployments: int
    total_funding_programs: int
    total_safety_incidents: int
    total_resources: int
    total_curbside_regulations: int
    total_news_articles: int
    states_with_legislation: int
    total_funding_amount: float
    recent_policies: list[PolicyOut]
    recent_news: list[NewsArticleOut]

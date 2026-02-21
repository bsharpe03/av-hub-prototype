from sqlalchemy import Column, Integer, String, Text, Float, Date, DateTime, Boolean
from sqlalchemy.sql import func
from database import Base


class Policy(Base):
    __tablename__ = "policies"

    id = Column(Integer, primary_key=True, index=True)
    jurisdiction = Column(String(100), nullable=False, index=True)
    state_code = Column(String(2), index=True)
    policy_type = Column(String(50), nullable=False, index=True)  # legislation/regulation/executive_order
    title = Column(String(500), nullable=False)
    vehicle_class = Column(String(200))
    date_enacted = Column(Date)
    status = Column(String(50), index=True)  # enacted/pending/proposed/expired
    summary = Column(Text)
    source_url = Column(String(1000))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Deployment(Base):
    __tablename__ = "deployments"

    id = Column(Integer, primary_key=True, index=True)
    operator = Column(String(200), nullable=False, index=True)
    program_name = Column(String(500))
    city = Column(String(200), nullable=False)
    state = Column(String(100), nullable=False, index=True)
    state_code = Column(String(2))
    latitude = Column(Float)
    longitude = Column(Float)
    vehicle_type = Column(String(100))  # passenger/freight/shuttle/delivery
    operational_domain = Column(String(200))  # urban/suburban/highway/mixed
    status = Column(String(50), index=True)  # active/paused/completed/testing
    start_date = Column(Date)
    description = Column(Text)
    source_url = Column(String(1000))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class FundingProgram(Base):
    __tablename__ = "funding_programs"

    id = Column(Integer, primary_key=True, index=True)
    program_name = Column(String(500), nullable=False)
    agency = Column(String(200), nullable=False, index=True)
    funding_type = Column(String(100))  # grant/loan/tax_credit
    total_funding = Column(String(200))
    award_range = Column(String(200))
    application_deadline = Column(Date)
    eligibility = Column(Text)
    description = Column(Text)
    av_relevance = Column(Text)
    status = Column(String(50), index=True)  # open/closed/upcoming
    source_url = Column(String(1000))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class SafetyIncident(Base):
    __tablename__ = "safety_incidents"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String(100), unique=True)
    date = Column(Date, nullable=False, index=True)
    manufacturer = Column(String(200), nullable=False, index=True)
    vehicle_model = Column(String(200))
    city = Column(String(200))
    state = Column(String(100), index=True)
    state_code = Column(String(2))
    incident_type = Column(String(100))  # crash/near_miss/disengagement/other
    severity = Column(String(50))  # fatal/injury/property_damage/no_injury
    ads_engaged = Column(Boolean)
    description = Column(Text)
    source = Column(String(200))  # NHTSA_SGO/state_report/company_report
    source_url = Column(String(1000))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    author_org = Column(String(300), nullable=False, index=True)
    resource_type = Column(String(100), index=True)  # report/white_paper/policy_analysis/guidance/toolkit
    publication_date = Column(Date)
    tags = Column(String(500))  # comma-separated
    topic_area = Column(String(200), index=True)  # policy/safety/technology/equity/infrastructure
    summary = Column(Text)
    url = Column(String(1000))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class CurbsideRegulation(Base):
    __tablename__ = "curbside_regulations"

    id = Column(Integer, primary_key=True, index=True)
    city = Column(String(200), nullable=False, index=True)
    state = Column(String(100), nullable=False)
    state_code = Column(String(2))
    latitude = Column(Float)
    longitude = Column(Float)
    regulation_type = Column(String(200))  # pickup_dropoff_zone/loading_zone/geofenced_area/pilot_program
    description = Column(Text)
    applies_to = Column(String(200))  # av_only/tnc_and_av/all_vehicles
    date_adopted = Column(Date)
    status = Column(String(50), index=True)  # active/proposed/pilot/expired
    source_url = Column(String(1000))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

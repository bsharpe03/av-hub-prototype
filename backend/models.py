from sqlalchemy import Column, Integer, String, Text, Float, Date, DateTime, Boolean
from sqlalchemy.sql import func
from database import Base


class Policy(Base):
    __tablename__ = "policies"

    id = Column(Integer, primary_key=True, index=True)
    jurisdiction = Column(String(100), nullable=False, index=True)
    state_code = Column(String(2), index=True)
    policy_type = Column(String(50), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    vehicle_class = Column(String(200))
    date_enacted = Column(Date)
    status = Column(String(50), index=True)
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
    vehicle_type = Column(String(100))
    operational_domain = Column(String(200))
    status = Column(String(50), index=True)
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
    funding_type = Column(String(100))
    total_funding = Column(String(200))
    award_range = Column(String(200))
    application_deadline = Column(Date)
    date_enacted = Column(Date)
    date_closed = Column(Date)
    eligibility = Column(Text)
    description = Column(Text)
    av_relevance = Column(Text)
    status = Column(String(50), index=True)
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
    latitude = Column(Float)
    longitude = Column(Float)
    incident_type = Column(String(100))
    severity = Column(String(50))
    ads_engaged = Column(Boolean)
    description = Column(Text)
    source = Column(String(200))
    source_url = Column(String(1000))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    author_org = Column(String(300), nullable=False, index=True)
    resource_type = Column(String(100), index=True)
    publication_date = Column(Date)
    tags = Column(String(500))
    topic_area = Column(String(200), index=True)
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
    regulation_type = Column(String(200))
    description = Column(Text)
    applies_to = Column(String(200))
    date_adopted = Column(Date)
    status = Column(String(50), index=True)
    source_url = Column(String(1000))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id = Column(Integer, primary_key=True, index=True)
    headline = Column(String(500), nullable=False)
    source_org = Column(String(300), nullable=False)
    publication_date = Column(Date, nullable=False, index=True)
    summary = Column(Text)
    url = Column(String(1000))
    category = Column(String(100), index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

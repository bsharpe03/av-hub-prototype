import io
import os
import csv
import re
import pathlib
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, extract

from database import engine, get_db, Base, SessionLocal
from models import (
    Policy,
    Deployment,
    FundingProgram,
    SafetyIncident,
    Resource,
    CurbsideRegulation,
    NewsArticle,
)
from schemas import (
    PolicyCreate,
    PolicyOut,
    DeploymentCreate,
    DeploymentOut,
    FundingProgramCreate,
    FundingProgramOut,
    SafetyIncidentCreate,
    SafetyIncidentOut,
    ResourceCreate,
    ResourceOut,
    CurbsideRegulationCreate,
    CurbsideRegulationOut,
    NewsArticleCreate,
    NewsArticleOut,
    DashboardSummary,
)
from auth import verify_admin
from seed_data import seed_database

app = FastAPI(title="AV Hub API", version="1.0.0")

# ---------------------------------------------------------------------------
# CORS middleware - allow all origins for development
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Startup event - create tables and seed data
# ---------------------------------------------------------------------------
@app.on_event("startup")
def on_startup():
    # Delete old database so the new schema applies cleanly
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "av_hub.db")
    if os.path.exists(db_path):
        os.remove(db_path)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Utility: stream a list of dicts as CSV
# ---------------------------------------------------------------------------
def _rows_to_csv(rows: list[dict], filename: str) -> StreamingResponse:
    if not rows:
        output = io.StringIO()
        output.write("")
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _model_to_dict(obj) -> dict:
    """Convert a SQLAlchemy model instance to a plain dict."""
    d = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name)
        if isinstance(val, (datetime,)):
            val = val.isoformat()
        elif hasattr(val, "isoformat"):
            val = val.isoformat()
        d[col.name] = val
    return d


def _parse_funding_amount(amount_str: str) -> float:
    """Parse a funding amount string like '$100,000,000' into a float."""
    if not amount_str:
        return 0.0
    cleaned = re.sub(r"[^\d.]", "", amount_str)
    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return 0.0


# ===================================================================
#  DASHBOARD
# ===================================================================
@app.get("/api/dashboard", response_model=DashboardSummary)
def get_dashboard(db: Session = Depends(get_db)):
    total_policies = db.query(Policy).count()
    total_deployments = db.query(Deployment).count()
    total_funding_programs = db.query(FundingProgram).count()
    total_safety_incidents = db.query(SafetyIncident).count()
    total_resources = db.query(Resource).count()
    total_curbside_regulations = db.query(CurbsideRegulation).count()
    total_news_articles = db.query(NewsArticle).count()

    states_with_legislation = (
        db.query(Policy.state_code).distinct().count()
    )

    # Calculate total funding amount from all funding programs
    funding_programs = db.query(FundingProgram.total_funding).all()
    total_funding_amount = sum(
        _parse_funding_amount(fp.total_funding)
        for fp in funding_programs
        if fp.total_funding
    )

    recent_policies = (
        db.query(Policy).order_by(Policy.id.desc()).limit(5).all()
    )
    recent_news = (
        db.query(NewsArticle)
        .order_by(NewsArticle.publication_date.desc())
        .limit(6)
        .all()
    )

    return DashboardSummary(
        total_policies=total_policies,
        total_deployments=total_deployments,
        total_funding_programs=total_funding_programs,
        total_safety_incidents=total_safety_incidents,
        total_resources=total_resources,
        total_curbside_regulations=total_curbside_regulations,
        total_news_articles=total_news_articles,
        states_with_legislation=states_with_legislation,
        total_funding_amount=total_funding_amount,
        recent_policies=recent_policies,
        recent_news=recent_news,
    )


# ===================================================================
#  POLICIES
# ===================================================================
def _filter_policies(
    db: Session,
    status: Optional[str] = None,
    jurisdiction: Optional[str] = None,
    state_code: Optional[str] = None,
    search: Optional[str] = None,
):
    q = db.query(Policy)
    if status:
        q = q.filter(Policy.status == status)
    if jurisdiction:
        q = q.filter(Policy.jurisdiction == jurisdiction)
    if state_code:
        q = q.filter(Policy.state_code == state_code)
    if search:
        q = q.filter(
            or_(
                Policy.title.ilike(f"%{search}%"),
                Policy.jurisdiction.ilike(f"%{search}%"),
                Policy.description.ilike(f"%{search}%"),
            )
        )
    return q


@app.get("/api/policies/export/csv")
def export_policies_csv(
    status: Optional[str] = None,
    jurisdiction: Optional[str] = None,
    state_code: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    items = _filter_policies(db, status, jurisdiction, state_code, search).all()
    rows = [_model_to_dict(i) for i in items]
    return _rows_to_csv(rows, "policies.csv")


@app.get("/api/policies/map/states")
def policies_map_states(db: Session = Depends(get_db)):
    results = (
        db.query(
            Policy.state_code,
            func.count(Policy.id).label("count"),
        )
        .group_by(Policy.state_code)
        .all()
    )
    out = []
    for state_code, count in results:
        # Grab the most common status for this state
        top_status_row = (
            db.query(Policy.status)
            .filter(Policy.state_code == state_code)
            .group_by(Policy.status)
            .order_by(func.count(Policy.id).desc())
            .first()
        )
        top_status = top_status_row[0] if top_status_row else None

        # Determine policy_status for map coloring
        if top_status and top_status.lower() in ("enacted", "active", "signed"):
            policy_status = "active"
        elif top_status and top_status.lower() in ("pending", "proposed", "introduced"):
            policy_status = "under_consideration"
        else:
            policy_status = "none"

        out.append(
            {
                "state_code": state_code,
                "count": count,
                "status": top_status,
                "policy_status": policy_status,
            }
        )
    return out


@app.get("/api/policies", response_model=list[PolicyOut])
def list_policies(
    status: Optional[str] = None,
    jurisdiction: Optional[str] = None,
    state_code: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return _filter_policies(db, status, jurisdiction, state_code, search).all()


@app.get("/api/policies/{id}", response_model=PolicyOut)
def get_policy(id: int, db: Session = Depends(get_db)):
    item = db.query(Policy).filter(Policy.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Policy not found")
    return item


@app.post("/api/admin/policies", response_model=PolicyOut)
def create_policy(
    data: PolicyCreate,
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    item = Policy(**data.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.put("/api/admin/policies/{id}", response_model=PolicyOut)
def update_policy(
    id: int,
    data: PolicyCreate,
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    item = db.query(Policy).filter(Policy.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Policy not found")
    for key, value in data.dict().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@app.delete("/api/admin/policies/{id}")
def delete_policy(
    id: int,
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    item = db.query(Policy).filter(Policy.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Policy not found")
    db.delete(item)
    db.commit()
    return {"detail": "Deleted"}


# ===================================================================
#  DEPLOYMENTS
# ===================================================================
def _filter_deployments(
    db: Session,
    status: Optional[str] = None,
    operator: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    search: Optional[str] = None,
):
    q = db.query(Deployment)
    if status:
        q = q.filter(Deployment.status == status)
    if operator:
        q = q.filter(Deployment.operator == operator)
    if city:
        q = q.filter(Deployment.city == city)
    if state:
        q = q.filter(Deployment.state == state)
    if search:
        q = q.filter(
            or_(
                Deployment.operator.ilike(f"%{search}%"),
                Deployment.city.ilike(f"%{search}%"),
                Deployment.state.ilike(f"%{search}%"),
                Deployment.description.ilike(f"%{search}%"),
            )
        )
    return q


@app.get("/api/deployments/export/csv")
def export_deployments_csv(
    status: Optional[str] = None,
    operator: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    items = _filter_deployments(db, status, operator, city, state, search).all()
    rows = [_model_to_dict(i) for i in items]
    return _rows_to_csv(rows, "deployments.csv")


@app.get("/api/deployments/map/locations")
def deployments_map_locations(db: Session = Depends(get_db)):
    items = db.query(Deployment).all()
    return [
        {
            "id": d.id,
            "operator": d.operator,
            "city": d.city,
            "state": d.state,
            "latitude": d.latitude,
            "longitude": d.longitude,
            "status": d.status,
            "vehicle_type": d.vehicle_type,
        }
        for d in items
    ]


@app.get("/api/deployments", response_model=list[DeploymentOut])
def list_deployments(
    status: Optional[str] = None,
    operator: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return _filter_deployments(db, status, operator, city, state, search).all()


@app.get("/api/deployments/{id}", response_model=DeploymentOut)
def get_deployment(id: int, db: Session = Depends(get_db)):
    item = db.query(Deployment).filter(Deployment.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return item


@app.post("/api/admin/deployments", response_model=DeploymentOut)
def create_deployment(
    data: DeploymentCreate,
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    item = Deployment(**data.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.put("/api/admin/deployments/{id}", response_model=DeploymentOut)
def update_deployment(
    id: int,
    data: DeploymentCreate,
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    item = db.query(Deployment).filter(Deployment.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Deployment not found")
    for key, value in data.dict().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@app.delete("/api/admin/deployments/{id}")
def delete_deployment(
    id: int,
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    item = db.query(Deployment).filter(Deployment.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Deployment not found")
    db.delete(item)
    db.commit()
    return {"detail": "Deleted"}


# ===================================================================
#  FUNDING PROGRAMS
# ===================================================================
def _filter_funding(
    db: Session,
    status: Optional[str] = None,
    agency: Optional[str] = None,
    funding_type: Optional[str] = None,
    search: Optional[str] = None,
):
    q = db.query(FundingProgram)
    if status:
        q = q.filter(FundingProgram.status == status)
    if agency:
        q = q.filter(FundingProgram.agency == agency)
    if funding_type:
        q = q.filter(FundingProgram.funding_type == funding_type)
    if search:
        q = q.filter(
            or_(
                FundingProgram.program_name.ilike(f"%{search}%"),
                FundingProgram.agency.ilike(f"%{search}%"),
                FundingProgram.description.ilike(f"%{search}%"),
            )
        )
    return q


@app.get("/api/funding/export/csv")
def export_funding_csv(
    status: Optional[str] = None,
    agency: Optional[str] = None,
    funding_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    items = _filter_funding(db, status, agency, funding_type, search).all()
    rows = [_model_to_dict(i) for i in items]
    return _rows_to_csv(rows, "funding_programs.csv")


@app.get("/api/funding", response_model=list[FundingProgramOut])
def list_funding(
    status: Optional[str] = None,
    agency: Optional[str] = None,
    funding_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return _filter_funding(db, status, agency, funding_type, search).all()


@app.get("/api/funding/{id}", response_model=FundingProgramOut)
def get_funding(id: int, db: Session = Depends(get_db)):
    item = db.query(FundingProgram).filter(FundingProgram.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Funding program not found")
    return item


@app.post("/api/admin/funding", response_model=FundingProgramOut)
def create_funding(
    data: FundingProgramCreate,
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    item = FundingProgram(**data.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.put("/api/admin/funding/{id}", response_model=FundingProgramOut)
def update_funding(
    id: int,
    data: FundingProgramCreate,
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    item = db.query(FundingProgram).filter(FundingProgram.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Funding program not found")
    for key, value in data.dict().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@app.delete("/api/admin/funding/{id}")
def delete_funding(
    id: int,
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    item = db.query(FundingProgram).filter(FundingProgram.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Funding program not found")
    db.delete(item)
    db.commit()
    return {"detail": "Deleted"}


# ===================================================================
#  SAFETY INCIDENTS
# ===================================================================
def _filter_safety(
    db: Session,
    severity: Optional[str] = None,
    manufacturer: Optional[str] = None,
    incident_type: Optional[str] = None,
    state: Optional[str] = None,
    search: Optional[str] = None,
):
    q = db.query(SafetyIncident)
    if severity:
        q = q.filter(SafetyIncident.severity == severity)
    if manufacturer:
        q = q.filter(SafetyIncident.manufacturer == manufacturer)
    if incident_type:
        q = q.filter(SafetyIncident.incident_type == incident_type)
    if state:
        q = q.filter(SafetyIncident.state == state)
    if search:
        q = q.filter(
            or_(
                SafetyIncident.title.ilike(f"%{search}%"),
                SafetyIncident.manufacturer.ilike(f"%{search}%"),
                SafetyIncident.description.ilike(f"%{search}%"),
                SafetyIncident.location.ilike(f"%{search}%"),
            )
        )
    return q


@app.get("/api/safety/export/csv")
def export_safety_csv(
    severity: Optional[str] = None,
    manufacturer: Optional[str] = None,
    incident_type: Optional[str] = None,
    state: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    items = _filter_safety(db, severity, manufacturer, incident_type, state, search).all()
    rows = [_model_to_dict(i) for i in items]
    return _rows_to_csv(rows, "safety_incidents.csv")


@app.get("/api/safety/stats/by-manufacturer")
def safety_stats_by_manufacturer(db: Session = Depends(get_db)):
    results = (
        db.query(
            SafetyIncident.manufacturer,
            func.count(SafetyIncident.id).label("count"),
        )
        .group_by(SafetyIncident.manufacturer)
        .all()
    )
    return [{"manufacturer": r[0], "count": r[1]} for r in results]


@app.get("/api/safety/stats/by-type")
def safety_stats_by_type(db: Session = Depends(get_db)):
    results = (
        db.query(
            SafetyIncident.incident_type,
            func.count(SafetyIncident.id).label("count"),
        )
        .group_by(SafetyIncident.incident_type)
        .all()
    )
    return [{"incident_type": r[0], "count": r[1]} for r in results]


@app.get("/api/safety/stats/by-year")
def safety_stats_by_year(db: Session = Depends(get_db)):
    results = (
        db.query(
            extract("year", SafetyIncident.date).label("year"),
            func.count(SafetyIncident.id).label("count"),
        )
        .group_by("year")
        .order_by("year")
        .all()
    )
    return [{"year": int(r[0]) if r[0] else None, "count": r[1]} for r in results]


@app.get("/api/safety/stats/by-severity")
def safety_stats_by_severity(db: Session = Depends(get_db)):
    results = (
        db.query(
            SafetyIncident.severity,
            func.count(SafetyIncident.id).label("count"),
        )
        .group_by(SafetyIncident.severity)
        .all()
    )
    return [{"severity": r[0], "count": r[1]} for r in results]


@app.get("/api/safety/map/locations")
def safety_map_locations(db: Session = Depends(get_db)):
    items = db.query(SafetyIncident).all()
    return [
        {
            "id": i.id,
            "operator": i.manufacturer,
            "city": i.city,
            "state": i.state,
            "latitude": i.latitude,
            "longitude": i.longitude,
            "incident_type": i.incident_type,
            "date": i.date.isoformat() if i.date else None,
        }
        for i in items
        if i.latitude and i.longitude
    ]


@app.get("/api/safety", response_model=list[SafetyIncidentOut])
def list_safety(
    severity: Optional[str] = None,
    manufacturer: Optional[str] = None,
    incident_type: Optional[str] = None,
    state: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return _filter_safety(db, severity, manufacturer, incident_type, state, search).all()


@app.get("/api/safety/{id}", response_model=SafetyIncidentOut)
def get_safety(id: int, db: Session = Depends(get_db)):
    item = db.query(SafetyIncident).filter(SafetyIncident.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Safety incident not found")
    return item


@app.post("/api/admin/safety", response_model=SafetyIncidentOut)
def create_safety(
    data: SafetyIncidentCreate,
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    item = SafetyIncident(**data.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.put("/api/admin/safety/{id}", response_model=SafetyIncidentOut)
def update_safety(
    id: int,
    data: SafetyIncidentCreate,
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    item = db.query(SafetyIncident).filter(SafetyIncident.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Safety incident not found")
    for key, value in data.dict().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@app.delete("/api/admin/safety/{id}")
def delete_safety(
    id: int,
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    item = db.query(SafetyIncident).filter(SafetyIncident.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Safety incident not found")
    db.delete(item)
    db.commit()
    return {"detail": "Deleted"}


# ===================================================================
#  RESOURCES
# ===================================================================
def _filter_resources(
    db: Session,
    resource_type: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
):
    q = db.query(Resource)
    if resource_type:
        q = q.filter(Resource.resource_type == resource_type)
    if category:
        q = q.filter(Resource.category == category)
    if search:
        q = q.filter(
            or_(
                Resource.title.ilike(f"%{search}%"),
                Resource.description.ilike(f"%{search}%"),
                Resource.source.ilike(f"%{search}%"),
            )
        )
    return q


@app.get("/api/resources/export/csv")
def export_resources_csv(
    resource_type: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    items = _filter_resources(db, resource_type, category, search).all()
    rows = [_model_to_dict(i) for i in items]
    return _rows_to_csv(rows, "resources.csv")


@app.get("/api/resources", response_model=list[ResourceOut])
def list_resources(
    resource_type: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return _filter_resources(db, resource_type, category, search).all()


@app.get("/api/resources/{id}", response_model=ResourceOut)
def get_resource(id: int, db: Session = Depends(get_db)):
    item = db.query(Resource).filter(Resource.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Resource not found")
    return item


@app.post("/api/admin/resources", response_model=ResourceOut)
def create_resource(
    data: ResourceCreate,
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    item = Resource(**data.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.put("/api/admin/resources/{id}", response_model=ResourceOut)
def update_resource(
    id: int,
    data: ResourceCreate,
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    item = db.query(Resource).filter(Resource.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Resource not found")
    for key, value in data.dict().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@app.delete("/api/admin/resources/{id}")
def delete_resource(
    id: int,
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    item = db.query(Resource).filter(Resource.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Resource not found")
    db.delete(item)
    db.commit()
    return {"detail": "Deleted"}


# ===================================================================
#  CURBSIDE REGULATIONS
# ===================================================================
def _filter_curbside(
    db: Session,
    status: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    zone_type: Optional[str] = None,
    search: Optional[str] = None,
):
    q = db.query(CurbsideRegulation)
    if status:
        q = q.filter(CurbsideRegulation.status == status)
    if city:
        q = q.filter(CurbsideRegulation.city == city)
    if state:
        q = q.filter(CurbsideRegulation.state == state)
    if zone_type:
        q = q.filter(CurbsideRegulation.zone_type == zone_type)
    if search:
        q = q.filter(
            or_(
                CurbsideRegulation.title.ilike(f"%{search}%"),
                CurbsideRegulation.city.ilike(f"%{search}%"),
                CurbsideRegulation.state.ilike(f"%{search}%"),
                CurbsideRegulation.description.ilike(f"%{search}%"),
            )
        )
    return q


@app.get("/api/curbside/export/csv")
def export_curbside_csv(
    status: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    zone_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    items = _filter_curbside(db, status, city, state, zone_type, search).all()
    rows = [_model_to_dict(i) for i in items]
    return _rows_to_csv(rows, "curbside_regulations.csv")


@app.get("/api/curbside/map/locations")
def curbside_map_locations(db: Session = Depends(get_db)):
    items = db.query(CurbsideRegulation).all()
    return [
        {
            "id": r.id,
            "city": r.city,
            "state": r.state,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "regulation_type": r.regulation_type,
            "status": r.status,
        }
        for r in items
        if r.latitude and r.longitude
    ]


@app.get("/api/curbside", response_model=list[CurbsideRegulationOut])
def list_curbside(
    status: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    zone_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return _filter_curbside(db, status, city, state, zone_type, search).all()


@app.get("/api/curbside/{id}", response_model=CurbsideRegulationOut)
def get_curbside(id: int, db: Session = Depends(get_db)):
    item = db.query(CurbsideRegulation).filter(CurbsideRegulation.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Curbside regulation not found")
    return item


@app.post("/api/admin/curbside", response_model=CurbsideRegulationOut)
def create_curbside(
    data: CurbsideRegulationCreate,
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    item = CurbsideRegulation(**data.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.put("/api/admin/curbside/{id}", response_model=CurbsideRegulationOut)
def update_curbside(
    id: int,
    data: CurbsideRegulationCreate,
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    item = db.query(CurbsideRegulation).filter(CurbsideRegulation.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Curbside regulation not found")
    for key, value in data.dict().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@app.delete("/api/admin/curbside/{id}")
def delete_curbside(
    id: int,
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    item = db.query(CurbsideRegulation).filter(CurbsideRegulation.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Curbside regulation not found")
    db.delete(item)
    db.commit()
    return {"detail": "Deleted"}


# ===================================================================
#  NEWS ARTICLES
# ===================================================================
def _filter_news(
    db: Session,
    category: Optional[str] = None,
    search: Optional[str] = None,
):
    q = db.query(NewsArticle).order_by(NewsArticle.publication_date.desc())
    if category:
        q = q.filter(NewsArticle.category == category)
    if search:
        q = q.filter(
            or_(
                NewsArticle.headline.ilike(f"%{search}%"),
                NewsArticle.summary.ilike(f"%{search}%"),
            )
        )
    return q


@app.get("/api/news/export/csv")
def export_news_csv(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    items = _filter_news(db, category, search).all()
    rows = [_model_to_dict(i) for i in items]
    return _rows_to_csv(rows, "news_articles.csv")


@app.get("/api/news", response_model=list[NewsArticleOut])
def list_news(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return _filter_news(db, category, search).all()


@app.get("/api/news/{id}", response_model=NewsArticleOut)
def get_news(id: int, db: Session = Depends(get_db)):
    item = db.query(NewsArticle).filter(NewsArticle.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="News article not found")
    return item


@app.post("/api/admin/news", response_model=NewsArticleOut)
def create_news(
    data: NewsArticleCreate,
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    item = NewsArticle(**data.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.put("/api/admin/news/{id}", response_model=NewsArticleOut)
def update_news(
    id: int,
    data: NewsArticleCreate,
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    item = db.query(NewsArticle).filter(NewsArticle.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="News article not found")
    for key, value in data.dict().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@app.delete("/api/admin/news/{id}")
def delete_news(
    id: int,
    db: Session = Depends(get_db),
    _admin=Depends(verify_admin),
):
    item = db.query(NewsArticle).filter(NewsArticle.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="News article not found")
    db.delete(item)
    db.commit()
    return {"detail": "Deleted"}


# ===================================================================
#  STATIC FRONTEND  (must come AFTER all /api routes)
# ===================================================================
_static_dir = pathlib.Path(__file__).resolve().parent / "static"

if _static_dir.is_dir():
    app.mount("/assets", StaticFiles(directory=_static_dir / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the React SPA for any non-API route."""
        file = _static_dir / full_path
        if file.is_file():
            return FileResponse(file)
        return FileResponse(_static_dir / "index.html")


# ===================================================================
#  ENTRY POINT
# ===================================================================
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

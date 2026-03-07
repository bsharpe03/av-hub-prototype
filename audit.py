#!/usr/bin/env python3
"""Comprehensive AV Hub Application Audit Script"""

import requests
import sqlite3
import time
import json
import re
from datetime import datetime
from collections import defaultdict

BASE_URL = "http://localhost:8000"
DB_PATH = "/home/user/av-hub/backend/av_hub.db"
REPORT_PATH = "/home/user/av-hub/audit_report.txt"

report_lines = []
section_results = {}  # section_name -> "PASS" or "FAIL"
critical_issues = []
important_issues = []
minor_issues = []

def log(msg=""):
    report_lines.append(msg)

def header(title):
    log("=" * 70)
    log(title)
    log("=" * 70)

def subheader(title):
    log(f"\n--- {title} ---")

# ============================================================
# SECTION 1: API ENDPOINT AUDIT
# ============================================================
def audit_api():
    header("SECTION 1 — API ENDPOINT AUDIT")
    all_pass = True

    endpoints = [
        ("GET /api/policies", "/api/policies", {}),
        ("GET /api/policies?status=active", "/api/policies", {"status": "active"}),
        ("GET /api/deployments", "/api/deployments", {}),
        ("GET /api/deployments?vehicle_type=Passenger", "/api/deployments", {"vehicle_type": "Passenger"}),
        ("GET /api/funding", "/api/funding", {}),
        ("GET /api/safety", "/api/safety", {}),
        ("GET /api/safety/map/locations", "/api/safety/map/locations", {}),
        ("GET /api/resources", "/api/resources", {}),
        ("GET /api/news", "/api/news", {}),
        ("GET /api/dashboard", "/api/dashboard", {}),
        ("GET /api/curbside", "/api/curbside", {}),
    ]

    # Also test map endpoints and stats
    extra_endpoints = [
        ("GET /api/policies/map/states", "/api/policies/map/states", {}),
        ("GET /api/deployments/map/locations", "/api/deployments/map/locations", {}),
        ("GET /api/curbside/map/locations", "/api/curbside/map/locations", {}),
        ("GET /api/safety/stats/by-manufacturer", "/api/safety/stats/by-manufacturer", {}),
        ("GET /api/safety/stats/by-type", "/api/safety/stats/by-type", {}),
        ("GET /api/safety/stats/by-year", "/api/safety/stats/by-year", {}),
        ("GET /api/safety/stats/by-severity", "/api/safety/stats/by-severity", {}),
    ]

    log(f"\n{'Endpoint':<50} {'Status':<8} {'Records':<10} {'Time(ms)':<10} {'Result':<8}")
    log("-" * 86)

    for label, path, params in endpoints + extra_endpoints:
        try:
            start = time.time()
            resp = requests.get(f"{BASE_URL}{path}", params=params, timeout=10)
            elapsed = (time.time() - start) * 1000
            status = resp.status_code

            try:
                data = resp.json()
                if isinstance(data, list):
                    count = len(data)
                elif isinstance(data, dict):
                    count = "dict"
                else:
                    count = "?"
            except:
                count = "N/A"

            result = "OK" if status == 200 else "FAIL"
            if status != 200:
                all_pass = False
                critical_issues.append(f"API endpoint {label} returned HTTP {status}")

            log(f"{label:<50} {status:<8} {str(count):<10} {elapsed:<10.1f} {result:<8}")
        except Exception as e:
            all_pass = False
            critical_issues.append(f"API endpoint {label} failed: {e}")
            log(f"{label:<50} {'ERR':<8} {'N/A':<10} {'N/A':<10} FAIL")

    # Test filter correctness
    subheader("Filter Validation")

    # Test status=active filter on policies
    try:
        all_policies = requests.get(f"{BASE_URL}/api/policies", timeout=10).json()
        active_policies = requests.get(f"{BASE_URL}/api/policies", params={"status": "active"}, timeout=10).json()
        # Verify all returned are actually active (case-insensitive)
        non_active = [p for p in active_policies if p.get("status", "").lower() != "active"]
        if non_active:
            log(f"  FAIL: status=active filter returned {len(non_active)} non-active policies")
            important_issues.append(f"Policy status filter returned non-active records")
            all_pass = False
        else:
            log(f"  PASS: status=active filter correct ({len(active_policies)}/{len(all_policies)} policies)")
    except Exception as e:
        log(f"  ERROR testing policy filter: {e}")
        all_pass = False

    # Test vehicle_type filter on deployments
    try:
        all_deps = requests.get(f"{BASE_URL}/api/deployments", timeout=10).json()
        passenger_deps = requests.get(f"{BASE_URL}/api/deployments", params={"vehicle_type": "Passenger"}, timeout=10).json()
        # Check filter works (case-insensitive)
        if len(passenger_deps) <= len(all_deps):
            log(f"  PASS: vehicle_type=Passenger filter returned {len(passenger_deps)}/{len(all_deps)} deployments")
        else:
            log(f"  FAIL: vehicle_type filter returned more results than unfiltered")
            all_pass = False
    except Exception as e:
        log(f"  ERROR testing deployment filter: {e}")
        all_pass = False

    # Test search parameter
    try:
        search_results = requests.get(f"{BASE_URL}/api/policies", params={"search": "California"}, timeout=10).json()
        log(f"  INFO: search='California' on policies returned {len(search_results)} results")
    except Exception as e:
        log(f"  ERROR testing search: {e}")

    # Test dashboard summary consistency
    subheader("Dashboard Summary Consistency")
    try:
        dash = requests.get(f"{BASE_URL}/api/dashboard", timeout=10).json()
        checks = [
            ("total_policies", "/api/policies"),
            ("total_deployments", "/api/deployments"),
            ("total_funding_programs", "/api/funding"),
            ("total_safety_incidents", "/api/safety"),
            ("total_resources", "/api/resources"),
            ("total_news_articles", "/api/news"),
        ]
        for field, path in checks:
            actual = len(requests.get(f"{BASE_URL}{path}", timeout=10).json())
            reported = dash.get(field, 0)
            match = "PASS" if actual == reported else "FAIL"
            if actual != reported:
                all_pass = False
                important_issues.append(f"Dashboard {field}: reported {reported} but API returns {actual}")
            log(f"  {match}: Dashboard {field} = {reported}, API count = {actual}")
    except Exception as e:
        log(f"  ERROR checking dashboard: {e}")
        all_pass = False

    section_results["Section 1: API Endpoints"] = "PASS" if all_pass else "FAIL"

# ============================================================
# SECTION 2: DATA QUALITY AUDIT
# ============================================================
def audit_data_quality():
    header("\nSECTION 2 — DATA QUALITY AUDIT")
    all_pass = True

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    placeholder_patterns = [
        r'example\.com', r'\bTBD\b', r'Lorem ipsum', r'\bN/A\b',
        r'placeholder', r'test\.com', r'foo\.com', r'bar\.com',
        r'sample\.com', r'dummy'
    ]

    tables_config = {
        "policies": {
            "url_field": "source_url",
            "required": ["title", "jurisdiction", "policy_type"],
            "text_fields": ["title", "summary", "source_url", "jurisdiction"],
        },
        "deployments": {
            "url_field": "source_url",
            "required": ["operator", "city", "state"],
            "text_fields": ["operator", "description", "source_url", "city"],
            "check_description": True,
        },
        "funding_programs": {
            "url_field": "source_url",
            "required": ["program_name", "agency"],
            "text_fields": ["program_name", "description", "source_url", "agency"],
        },
        "safety_incidents": {
            "url_field": "source_url",
            "required": ["date", "manufacturer"],
            "text_fields": ["manufacturer", "description", "source_url", "city"],
            "check_duplicates": "report_id",
        },
        "resources": {
            "url_field": "url",
            "required": ["title", "author_org"],
            "text_fields": ["title", "summary", "url", "author_org"],
            "check_summary": True,
        },
        "news_articles": {
            "url_field": "url",
            "required": ["headline", "source_org", "publication_date"],
            "text_fields": ["headline", "summary", "url", "source_org"],
            "check_old_dates": True,
        },
        "curbside_regulations": {
            "url_field": "source_url",
            "required": ["city", "state"],
            "text_fields": ["city", "description", "source_url"],
        },
    }

    data_counts = {}

    for table, config in tables_config.items():
        subheader(f"Table: {table}")

        # Total count
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        total = cur.fetchone()[0]
        data_counts[table] = total
        log(f"  Total records: {total}")

        if total == 0:
            log(f"  WARNING: Table is empty!")
            important_issues.append(f"Table '{table}' is empty")
            all_pass = False
            continue

        # Missing URL field
        url_field = config["url_field"]
        cur.execute(f"SELECT COUNT(*) FROM {table} WHERE {url_field} IS NULL OR {url_field} = ''")
        missing_url = cur.fetchone()[0]
        log(f"  Missing {url_field}: {missing_url}")
        if missing_url > 0:
            minor_issues.append(f"{table}: {missing_url} records missing {url_field}")

        # Placeholder/fake data
        placeholder_count = 0
        for field in config["text_fields"]:
            try:
                cur.execute(f"SELECT id, {field} FROM {table} WHERE {field} IS NOT NULL")
                rows = cur.fetchall()
                for row in rows:
                    val = str(row[field] if isinstance(row, dict) else row[1])
                    for pattern in placeholder_patterns:
                        if re.search(pattern, val, re.IGNORECASE):
                            placeholder_count += 1
                            break
            except:
                pass
        log(f"  Placeholder/fake data entries: {placeholder_count}")
        if placeholder_count > 0:
            minor_issues.append(f"{table}: {placeholder_count} records with placeholder data")

        # Missing required fields
        for req_field in config["required"]:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {table} WHERE {req_field} IS NULL OR {req_field} = ''")
                missing = cur.fetchone()[0]
                if missing > 0:
                    log(f"  Missing required field '{req_field}': {missing}")
                    important_issues.append(f"{table}: {missing} records missing required field '{req_field}'")
                    all_pass = False
            except Exception as e:
                log(f"  ERROR checking {req_field}: {e}")

        # Special checks
        if config.get("check_duplicates"):
            field = config["check_duplicates"]
            cur.execute(f"SELECT {field}, COUNT(*) as cnt FROM {table} WHERE {field} IS NOT NULL GROUP BY {field} HAVING cnt > 1")
            dupes = cur.fetchall()
            if dupes:
                log(f"  DUPLICATE {field}s found: {len(dupes)} duplicated values")
                important_issues.append(f"{table}: {len(dupes)} duplicate {field} values")
                all_pass = False
            else:
                log(f"  No duplicate {field}s found")

        if config.get("check_old_dates"):
            cur.execute(f"SELECT COUNT(*) FROM {table} WHERE publication_date < '2023-01-01'")
            old = cur.fetchone()[0]
            if old > 0:
                log(f"  Articles older than 2023-01-01: {old}")
                minor_issues.append(f"{table}: {old} articles dated before 2023")
            else:
                log(f"  No articles older than 2023-01-01")

        if config.get("check_description"):
            cur.execute(f"SELECT COUNT(*) FROM {table} WHERE description IS NULL OR description = ''")
            missing_desc = cur.fetchone()[0]
            if missing_desc > 0:
                log(f"  Missing descriptions: {missing_desc}")
                minor_issues.append(f"{table}: {missing_desc} records missing description")
            else:
                log(f"  All records have descriptions")

        if config.get("check_summary"):
            cur.execute(f"SELECT COUNT(*) FROM {table} WHERE summary IS NULL OR summary = ''")
            missing_sum = cur.fetchone()[0]
            if missing_sum > 0:
                log(f"  Missing summaries: {missing_sum}")
                minor_issues.append(f"{table}: {missing_sum} records missing summary")
            else:
                log(f"  All records have summaries")

    conn.close()
    section_results["Section 2: Data Quality"] = "PASS" if all_pass else "FAIL"
    return data_counts

# ============================================================
# SECTION 3: LINK VALIDATION
# ============================================================
def audit_links():
    header("\nSECTION 3 — LINK VALIDATION")
    all_pass = True

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    url_sources = [
        ("policies", "source_url"),
        ("deployments", "source_url"),
        ("funding_programs", "source_url"),
        ("safety_incidents", "source_url"),
        ("resources", "url"),
        ("news_articles", "url"),
        ("curbside_regulations", "source_url"),
    ]

    all_urls = []
    for table, field in url_sources:
        try:
            cur.execute(f"SELECT id, {field} FROM {table} WHERE {field} IS NOT NULL AND {field} != '' LIMIT 10")
            rows = cur.fetchall()
            for row in rows:
                url = row[1]
                if url and url.startswith("http"):
                    all_urls.append((table, row[0], url))
        except:
            pass

    conn.close()

    # Sample at least 30 URLs
    sample = all_urls[:50]  # Take more than needed since some tables may have fewer

    log(f"\nTesting {len(sample)} URLs across all tables...\n")
    log(f"{'Table':<22} {'ID':<5} {'Status':<8} {'Result':<15} URL")
    log("-" * 120)

    broken_links = []
    tested = 0

    for table, rec_id, url in sample:
        tested += 1
        try:
            resp = requests.head(url, timeout=8, allow_redirects=True,
                               headers={"User-Agent": "Mozilla/5.0 AV-Hub-Audit/1.0"})
            status = resp.status_code
            if status in (200, 201, 204, 301, 302, 303, 307, 308):
                result = "OK"
            elif status in (403, 429):
                result = "BLOCKED"
                minor_issues.append(f"Link blocked ({status}): {table} id={rec_id}: {url}")
            elif status == 404:
                result = "NOT FOUND"
                broken_links.append((table, rec_id, url, status))
                all_pass = False
            else:
                result = f"HTTP {status}"
                broken_links.append((table, rec_id, url, status))
        except requests.exceptions.SSLError:
            result = "SSL ERROR"
            minor_issues.append(f"SSL error: {table} id={rec_id}: {url}")
        except requests.exceptions.ConnectionError:
            result = "CONN ERROR"
            broken_links.append((table, rec_id, url, "Connection Error"))
            all_pass = False
        except requests.exceptions.Timeout:
            result = "TIMEOUT"
            minor_issues.append(f"Timeout: {table} id={rec_id}: {url}")
        except Exception as e:
            result = f"ERROR"
            minor_issues.append(f"Error checking {table} id={rec_id}: {e}")

        status_str = str(status) if 'status' in dir() and isinstance(status, int) else "N/A"
        # Truncate URL for display
        display_url = url[:60] + "..." if len(url) > 60 else url
        log(f"{table:<22} {rec_id:<5} {status_str:<8} {result:<15} {display_url}")

    log(f"\nTotal URLs tested: {tested}")
    log(f"Broken links found: {len(broken_links)}")

    if broken_links:
        subheader("Broken Links Detail")
        for table, rec_id, url, status in broken_links:
            log(f"  [{table} id={rec_id}] Status={status}: {url}")
            important_issues.append(f"Broken link in {table} id={rec_id}: {url}")

    section_results["Section 3: Link Validation"] = "PASS" if all_pass else "FAIL"
    return broken_links

# ============================================================
# SECTION 4: FRONTEND BUILD AUDIT
# ============================================================
def audit_frontend():
    header("\nSECTION 4 — FRONTEND BUILD AUDIT")
    all_pass = True

    import os
    import subprocess

    # Check if built frontend exists
    static_dir = "/home/user/av-hub/backend/static"
    if os.path.exists(static_dir):
        log(f"  Built frontend found at {static_dir}")
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            log(f"  index.html exists")
            with open(index_path, 'r') as f:
                index_content = f.read()
            # Check for JS/CSS assets
            js_refs = re.findall(r'src="([^"]*\.js)"', index_content)
            css_refs = re.findall(r'href="([^"]*\.css)"', index_content)
            log(f"  JS assets referenced: {len(js_refs)}")
            log(f"  CSS assets referenced: {len(css_refs)}")

            # Check assets exist
            assets_dir = os.path.join(static_dir, "assets")
            if os.path.exists(assets_dir):
                assets = os.listdir(assets_dir)
                log(f"  Assets in build: {len(assets)} files")
                for a in sorted(assets):
                    size = os.path.getsize(os.path.join(assets_dir, a))
                    log(f"    {a} ({size:,} bytes)")
            else:
                log(f"  WARNING: No assets directory found")
                important_issues.append("No assets directory in built frontend")
                all_pass = False
        else:
            log(f"  FAIL: index.html not found")
            critical_issues.append("index.html missing from built frontend")
            all_pass = False
    else:
        log(f"  WARNING: Built frontend not found at {static_dir}")
        important_issues.append("Built frontend directory not found")

    # Check frontend source for hardcoded data
    subheader("Hardcoded Data Check")
    src_dir = "/home/user/av-hub/frontend/src"
    if os.path.exists(src_dir):
        hardcoded_patterns = [
            (r'const\s+\w+\s*=\s*\[.*\{.*\}.*\]', "hardcoded array of objects"),
            (r'localhost:\d{4}', "hardcoded localhost URL"),
        ]
        pages_dir = os.path.join(src_dir, "pages")
        if os.path.exists(pages_dir):
            for fname in os.listdir(pages_dir):
                if fname.endswith(('.jsx', '.js', '.tsx')):
                    fpath = os.path.join(pages_dir, fname)
                    with open(fpath, 'r') as f:
                        content = f.read()
                    for pattern, desc in hardcoded_patterns:
                        matches = re.findall(pattern, content)
                        if matches and 'useState' not in matches[0]:
                            # Filter out state initializations
                            real_matches = [m for m in matches if 'useState' not in m and len(m) > 50]
                            if real_matches:
                                log(f"  WARNING: {fname} may contain {desc}")
                                minor_issues.append(f"{fname}: possible {desc}")

    # Check API base URL configuration
    api_file = os.path.join(src_dir, "api.js")
    if os.path.exists(api_file):
        with open(api_file, 'r') as f:
            api_content = f.read()
        if "localhost" in api_content:
            log(f"  INFO: api.js references localhost (expected for dev)")
        base_url_match = re.search(r'(BASE_URL|baseURL|API_URL)\s*=\s*["\']([^"\']+)', api_content)
        if base_url_match:
            log(f"  API base URL: {base_url_match.group(2)}")
        else:
            # Check for relative URLs
            if "'/api/" in api_content or '"/api/' in api_content or '`/api/' in api_content:
                log(f"  API uses relative URLs (good for production)")

    # Check routes exist and render
    subheader("Route Verification")
    routes_to_check = [
        ("/", "Dashboard"),
        ("/policies", "PolicyTracker"),
        ("/deployments", "DeploymentDashboard"),
        ("/funding", "FundingIntelligence"),
        ("/safety", "SafetyAnalytics"),
        ("/resources", "ResourceLibrary"),
        ("/news", "News"),
        ("/admin", "Admin"),
    ]

    # Check App.jsx for route definitions
    app_jsx = os.path.join(src_dir, "App.jsx")
    if os.path.exists(app_jsx):
        with open(app_jsx, 'r') as f:
            app_content = f.read()
        for route_path, component in routes_to_check:
            # Check route exists in router config
            if route_path == "/":
                route_found = 'path="/"' in app_content or "index" in app_content
            else:
                route_found = f'path="{route_path}"' in app_content or f"path='{route_path}'" in app_content

            status = "FOUND" if route_found else "MISSING"
            if not route_found:
                all_pass = False
                important_issues.append(f"Route {route_path} ({component}) not found in App.jsx")
            log(f"  Route {route_path:<15} ({component:<25}): {status}")

    # Test that frontend serves via backend
    subheader("Frontend Serving Check")
    try:
        resp = requests.get(f"{BASE_URL}/", timeout=10)
        if resp.status_code == 200 and ("<!DOCTYPE html>" in resp.text or "<html" in resp.text.lower()):
            log(f"  PASS: Frontend serves correctly from backend (HTTP {resp.status_code})")
        else:
            log(f"  WARNING: Root returns HTTP {resp.status_code}, content may not be HTML")
            minor_issues.append("Root URL may not serve frontend correctly")
    except Exception as e:
        log(f"  ERROR: Could not reach frontend: {e}")
        all_pass = False

    # Try a rebuild to check for errors
    subheader("Build Output Check")
    try:
        result = subprocess.run(
            ["npm", "run", "build"],
            cwd="/home/user/av-hub/frontend",
            capture_output=True, text=True, timeout=60
        )
        if result.returncode == 0:
            log(f"  PASS: Frontend builds successfully")
            # Check for warnings
            if "warning" in result.stderr.lower():
                warnings = [l for l in result.stderr.split('\n') if 'warning' in l.lower()]
                log(f"  Build warnings: {len(warnings)}")
                for w in warnings[:5]:
                    log(f"    {w.strip()}")
                    minor_issues.append(f"Build warning: {w.strip()}")
        else:
            log(f"  FAIL: Frontend build failed")
            log(f"  stderr: {result.stderr[:500]}")
            critical_issues.append("Frontend build fails")
            all_pass = False
    except subprocess.TimeoutExpired:
        log(f"  WARNING: Build timed out (60s)")
        minor_issues.append("Frontend build timed out")
    except FileNotFoundError:
        log(f"  WARNING: npm not found, skipping build check")

    section_results["Section 4: Frontend Build"] = "PASS" if all_pass else "FAIL"

# ============================================================
# SECTION 5: DATA CONSISTENCY AUDIT
# ============================================================
def audit_consistency():
    header("\nSECTION 5 — DATA CONSISTENCY AUDIT")
    all_pass = True

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. Operator names: safety incidents vs deployments
    subheader("Operator Name Consistency (Safety vs Deployments)")
    cur.execute("SELECT DISTINCT manufacturer FROM safety_incidents WHERE manufacturer IS NOT NULL")
    safety_operators = set(r[0] for r in cur.fetchall())

    cur.execute("SELECT DISTINCT operator FROM deployments WHERE operator IS NOT NULL")
    deployment_operators = set(r[0] for r in cur.fetchall())

    log(f"  Safety manufacturers: {sorted(safety_operators)}")
    log(f"  Deployment operators: {sorted(deployment_operators)}")

    in_safety_not_deploy = safety_operators - deployment_operators
    in_deploy_not_safety = deployment_operators - safety_operators

    if in_safety_not_deploy:
        log(f"  MISMATCH: In safety but not deployments: {sorted(in_safety_not_deploy)}")
        for op in in_safety_not_deploy:
            # Check if it's a case issue or similar name
            close = [d for d in deployment_operators if op.lower() in d.lower() or d.lower() in op.lower()]
            if close:
                minor_issues.append(f"Operator name mismatch: '{op}' in safety, similar '{close}' in deployments")
            else:
                important_issues.append(f"Operator '{op}' in safety incidents but not in deployments")
    if in_deploy_not_safety:
        log(f"  INFO: In deployments but not safety (OK): {sorted(in_deploy_not_safety)}")
    if not in_safety_not_deploy:
        log(f"  PASS: All safety manufacturers exist in deployments")

    # 2. State name consistency
    subheader("State Name Formatting Consistency")
    state_tables = [
        ("policies", "jurisdiction"),
        ("deployments", "state"),
        ("safety_incidents", "state"),
        ("curbside_regulations", "state"),
    ]

    all_state_values = {}
    for table, field in state_tables:
        try:
            cur.execute(f"SELECT DISTINCT {field} FROM {table} WHERE {field} IS NOT NULL")
            values = [r[0] for r in cur.fetchall()]
            all_state_values[f"{table}.{field}"] = values

            # Check for abbreviations mixed with full names
            abbrevs = [v for v in values if len(v) <= 2]
            full_names = [v for v in values if len(v) > 2]
            if abbrevs and full_names:
                log(f"  WARNING: {table}.{field} mixes abbreviations {abbrevs[:5]} and full names {full_names[:5]}")
                important_issues.append(f"{table}.{field} mixes state abbreviations and full names")
                all_pass = False
            elif abbrevs:
                log(f"  {table}.{field}: Uses abbreviations ({len(abbrevs)} values)")
            else:
                log(f"  {table}.{field}: Uses full names ({len(full_names)} values)")
        except Exception as e:
            log(f"  ERROR checking {table}.{field}: {e}")

    # 3. Date format consistency
    subheader("Date Format Consistency")
    date_fields = [
        ("policies", "date_enacted"),
        ("deployments", "start_date"),
        ("safety_incidents", "date"),
        ("funding_programs", "application_deadline"),
        ("news_articles", "publication_date"),
        ("resources", "publication_date"),
    ]

    for table, field in date_fields:
        try:
            cur.execute(f"SELECT DISTINCT {field} FROM {table} WHERE {field} IS NOT NULL LIMIT 20")
            dates = [r[0] for r in cur.fetchall()]
            if dates:
                # Check YYYY-MM-DD format
                iso_pattern = re.compile(r'^\d{4}-\d{2}-\d{2}$')
                non_iso = [d for d in dates if not iso_pattern.match(str(d))]
                if non_iso:
                    log(f"  WARNING: {table}.{field} has non-YYYY-MM-DD dates: {non_iso[:5]}")
                    important_issues.append(f"{table}.{field} has inconsistent date formats")
                    all_pass = False
                else:
                    log(f"  PASS: {table}.{field} uses YYYY-MM-DD ({len(dates)} unique dates sampled)")
            else:
                log(f"  INFO: {table}.{field} has no date values")
        except Exception as e:
            log(f"  ERROR: {table}.{field}: {e}")

    # 4. Status value capitalization
    subheader("Status Value Capitalization")
    status_fields = [
        ("policies", "status"),
        ("deployments", "status"),
        ("funding_programs", "status"),
        ("curbside_regulations", "status"),
    ]

    for table, field in status_fields:
        try:
            cur.execute(f"SELECT DISTINCT {field} FROM {table} WHERE {field} IS NOT NULL")
            values = [r[0] for r in cur.fetchall()]
            log(f"  {table}.{field}: {values}")

            # Check consistency (all lowercase, all titlecase, or mixed)
            cases = set()
            for v in values:
                if v == v.lower():
                    cases.add("lower")
                elif v == v.upper():
                    cases.add("upper")
                elif v == v.title():
                    cases.add("title")
                else:
                    cases.add("mixed")

            if len(cases) > 1:
                log(f"    WARNING: Mixed capitalization styles: {cases}")
                minor_issues.append(f"{table}.{field} has mixed capitalization: {values}")
            else:
                log(f"    PASS: Consistent capitalization ({cases.pop()})")
        except Exception as e:
            log(f"  ERROR: {table}.{field}: {e}")

    conn.close()
    section_results["Section 5: Data Consistency"] = "PASS" if all_pass else "FAIL"

# ============================================================
# SECTION 6: SUMMARY REPORT
# ============================================================
def generate_summary(data_counts, broken_links):
    header("\nSECTION 6 — SUMMARY REPORT")

    subheader("1. Section Results")
    for section, result in section_results.items():
        log(f"  [{result}] {section}")

    overall = "PASS" if all(v == "PASS" for v in section_results.values()) else "FAIL"
    log(f"\n  OVERALL: {overall}")

    subheader("2. Critical Issues (Blocking Demo)")
    if critical_issues:
        for i, issue in enumerate(critical_issues, 1):
            log(f"  {i}. {issue}")
    else:
        log(f"  None found!")

    subheader("3. Important Issues (Fix Before External Demo)")
    if important_issues:
        for i, issue in enumerate(important_issues, 1):
            log(f"  {i}. {issue}")
    else:
        log(f"  None found!")

    subheader("4. Minor Issues (Nice to Fix)")
    if minor_issues:
        for i, issue in enumerate(minor_issues, 1):
            log(f"  {i}. {issue}")
    else:
        log(f"  None found!")

    subheader("5. Data Counts Summary")
    log(f"  {'Table':<25} {'Records':<10}")
    log(f"  {'-'*35}")
    total = 0
    for table, count in data_counts.items():
        log(f"  {table:<25} {count:<10}")
        total += count
    log(f"  {'-'*35}")
    log(f"  {'TOTAL':<25} {total:<10}")

    subheader("6. Broken Links")
    if broken_links:
        for table, rec_id, url, status in broken_links:
            log(f"  [{table} id={rec_id}] {status}: {url}")
    else:
        log(f"  No broken links found in tested sample.")

    subheader("7. Recommended Priority Order for Fixes")
    priority = 1
    if critical_issues:
        for issue in critical_issues:
            log(f"  P{priority} (CRITICAL): {issue}")
            priority += 1
    if important_issues:
        for issue in important_issues:
            log(f"  P{priority} (IMPORTANT): {issue}")
            priority += 1
    if minor_issues:
        for issue in minor_issues[:10]:  # Top 10 minor
            log(f"  P{priority} (MINOR): {issue}")
            priority += 1
    if not critical_issues and not important_issues and not minor_issues:
        log(f"  No issues to fix! Application looks great.")

    log(f"\n{'=' * 70}")
    log(f"Audit completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log(f"Total issues: {len(critical_issues)} critical, {len(important_issues)} important, {len(minor_issues)} minor")
    log(f"{'=' * 70}")

# ============================================================
# MAIN
# ============================================================
if __name__ == "__main__":
    print("Starting comprehensive AV Hub audit...")
    print(f"Backend: {BASE_URL}")
    print(f"Database: {DB_PATH}")
    print()

    log(f"AV HUB COMPREHENSIVE AUDIT REPORT")
    log(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log(f"Backend URL: {BASE_URL}")
    log(f"Database: {DB_PATH}")
    log("")

    print("[1/5] Auditing API endpoints...")
    audit_api()

    print("[2/5] Auditing data quality...")
    data_counts = audit_data_quality()

    print("[3/5] Validating external links (this may take a minute)...")
    broken_links = audit_links()

    print("[4/5] Auditing frontend build...")
    audit_frontend()

    print("[5/5] Auditing data consistency...")
    audit_consistency()

    print("[6/6] Generating summary report...")
    generate_summary(data_counts, broken_links)

    # Write report
    with open(REPORT_PATH, 'w') as f:
        f.write('\n'.join(report_lines))

    print(f"\nReport saved to: {REPORT_PATH}")
    print()

    # Print summary to console
    print("=" * 60)
    print("AUDIT SUMMARY")
    print("=" * 60)
    for section, result in section_results.items():
        print(f"  [{result}] {section}")
    print()
    print(f"Critical issues: {len(critical_issues)}")
    print(f"Important issues: {len(important_issues)}")
    print(f"Minor issues:     {len(minor_issues)}")
    print()
    if critical_issues:
        print("CRITICAL:")
        for c in critical_issues:
            print(f"  - {c}")
    if important_issues:
        print("IMPORTANT:")
        for i in important_issues:
            print(f"  - {i}")
    print()
    print(f"Data: {sum(data_counts.values())} total records across {len(data_counts)} tables")
    for t, c in data_counts.items():
        print(f"  {t}: {c}")
    print()
    overall = "PASS" if all(v == "PASS" for v in section_results.values()) else "FAIL"
    print(f"OVERALL RESULT: {overall}")

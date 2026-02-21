# AV Hub - Autonomous Vehicle Intelligence Platform

A centralized web application for tracking autonomous vehicle policy, deployments, funding programs, safety data, curbside regulations, and research resources across the United States.

Developed by **Atlas Public Policy**.

---

## Features

- **Policy Tracker** - Interactive map and table of AV legislation across all 50 states
- **Deployment Dashboard** - Map of commercial AV operations and testing programs
- **Funding Intelligence** - Federal and state grant programs (SMART, FTA Low-No, ATTAIN, NHTSA, and more)
- **Safety Analytics** - NHTSA SGO incident data with charts by manufacturer, type, year, and severity
- **Resource Library** - Reports, white papers, and policy analyses on autonomous vehicles
- **Curbside Management** - City-level pickup/dropoff zones and geofenced AV regulations
- **Admin Panel** - Full CRUD interface for managing all data

---

## How to Run on Windows (Step-by-Step)

These instructions are written for someone who has never run code before. Follow each step exactly.

### Step 1: Install Python

1. Open your web browser and go to: **https://www.python.org/downloads/**
2. Click the big yellow **"Download Python 3.x.x"** button
3. Run the downloaded installer
4. **IMPORTANT:** Check the box that says **"Add Python to PATH"** at the bottom of the installer
5. Click **"Install Now"**
6. Wait for it to finish, then click **"Close"**

### Step 2: Install Node.js

1. Open your web browser and go to: **https://nodejs.org/**
2. Click the green **"LTS"** button (the one on the left)
3. Run the downloaded installer
4. Click **Next** through all the screens, accepting the defaults
5. Wait for it to finish, then click **"Finish"**

### Step 3: Install Git

1. Open your web browser and go to: **https://git-scm.com/download/win**
2. The download should start automatically
3. Run the downloaded installer
4. Click **Next** through all the screens, accepting the defaults
5. Click **"Install"** and wait for it to finish

### Step 4: Download the Project

1. Press the **Windows key** on your keyboard, type **cmd**, and press **Enter** to open Command Prompt
2. Type the following commands one at a time, pressing **Enter** after each:

```
cd Desktop
git clone https://github.com/bsharpe03/av-hub-prototype.git
cd av-hub-prototype
```

### Step 5: Start the Backend (API Server)

1. In the same Command Prompt window, type:

```
cd backend
pip install -r requirements.txt
```

2. Wait for all the packages to install (this may take a minute)
3. Then type:

```
python -c "from database import engine; from models import Base; Base.metadata.create_all(bind=engine); from seed_data import seed_database; from database import SessionLocal; db = SessionLocal(); seed_database(db); db.close(); print('Database ready')"
```

4. Then start the server:

```
python -m uvicorn main:app --port 8000
```

5. You should see a message like `Uvicorn running on http://127.0.0.1:8000`
6. **Leave this window open** - the server needs to keep running

### Step 6: Start the Frontend (Web App)

1. Open a **new** Command Prompt window (press Windows key, type **cmd**, press Enter)
2. Type the following commands one at a time:

```
cd Desktop\av-hub-prototype\frontend
npm install
```

3. Wait for all the packages to install (this may take a few minutes)
4. Then type:

```
npm run dev
```

5. You should see a message showing a URL like `http://localhost:3000`

### Step 7: Open the App

1. Open your web browser (Chrome, Edge, or Firefox)
2. Go to: **http://localhost:3000**
3. You should see the AV Hub dashboard!

### Admin Login

To access the admin panel, click **Admin** in the navigation bar and use:

- **Username:** `admin`
- **Password:** `avhub2024`

---

## How to Stop the App

1. Go to each Command Prompt window
2. Press **Ctrl + C** to stop the server
3. You can close the windows after that

## How to Start Again Later

1. Open Command Prompt
2. Start the backend:
   ```
   cd Desktop\av-hub-prototype\backend
   python -m uvicorn main:app --port 8000
   ```
3. Open a second Command Prompt and start the frontend:
   ```
   cd Desktop\av-hub-prototype\frontend
   npm run dev
   ```
4. Open **http://localhost:3000** in your browser

---

## Tech Stack

- **Backend:** Python, FastAPI, SQLAlchemy, SQLite
- **Frontend:** React 18, Vite, Tailwind CSS, Recharts, Leaflet
- **Authentication:** HTTP Basic Auth with bcrypt

## Data Sources

- NHTSA Standing General Order
- National Conference of State Legislatures
- State DOT Permit Databases
- USDOT Grant Programs

---

*Prototype - not for production use.*

# SmartPresence AI v2.0 — Setup Guide

## Architecture
```
Attendence/
├── backend/         ← FastAPI + Prisma Python + PostgreSQL
│   ├── main.py      ← Async FastAPI app (CORS enabled)
│   ├── database.py  ← Prisma async queries
│   ├── face_ai.py   ← OpenCV 5 face recognition
│   ├── qr_engine.py ← 5s rolling HMAC QR tokens
│   ├── prisma/
│   │   └── schema.prisma ← PostgreSQL schema
│   ├── static/      ← Student photos, snapshots
│   ├── .env         ← YOUR DB credentials go here
│   └── requirements.txt
└── frontend/        ← Vite + React 18
    ├── src/
    │   ├── pages/   ← IndexPage, FacultyPage, StudentPage, DashboardPage
    │   ├── components/Navbar.jsx
    │   ├── api.js   ← Axios client
    │   └── index.css ← Design system
    └── vite.config.js ← Proxies /api to FastAPI
```

## Quick Start

### 1. Backend Setup
```powershell
cd backend

# Create .env file
copy .env.example .env
# Edit .env and set your DATABASE_URL

# Install dependencies
pip install -r requirements.txt

# Generate Prisma client
python -m prisma generate

# Push schema to PostgreSQL (creates tables)
python -m prisma db push

# Start backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup
```powershell
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

## .env Template (backend/.env)
```
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
FRONTEND_URL="http://localhost:5173"
```

### Popular PostgreSQL Hosts:
- **Neon** (free): https://neon.tech — copy connection string from dashboard
- **Supabase** (free): https://supabase.com — Settings > Database > Connection string
- **Railway**: https://railway.app

## Test Credentials
| Role | Login | Password |
|------|-------|----------|
| Faculty | turing@cs.edu | faculty123 |
| Faculty | ada@cs.edu | faculty123 |
| Student | 2024CS101 | student123 |
| Student | 2024CS102 | student123 |
| Student | 2024CS103 | student123 |

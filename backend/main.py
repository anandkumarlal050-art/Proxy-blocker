"""
main.py — FastAPI Backend with Async Prisma + PostgreSQL
SmartPresence AI — Anti-Proxy Attendance Monitoring System
"""
import os
import uuid
import time
import math
import base64
import csv
import io
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import database
import qr_engine
import face_ai
import jwt_util

app = FastAPI(title="SmartPresence AI", version="2.0.0")

# ─── CORS for React frontend ───
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static folder (student photos, snapshots)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
SNAPSHOTS_DIR = os.path.join(STATIC_DIR, "snapshots")
os.makedirs(SNAPSHOTS_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# ─── Startup / Shutdown ───
@app.on_event("startup")
async def startup_event():
    await database.connect()
    await database.seed_if_empty()

@app.on_event("shutdown")
async def shutdown_event():
    await database.disconnect()

# ─── Helpers ───
def calculate_distance_meters(lat1, lon1, lat2, lon2) -> float:
    R = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 1)

# ─── Pydantic Schemas ───
class LoginRequest(BaseModel):
    role: str
    username: str
    password: str

class CreateSessionRequest(BaseModel):
    faculty_id: str
    subject_id: str
    classroom_name: str
    lat: float
    lng: float
    allowed_radius_meters: float = 100.0
    duration_minutes: int = 30

class VerifyAttendanceRequest(BaseModel):
    session_id: str
    token: str
    student_id: str
    lat: float
    lng: float
    live_image: str  # base64 data URI
class CreateStudentRequest(BaseModel):
    roll_no: str
    name: str
    email: str
    password: str
    department: str
    semester: str
    photo_b64: str

# ═══════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0.0", "db": "postgresql+prisma"}

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

@app.get("/api/me")
async def get_me(token: str = Depends(oauth2_scheme)):
    payload = jwt_util.verify_jwt(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    if payload["role"] == "faculty":
        user = await database.get_faculty_by_email(payload["username"])
        if user and user.password == payload["password"]:
            return {"status": "success", "role": "faculty", "user": {
                "id": user.id, "name": user.name, "email": user.email,
                "department": user.department, "designation": user.designation
            }}
    elif payload["role"] == "student":
        user = await database.get_student_by_credentials(payload["username"], payload["password"])
        if user:
            return {"status": "success", "role": "student", "user": {
                "id": user.id, "roll_no": user.roll_no, "name": user.name,
                "email": user.email, "department": user.department,
                "semester": user.semester, "photo_url": user.photo_url
            }}
            
    raise HTTPException(status_code=401, detail="User not found")

@app.post("/api/login")
async def login(req: LoginRequest):
    if req.role == "faculty":
        user = await database.get_faculty_by_email(req.username.strip())
        if not user or user.password != req.password.strip():
            raise HTTPException(status_code=401, detail="Invalid Faculty credentials. Use turing@cs.edu / faculty123")
        token = jwt_util.create_jwt({"role": "faculty", "username": user.email, "password": user.password})
        return {"status": "success", "role": "faculty", "token": token, "user": {
            "id": user.id, "name": user.name, "email": user.email,
            "department": user.department, "designation": user.designation
        }}
    elif req.role == "student":
        user = await database.get_student_by_credentials(req.username.strip(), req.password.strip())
        if not user:
            raise HTTPException(status_code=401, detail="Invalid Student credentials. Use Roll No: 2024CS101 / student123")
        token = jwt_util.create_jwt({"role": "student", "username": user.roll_no, "password": user.password})
        return {"status": "success", "role": "student", "token": token, "user": {
            "id": user.id, "roll_no": user.roll_no, "name": user.name,
            "email": user.email, "department": user.department,
            "semester": user.semester, "photo_url": user.photo_url
        }}
    raise HTTPException(status_code=400, detail="Invalid role")

@app.get("/api/students")
async def get_students():
    return await database.get_all_students()

@app.get("/api/faculty/{faculty_id}/subjects")
async def get_faculty_subjects(faculty_id: str):
    return await database.get_faculty_subjects(faculty_id)

@app.post("/api/session/create")
async def create_session_endpoint(req: CreateSessionRequest):
    session_id = f"SES-{uuid.uuid4().hex[:8].upper()}"
    await database.create_session(
        session_id=session_id,
        subject_id=req.subject_id,
        faculty_id=req.faculty_id,
        classroom_name=req.classroom_name,
        lat=req.lat,
        lng=req.lng,
        radius=req.allowed_radius_meters,
        duration_minutes=req.duration_minutes
    )
    return {"status": "success", "session_id": session_id}

@app.get("/api/session/{session_id}/qr")
async def get_session_qr(session_id: str, request: Request):
    session = await database.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    now = time.time()
    if session["status"] == "ended":
        return {"status": "ended", "message": "Session ended by faculty."}

    if now > session["expires_at"]:
        await database.end_session(session_id)
        return {"status": "expired", "message": "Session expired (30-minute limit)."}

    token = qr_engine.generate_token(session_id)
    remaining_seconds = max(0, int(session["expires_at"] - now))
    frontend_url = os.getenv("FRONTEND_URL", str(request.base_url)).rstrip('/')
    scan_url = f"{frontend_url}/student?session_id={session_id}&token={token}"
    qr_image = qr_engine.generate_qr_image_base64(scan_url)
    records = await database.get_session_attendance_records(session_id)
    seconds_in_token = 5 - (int(now) % 5)

    return {
        "status": "active",
        "session_id": session_id,
        "subject_name": session["subject_name"],
        "subject_code": session["subject_code"],
        "classroom_name": session["classroom_name"],
        "token": token,
        "token_expires_in": seconds_in_token,
        "remaining_session_seconds": remaining_seconds,
        "scan_url": scan_url,
        "qr_image": qr_image,
        "attendee_count": len(records)
    }

@app.get("/api/session/{session_id}/status")
async def get_session_status(session_id: str):
    session = await database.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    now = time.time()
    is_expired = now > session["expires_at"] or session["status"] == "ended"
    remaining_seconds = max(0, int(session["expires_at"] - now))
    records = await database.get_session_attendance_records(session_id)
    return {"session": session, "is_expired": is_expired, "remaining_seconds": remaining_seconds, "attendees_count": len(records)}

@app.post("/api/session/{session_id}/end")
async def end_session_endpoint(session_id: str):
    await database.end_session(session_id)
    return {"status": "success", "message": "Session closed."}

@app.get("/api/session/{session_id}/attendance")
async def get_session_attendance(session_id: str):
    session = await database.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    records = await database.get_session_attendance_records(session_id)
    return {"session": session, "records": records, "count": len(records)}

@app.get("/api/session/{session_id}/export-csv")
async def export_session_csv(session_id: str):
    session = await database.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    records = await database.get_session_attendance_records(session_id)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Record ID", "Subject Code", "Subject Name", "Classroom", "Roll Number",
                     "Student Name", "Marked Timestamp", "GPS Distance (m)", "Face Match %", "Status"])
    for r in records:
        writer.writerow([r.get("id"), r.get("subject_code"), r.get("subject_name"),
                         r.get("classroom_name"), r.get("roll_no"), r.get("student_name"),
                         r.get("marked_at"), f"{r.get('distance_meters')}m",
                         f"{r.get('face_confidence')}%", r.get("verification_status")])
    output.seek(0)
    filename = f"session_{session_id}_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(content=output.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": f"attachment; filename={filename}"})

@app.get("/api/faculty/{faculty_id}/attendance-records")
async def get_faculty_records(faculty_id: str, subject_id: Optional[str] = None):
    records = await database.get_faculty_attendance_records(faculty_id, subject_id)
    return {"records": records, "count": len(records)}

@app.get("/api/faculty/{faculty_id}/export-csv")
async def export_attendance_csv(faculty_id: str, subject_id: Optional[str] = None):
    records = await database.get_faculty_attendance_records(faculty_id, subject_id)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Record ID", "Subject Code", "Subject Name", "Classroom", "Roll Number",
                     "Student Name", "Marked Timestamp", "GPS Distance (m)", "Face Match %", "Status"])
    for r in records:
        writer.writerow([r.get("id"), r.get("subject_code"), r.get("subject_name"),
                         r.get("classroom_name"), r.get("roll_no"), r.get("student_name"),
                         r.get("marked_at"), f"{r.get('distance_meters')}m",
                         f"{r.get('face_confidence')}%", r.get("verification_status")])
    output.seek(0)
    filename = f"attendance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(content=output.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": f"attachment; filename={filename}"})

@app.post("/api/faculty/create-student")
async def create_student(req: CreateStudentRequest):
    # Check if student exists
    existing = await database.db.student.find_first(where={"OR": [{"roll_no": req.roll_no}, {"email": req.email}]})
    if existing:
        raise HTTPException(status_code=400, detail="Student with this roll number or email already exists.")
    
    # Save the reference photo
    try:
        import uuid
        student_id = f"STU{str(uuid.uuid4())[:8].upper()}"
        filename = f"{req.roll_no.lower()}.jpg"
        photo_dir = os.path.join(STATIC_DIR, "images", "students")
        os.makedirs(photo_dir, exist_ok=True)
        photo_path = os.path.join(photo_dir, filename)
        
        pil_img = face_ai.base64_to_pil(req.photo_b64)
        pil_img.save(photo_path, "JPEG")
        photo_url = f"/static/images/students/{filename}"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process image: {str(e)}")
        
    # Create in DB
    try:
        await database.db.student.create(
            data={
                "id": student_id,
                "roll_no": req.roll_no,
                "name": req.name,
                "email": req.email,
                "password": req.password,
                "department": req.department,
                "semester": req.semester,
                "photo_url": photo_url
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        
    return {"status": "success", "message": f"Student {req.name} created successfully.", "photo_url": photo_url}

@app.post("/api/student/verify-attendance")
async def verify_attendance(req: VerifyAttendanceRequest):
    # 1. Session check
    session = await database.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session does not exist.")

    now = time.time()
    if session["status"] == "ended":
        raise HTTPException(status_code=400, detail="This attendance session has already ended.")

    if now > session["expires_at"]:
        await database.end_session(req.session_id)
        raise HTTPException(status_code=400, detail="QR code session expired (30-minute limit). Ask faculty for assistance.")

    # 2. Token validation - tolerance of 60 slots (5 minutes) gives students enough time to login, get GPS, and take a photo
    if not qr_engine.validate_token(req.session_id, req.token, interval=5, tolerance_slots=60):
        raise HTTPException(status_code=400, detail="Invalid or expired QR token! QR refreshes every 5 seconds. Scan the current live QR code.")

    # 3. Student check
    student = await database.get_student_by_id(req.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    already_marked = await database.has_student_marked_session(req.session_id, student.id)
    if already_marked:
        raise HTTPException(status_code=400,
            detail=f"Attendance already recorded for {student.name} ({student.roll_no}). Single marking per session only.")

    # 4. GPS Geofence
    distance = calculate_distance_meters(req.lat, req.lng, session["lat"], session["lng"])
    if distance > session["allowed_radius_meters"]:
        raise HTTPException(status_code=400,
            detail=f"Location Verification Failed! You are {distance}m away from {session['classroom_name']}. Maximum allowed: {session['allowed_radius_meters']}m.")

    # 5. AI Face Recognition
    is_face_matched, confidence, details = face_ai.verify_faces(req.live_image, student.photo_url)
    if not is_face_matched or confidence < 70.0:
        raise HTTPException(status_code=400,
            detail=f"AI Face Recognition Failed! Confidence: {confidence}% (minimum 70%). Details: {details}")

    # Save snapshot
    snapshot_url = ""
    try:
        snapshot_filename = f"{req.session_id}_{student.id}_{int(time.time())}.jpg"
        snapshot_full_path = os.path.join(SNAPSHOTS_DIR, snapshot_filename)
        pil_img = face_ai.base64_to_pil(req.live_image)
        pil_img.save(snapshot_full_path, "JPEG")
        snapshot_url = f"/static/snapshots/{snapshot_filename}"
    except Exception:
        pass

    # Record
    await database.record_attendance(
        session_id=req.session_id, student_id=student.id,
        subject_id=session["subject_id"], lat=req.lat, lng=req.lng,
        distance=distance, face_confidence=confidence, snapshot_path=snapshot_url
    )

    return {
        "status": "success",
        "message": f"Attendance verified & recorded for {student.name}!",
        "student_name": student.name, "roll_no": student.roll_no,
        "subject_name": session["subject_name"], "subject_code": session["subject_code"],
        "marked_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "gps_distance": distance, "face_confidence": confidence,
        "classroom_name": session["classroom_name"]
    }

@app.get("/api/student/{student_id}/dashboard")
async def get_student_dashboard(student_id: str):
    data = await database.get_student_dashboard(student_id)
    if not data:
        raise HTTPException(status_code=404, detail="Student not found.")
    return data

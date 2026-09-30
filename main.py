import os
import uuid
import time
import math
import base64
import csv
import io
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import database
import qr_engine
import face_ai

app = FastAPI(title="Smart Attendance Monitoring System", version="1.0.0")

# Mount static folder
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
SNAPSHOTS_DIR = os.path.join(STATIC_DIR, "snapshots")
os.makedirs(SNAPSHOTS_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    database.init_db()

# Haversine distance calculation in meters
def calculate_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 1)

# Pydantic Schemas
class LoginRequest(BaseModel):
    role: str  # 'faculty' or 'student'
    username: str  # email or roll_no
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

# --- Page Routes ---
@app.get("/", response_class=HTMLResponse)
def index_page():
    with open(os.path.join(os.path.dirname(__file__), "templates", "index.html"), "r", encoding="utf-8") as f:
        return f.read()

@app.get("/faculty", response_class=HTMLResponse)
def faculty_page():
    with open(os.path.join(os.path.dirname(__file__), "templates", "faculty.html"), "r", encoding="utf-8") as f:
        return f.read()

@app.get("/student", response_class=HTMLResponse)
def student_page():
    with open(os.path.join(os.path.dirname(__file__), "templates", "student.html"), "r", encoding="utf-8") as f:
        return f.read()

@app.get("/dashboard", response_class=HTMLResponse)
def dashboard_page():
    with open(os.path.join(os.path.dirname(__file__), "templates", "dashboard.html"), "r", encoding="utf-8") as f:
        return f.read()

# --- API Endpoints ---

@app.post("/api/login")
def login(req: LoginRequest):
    if req.role == "faculty":
        user = database.get_faculty_by_email(req.username)
        if not user or user["password"] != req.password:
            raise HTTPException(status_code=401, detail="Invalid Faculty credentials. Use alan@cs.edu / faculty123")
        return {"status": "success", "role": "faculty", "user": {
            "id": user["id"], "name": user["name"], "email": user["email"],
            "department": user["department"], "designation": user["designation"]
        }}
    elif req.role == "student":
        user = database.get_student_by_credentials(req.username, req.password)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid Student credentials. Use Roll No: 2024CS101 / student123")
        return {"status": "success", "role": "student", "user": {
            "id": user["id"], "roll_no": user["roll_no"], "name": user["name"],
            "email": user["email"], "department": user["department"],
            "semester": user["semester"], "photo_url": user["photo_url"]
        }}
    else:
        raise HTTPException(status_code=400, detail="Invalid role specified")

@app.get("/api/students")
def get_students():
    """Returns all students for easy testing and switcher."""
    return database.get_all_students()

@app.get("/api/faculty/{faculty_id}/subjects")
def get_faculty_subjects(faculty_id: str):
    return database.get_faculty_subjects(faculty_id)

@app.post("/api/session/create")
def create_session_endpoint(req: CreateSessionRequest):
    session_id = f"SES-{uuid.uuid4().hex[:8].upper()}"
    database.create_session(
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
def get_session_qr(session_id: str, request: Request):
    """
    Returns dynamic QR code data. Auto-refreshes every 5 seconds.
    Validates 30-minute overall session expiry.
    """
    session = database.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    now = time.time()
    if session["status"] == "ended":
        return {"status": "ended", "message": "Attendance session has been ended by faculty."}
    
    if now > session["expires_at"]:
        database.end_session(session_id)
        return {"status": "expired", "message": "Attendance session expired (30-minute limit exceeded)."}

    # Generate 5-second dynamic rolling token
    token = qr_engine.generate_token(session_id)
    
    # Calculate remaining 30-minute session countdown
    remaining_seconds = max(0, int(session["expires_at"] - now))
    
    # Base URL for scan (can be opened by student)
    base_host = request.base_url
    scan_url = f"{str(base_host).rstrip('/')}/student?session_id={session_id}&token={token}"
    
    # Generate high-res QR code image data URI
    qr_image = qr_engine.generate_qr_image_base64(scan_url)
    
    # Get current attendee count
    records = database.get_session_attendance_records(session_id)
    
    # Time until current 5s token rotates
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
def get_session_status(session_id: str):
    session = database.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    now = time.time()
    is_expired = now > session["expires_at"] or session["status"] == "ended"
    remaining_seconds = max(0, int(session["expires_at"] - now))
    records = database.get_session_attendance_records(session_id)
    return {
        "session": session,
        "is_expired": is_expired,
        "remaining_seconds": remaining_seconds,
        "attendees_count": len(records)
    }

@app.post("/api/session/{session_id}/end")
def end_session_endpoint(session_id: str):
    database.end_session(session_id)
    return {"status": "success", "message": "Session closed."}

@app.get("/api/session/{session_id}/attendance")
def get_session_attendance(session_id: str):
    session = database.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    records = database.get_session_attendance_records(session_id)
    return {"session": session, "records": records, "count": len(records)}

@app.get("/api/faculty/{faculty_id}/attendance-records")
def get_faculty_records(faculty_id: str, subject_id: Optional[str] = None):
    records = database.get_faculty_attendance_records(faculty_id, subject_id)
    return {"records": records, "count": len(records)}

@app.get("/api/faculty/{faculty_id}/export-csv")
def export_attendance_csv(faculty_id: str, subject_id: Optional[str] = None):
    records = database.get_faculty_attendance_records(faculty_id, subject_id)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Record ID", "Subject Code", "Subject Name", "Classroom", "Roll Number",
        "Student Name", "Marked Timestamp", "GPS Distance (m)", "Face Match %", "Status"
    ])
    for r in records:
        writer.writerow([
            r.get("id"), r.get("subject_code"), r.get("subject_name"),
            r.get("classroom_name"), r.get("roll_no"), r.get("student_name"),
            r.get("marked_at"), f"{r.get('distance_meters')}m",
            f"{r.get('face_confidence')}%", r.get("verification_status")
        ])
    output.seek(0)
    filename = f"attendance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.post("/api/student/verify-attendance")
def verify_attendance(req: VerifyAttendanceRequest):
    """
    Main verification pipeline:
    1. Session active & 30-min expiry check
    2. Dynamic 5-second QR Token validation
    3. Single Attendance Check (reject if already marked)
    4. GPS Geo-fence verification (within classroom radius)
    5. AI-based Face Recognition against stored reference photo
    """
    # 1. Session check
    session = database.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session does not exist.")
    
    now = time.time()
    if session["status"] == "ended":
        raise HTTPException(status_code=400, detail="This attendance session has already been ended by the faculty.")
    
    if now > session["expires_at"]:
        database.end_session(req.session_id)
        raise HTTPException(status_code=400, detail="This QR code session has expired (30-minute limit reached). Please request the faculty for assistance.")

    # 2. Dynamic QR Token validation (5s rolling token with grace period)
    is_token_valid = qr_engine.validate_token(req.session_id, req.token, interval=5, tolerance_slots=3)
    if not is_token_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired QR token! QR codes refresh every 5 seconds. Please scan the current live QR code.")

    # 3. Student Check & Single Login/Attendance check per session
    student = database.get_student_by_id(req.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found in university records.")

    already_marked = database.has_student_marked_session(req.session_id, student["id"])
    if already_marked:
        raise HTTPException(
            status_code=400, 
            detail=f"Attendance already recorded! Student {student['name']} ({student['roll_no']}) has already marked attendance for this session. Single marking permitted."
        )

    # 4. GPS Verification
    distance = calculate_distance_meters(req.lat, req.lng, session["lat"], session["lng"])
    allowed_radius = session["allowed_radius_meters"]
    if distance > allowed_radius:
        raise HTTPException(
            status_code=400,
            detail=f"Location Verification Failed! You are {distance}m away from the classroom ({session['classroom_name']}). Maximum allowed distance is {allowed_radius}m. You must be physically inside the classroom."
        )

    # 5. AI Face Recognition
    ref_photo_url = student["photo_url"]
    is_face_matched, confidence, face_details = face_ai.verify_faces(req.live_image, ref_photo_url)
    
    if not is_face_matched or confidence < 70.0:
        raise HTTPException(
            status_code=400,
            detail=f"AI Face Recognition Failed! Match confidence was {confidence}% (Minimum required: 70%). Please look directly at the camera with clear lighting and remove any face coverings."
        )

    # Save live snapshot for faculty audit
    snapshot_filename = f"{req.session_id}_{student['id']}_{int(time.time())}.jpg"
    snapshot_full_path = os.path.join(SNAPSHOTS_DIR, snapshot_filename)
    try:
        pil_img = face_ai.base64_to_pil(req.live_image)
        pil_img.save(snapshot_full_path, "JPEG")
        snapshot_url = f"/static/snapshots/{snapshot_filename}"
    except Exception:
        snapshot_url = ""

    # Record attendance in database
    database.record_attendance(
        session_id=req.session_id,
        student_id=student["id"],
        subject_id=session["subject_id"],
        lat=req.lat,
        lng=req.lng,
        distance=distance,
        face_confidence=confidence,
        snapshot_path=snapshot_url
    )

    return {
        "status": "success",
        "message": f"Attendance verified & recorded successfully for {student['name']}!",
        "student_name": student["name"],
        "roll_no": student["roll_no"],
        "subject_name": session["subject_name"],
        "subject_code": session["subject_code"],
        "marked_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "gps_distance": distance,
        "face_confidence": confidence,
        "classroom_name": session["classroom_name"]
    }

@app.get("/api/student/{student_id}/dashboard")
def get_student_dashboard_endpoint(student_id: str):
    data = database.get_student_dashboard(student_id)
    if not data:
        raise HTTPException(status_code=404, detail="Student not found.")
    return data

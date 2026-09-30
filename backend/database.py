"""
database.py — Async PostgreSQL via Prisma Python Client
Replaces the old SQLite database.py
"""
import time
from datetime import datetime
from prisma import Prisma

# Singleton Prisma client
db = Prisma()

async def connect():
    if not db.is_connected():
        await db.connect()

async def disconnect():
    if db.is_connected():
        await db.disconnect()

# ─────────────────────────────────────────────
# SEED: Run once on startup if tables are empty
# ─────────────────────────────────────────────
async def seed_if_empty():
    faculty_count = await db.faculty.count()
    if faculty_count == 0:
        await db.faculty.create_many(data=[
            {"id": "FAC01", "name": "Dr. Alan Turing",    "email": "turing@cs.edu", "password": "faculty123", "department": "Computer Science & Engineering", "designation": "Professor & HOD"},
            {"id": "FAC02", "name": "Prof. Ada Lovelace", "email": "ada@cs.edu",    "password": "faculty123", "department": "Computer Science & Engineering", "designation": "Associate Professor"},
        ])

    student_count = await db.student.count()
    if student_count == 0:
        await db.student.create_many(data=[
            {"id": "STU101", "roll_no": "2024CS101", "name": "Rahul Verma",  "email": "rahul@student.edu", "password": "student123", "department": "Computer Science & Engineering", "semester": "Semester 6", "photo_url": "/static/images/students/rahul.jpg"},
            {"id": "STU102", "roll_no": "2024CS102", "name": "Priya Sharma", "email": "priya@student.edu", "password": "student123", "department": "Computer Science & Engineering", "semester": "Semester 6", "photo_url": "/static/images/students/priya.jpg"},
            {"id": "STU103", "roll_no": "2024CS103", "name": "Rohan Patel",  "email": "rohan@student.edu", "password": "student123", "department": "Computer Science & Engineering", "semester": "Semester 6", "photo_url": "/static/images/students/rohan.jpg"},
        ])

    subject_count = await db.subject.count()
    if subject_count == 0:
        await db.subject.create_many(data=[
            {"id": "CS301", "code": "CS301", "name": "Data Structures & Algorithms",       "faculty_id": "FAC01", "total_classes": 40},
            {"id": "CS302", "code": "CS302", "name": "Operating Systems",                   "faculty_id": "FAC01", "total_classes": 40},
            {"id": "CS303", "code": "CS303", "name": "Database Management Systems",         "faculty_id": "FAC01", "total_classes": 40},
            {"id": "CS304", "code": "CS304", "name": "Computer Networks",                   "faculty_id": "FAC02", "total_classes": 40},
            {"id": "AI401", "code": "AI401", "name": "Artificial Intelligence & Neural Nets","faculty_id": "FAC02", "total_classes": 40},
        ])

    ss_count = await db.studentsubject.count()
    if ss_count == 0:
        baseline = [
            # Rahul: CS302=62.5%(alert), CS304=70%(alert)
            {"student_id": "STU101", "subject_id": "CS301", "attended_classes": 34, "total_classes": 40},
            {"student_id": "STU101", "subject_id": "CS302", "attended_classes": 25, "total_classes": 40},
            {"student_id": "STU101", "subject_id": "CS303", "attended_classes": 32, "total_classes": 40},
            {"student_id": "STU101", "subject_id": "CS304", "attended_classes": 28, "total_classes": 40},
            {"student_id": "STU101", "subject_id": "AI401", "attended_classes": 36, "total_classes": 40},
            # Priya: CS304=67.5%(alert)
            {"student_id": "STU102", "subject_id": "CS301", "attended_classes": 37, "total_classes": 40},
            {"student_id": "STU102", "subject_id": "CS302", "attended_classes": 34, "total_classes": 40},
            {"student_id": "STU102", "subject_id": "CS303", "attended_classes": 35, "total_classes": 40},
            {"student_id": "STU102", "subject_id": "CS304", "attended_classes": 27, "total_classes": 40},
            {"student_id": "STU102", "subject_id": "AI401", "attended_classes": 38, "total_classes": 40},
            # Rohan: CS301=72.5%(alert), AI401=65%(alert)
            {"student_id": "STU103", "subject_id": "CS301", "attended_classes": 29, "total_classes": 40},
            {"student_id": "STU103", "subject_id": "CS302", "attended_classes": 31, "total_classes": 40},
            {"student_id": "STU103", "subject_id": "CS303", "attended_classes": 33, "total_classes": 40},
            {"student_id": "STU103", "subject_id": "CS304", "attended_classes": 34, "total_classes": 40},
            {"student_id": "STU103", "subject_id": "AI401", "attended_classes": 26, "total_classes": 40},
        ]
        await db.studentsubject.create_many(data=baseline)

# ─────────────────────────────────────────────
# FACULTY QUERIES
# ─────────────────────────────────────────────
async def get_faculty_by_email(email: str):
    """Supports both email variants used in README (alan@cs.edu / turing@cs.edu)"""
    email_map = {"alan@cs.edu": "turing@cs.edu"}
    lookup = email_map.get(email, email)
    row = await db.faculty.find_first(where={"email": lookup})
    return row

async def get_faculty_by_id(faculty_id: str):
    return await db.faculty.find_unique(where={"id": faculty_id})

async def get_faculty_subjects(faculty_id: str):
    rows = await db.subject.find_many(
        where={"faculty_id": faculty_id},
        order={"code": "asc"}
    )
    return [{"id": r.id, "code": r.code, "name": r.name, "faculty_id": r.faculty_id, "total_classes": r.total_classes} for r in rows]

# ─────────────────────────────────────────────
# STUDENT QUERIES
# ─────────────────────────────────────────────
async def get_student_by_credentials(identifier: str, password: str):
    row = await db.student.find_first(
        where={"OR": [{"roll_no": identifier}, {"email": identifier}], "password": password}
    )
    return row

async def get_student_by_id(student_id: str):
    row = await db.student.find_first(
        where={"OR": [{"id": student_id}, {"roll_no": student_id}]}
    )
    return row

async def get_all_students():
    rows = await db.student.find_many(order={"roll_no": "asc"})
    return [{"id": r.id, "roll_no": r.roll_no, "name": r.name, "email": r.email,
             "department": r.department, "semester": r.semester, "photo_url": r.photo_url} for r in rows]

# ─────────────────────────────────────────────
# SESSION QUERIES
# ─────────────────────────────────────────────
async def create_session(session_id, subject_id, faculty_id, classroom_name, lat, lng, radius=100.0, duration_minutes=30):
    now = time.time()
    expires_at = now + (duration_minutes * 60)
    await db.session.create(data={
        "id": session_id,
        "subject_id": subject_id,
        "faculty_id": faculty_id,
        "classroom_name": classroom_name,
        "lat": lat,
        "lng": lng,
        "allowed_radius_meters": radius,
        "created_at": now,
        "expires_at": expires_at,
        "status": "active"
    })

async def get_session(session_id: str):
    row = await db.session.find_unique(
        where={"id": session_id},
        include={"subject": True, "faculty": True}
    )
    if not row:
        return None
    return {
        "id": row.id,
        "subject_id": row.subject_id,
        "faculty_id": row.faculty_id,
        "classroom_name": row.classroom_name,
        "lat": row.lat,
        "lng": row.lng,
        "allowed_radius_meters": row.allowed_radius_meters,
        "created_at": row.created_at,
        "expires_at": row.expires_at,
        "status": row.status,
        "subject_name": row.subject.name if row.subject else "",
        "subject_code": row.subject.code if row.subject else "",
        "faculty_name": row.faculty.name if row.faculty else "",
    }

async def end_session(session_id: str):
    await db.session.update(where={"id": session_id}, data={"status": "ended"})

# ─────────────────────────────────────────────
# ATTENDANCE QUERIES
# ─────────────────────────────────────────────
async def has_student_marked_session(session_id: str, student_id: str) -> bool:
    row = await db.attendancelog.find_first(
        where={"session_id": session_id, "student_id": student_id}
    )
    return row is not None

async def record_attendance(session_id, student_id, subject_id, lat, lng, distance, face_confidence, snapshot_path):
    marked_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    await db.attendancelog.create(data={
        "session_id": session_id,
        "student_id": student_id,
        "subject_id": subject_id,
        "marked_at": marked_at,
        "gps_lat": lat,
        "gps_lng": lng,
        "distance_meters": distance,
        "face_confidence": face_confidence,
        "verification_status": "VERIFIED",
        "snapshot_path": snapshot_path or ""
    })
    # Increment attended + total for this student/subject
    await db.studentsubject.update(
        where={"student_id_subject_id": {"student_id": student_id, "subject_id": subject_id}},
        data={"attended_classes": {"increment": 1}, "total_classes": {"increment": 1}}
    )
    # Increment total_classes for other students enrolled in the same subject
    await db.studentsubject.update_many(
        where={"subject_id": subject_id, "NOT": {"student_id": student_id}},
        data={"total_classes": {"increment": 1}}
    )

async def get_session_attendance_records(session_id: str):
    rows = await db.attendancelog.find_many(
        where={"session_id": session_id},
        include={"student": True},
        order={"marked_at": "desc"}
    )
    return [{
        "id": r.id,
        "session_id": r.session_id,
        "student_id": r.student_id,
        "subject_id": r.subject_id,
        "marked_at": r.marked_at,
        "gps_lat": r.gps_lat,
        "gps_lng": r.gps_lng,
        "distance_meters": r.distance_meters,
        "face_confidence": r.face_confidence,
        "verification_status": r.verification_status,
        "snapshot_path": r.snapshot_path,
        "student_name": r.student.name if r.student else "",
        "roll_no": r.student.roll_no if r.student else "",
        "photo_url": r.student.photo_url if r.student else "",
    } for r in rows]

async def get_faculty_attendance_records(faculty_id: str, subject_id: str = None):
    where = {"session": {"faculty_id": faculty_id}}
    if subject_id and subject_id != "ALL":
        where["subject_id"] = subject_id
    rows = await db.attendancelog.find_many(
        where=where,
        include={"student": True, "subject": True, "session": True},
        order={"marked_at": "desc"}
    )
    return [{
        "id": r.id,
        "subject_code": r.subject.code if r.subject else "",
        "subject_name": r.subject.name if r.subject else "",
        "classroom_name": r.session.classroom_name if r.session else "",
        "roll_no": r.student.roll_no if r.student else "",
        "student_name": r.student.name if r.student else "",
        "marked_at": r.marked_at,
        "distance_meters": r.distance_meters,
        "face_confidence": r.face_confidence,
        "verification_status": r.verification_status,
    } for r in rows]

async def get_student_dashboard(student_id: str):
    student = await db.student.find_first(
        where={"OR": [{"id": student_id}, {"roll_no": student_id}]}
    )
    if not student:
        return None

    ss_rows = await db.studentsubject.find_many(
        where={"student_id": student.id},
        include={"subject": {"include": {"faculty": True}}},
        order={"subject": {"code": "asc"}}
    )

    subjects_data = []
    total_attended = 0
    total_held = 0
    low_attendance_alerts = []

    for ss in ss_rows:
        attended = ss.attended_classes
        total = ss.total_classes if ss.total_classes > 0 else 1
        percentage = round((attended / total) * 100, 1)
        total_attended += attended
        total_held += total
        needed_to_75 = max(0, 3 * total - 4 * attended)
        is_low = percentage < 75.0

        if is_low:
            low_attendance_alerts.append({
                "subject_code": ss.subject.code,
                "subject_name": ss.subject.name,
                "percentage": percentage,
                "needed_classes": needed_to_75
            })

        subjects_data.append({
            "id": ss.subject.id,
            "code": ss.subject.code,
            "name": ss.subject.name,
            "faculty_name": ss.subject.faculty.name if ss.subject.faculty else "",
            "attended": attended,
            "total": total,
            "absent": total - attended,
            "percentage": percentage,
            "is_low": is_low,
            "needed_to_75": needed_to_75
        })

    overall_percentage = round((total_attended / total_held * 100), 1) if total_held > 0 else 0

    recent_rows = await db.attendancelog.find_many(
        where={"student_id": student.id},
        include={"subject": True, "session": True},
        order={"marked_at": "desc"},
        take=10
    )
    recent_activity = [{
        "id": r.id,
        "subject_name": r.subject.name if r.subject else "",
        "subject_code": r.subject.code if r.subject else "",
        "classroom_name": r.session.classroom_name if r.session else "",
        "marked_at": r.marked_at,
        "distance_meters": r.distance_meters,
        "face_confidence": r.face_confidence,
        "verification_status": r.verification_status,
    } for r in recent_rows]

    return {
        "student": {"id": student.id, "roll_no": student.roll_no, "name": student.name,
                    "email": student.email, "department": student.department,
                    "semester": student.semester, "photo_url": student.photo_url},
        "overall_percentage": overall_percentage,
        "total_attended": total_attended,
        "total_held": total_held,
        "subjects": subjects_data,
        "has_low_attendance": len(low_attendance_alerts) > 0,
        "low_attendance_alerts": low_attendance_alerts,
        "recent_activity": recent_activity
    }

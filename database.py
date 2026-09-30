import sqlite3
import os
import json
import time
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "attendance.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Faculty table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS faculty (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        department TEXT NOT NULL,
        designation TEXT NOT NULL
    )
    """)

    # Students table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        roll_no TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        department TEXT NOT NULL,
        semester TEXT NOT NULL,
        photo_url TEXT NOT NULL
    )
    """)

    # Subjects table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        faculty_id TEXT NOT NULL,
        total_classes INTEGER DEFAULT 40,
        FOREIGN KEY(faculty_id) REFERENCES faculty(id)
    )
    """)

    # Student-Subject initial attendance baseline table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS student_subjects (
        student_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        attended_classes INTEGER DEFAULT 0,
        total_classes INTEGER DEFAULT 40,
        PRIMARY KEY (student_id, subject_id),
        FOREIGN KEY(student_id) REFERENCES students(id),
        FOREIGN KEY(subject_id) REFERENCES subjects(id)
    )
    """)

    # Attendance Sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL,
        faculty_id TEXT NOT NULL,
        classroom_name TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        allowed_radius_meters REAL DEFAULT 100.0,
        created_at REAL NOT NULL,
        expires_at REAL NOT NULL,
        status TEXT DEFAULT 'active',
        FOREIGN KEY(subject_id) REFERENCES subjects(id),
        FOREIGN KEY(faculty_id) REFERENCES faculty(id)
    )
    """)

    # Attendance Logs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendance_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        marked_at TEXT NOT NULL,
        gps_lat REAL NOT NULL,
        gps_lng REAL NOT NULL,
        distance_meters REAL NOT NULL,
        face_confidence REAL NOT NULL,
        verification_status TEXT DEFAULT 'VERIFIED',
        snapshot_path TEXT,
        FOREIGN KEY(session_id) REFERENCES sessions(id),
        FOREIGN KEY(student_id) REFERENCES students(id),
        FOREIGN KEY(subject_id) REFERENCES subjects(id),
        UNIQUE(session_id, student_id)
    )
    """)

    # Seed Initial Data if empty
    cursor.execute("SELECT COUNT(*) as count FROM faculty")
    if cursor.fetchone()["count"] == 0:
        cursor.execute("""
        INSERT INTO faculty (id, name, email, password, department, designation)
        VALUES 
        ('FAC01', 'Dr. Alan Turing', 'turing@cs.edu', 'faculty123', 'Computer Science & Engineering', 'Professor & HOD'),
        ('FAC02', 'Prof. Ada Lovelace', 'ada@cs.edu', 'faculty123', 'Computer Science & Engineering', 'Associate Professor')
        """)

    cursor.execute("SELECT COUNT(*) as count FROM students")
    if cursor.fetchone()["count"] == 0:
        cursor.execute("""
        INSERT INTO students (id, roll_no, name, email, password, department, semester, photo_url)
        VALUES 
        ('STU101', '2024CS101', 'Rahul Verma', 'rahul@student.edu', 'student123', 'Computer Science & Engineering', 'Semester 6', '/static/images/students/rahul.jpg'),
        ('STU102', '2024CS102', 'Priya Sharma', 'priya@student.edu', 'student123', 'Computer Science & Engineering', 'Semester 6', '/static/images/students/priya.jpg'),
        ('STU103', '2024CS103', 'Rohan Patel', 'rohan@student.edu', 'student123', 'Computer Science & Engineering', 'Semester 6', '/static/images/students/rohan.jpg')
        """)

    cursor.execute("SELECT COUNT(*) as count FROM subjects")
    if cursor.fetchone()["count"] == 0:
        cursor.execute("""
        INSERT INTO subjects (id, code, name, faculty_id, total_classes)
        VALUES 
        ('CS301', 'CS301', 'Data Structures & Algorithms', 'FAC01', 40),
        ('CS302', 'CS302', 'Operating Systems', 'FAC01', 40),
        ('CS303', 'CS303', 'Database Management Systems', 'FAC01', 40),
        ('CS304', 'CS304', 'Computer Networks', 'FAC02', 40),
        ('AI401', 'AI401', 'Artificial Intelligence & Neural Nets', 'FAC02', 40)
        """)

    cursor.execute("SELECT COUNT(*) as count FROM student_subjects")
    if cursor.fetchone()["count"] == 0:
        # Prepopulate student subjects with varied attendance to demonstrate <75% warnings
        # Rahul Verma: CS301 (85%), CS302 (62.5% - ALERT!), CS303 (80%), CS304 (70% - ALERT!), AI401 (90%)
        # Priya Sharma: CS301 (92%), CS302 (85%), CS303 (87%), CS304 (67.5% - ALERT!), AI401 (95%)
        # Rohan Patel: CS301 (72.5% - ALERT!), CS302 (77.5%), CS303 (82.5%), CS304 (85%), AI401 (65% - ALERT!)
        baseline = [
            # Rahul
            ('STU101', 'CS301', 34, 40),
            ('STU101', 'CS302', 25, 40), # 62.5% -> Alert
            ('STU101', 'CS303', 32, 40),
            ('STU101', 'CS304', 28, 40), # 70.0% -> Alert
            ('STU101', 'AI401', 36, 40),
            # Priya
            ('STU102', 'CS301', 37, 40),
            ('STU102', 'CS302', 34, 40),
            ('STU102', 'CS303', 35, 40),
            ('STU102', 'CS304', 27, 40), # 67.5% -> Alert
            ('STU102', 'AI401', 38, 40),
            # Rohan
            ('STU103', 'CS301', 29, 40), # 72.5% -> Alert
            ('STU103', 'CS302', 31, 40),
            ('STU103', 'CS303', 33, 40),
            ('STU103', 'CS304', 34, 40),
            ('STU103', 'AI401', 26, 40), # 65.0% -> Alert
        ]
        cursor.executemany("INSERT INTO student_subjects (student_id, subject_id, attended_classes, total_classes) VALUES (?, ?, ?, ?)", baseline)

    conn.commit()
    conn.close()

# Helper queries
def get_faculty_by_email(email):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM faculty 
    WHERE email = ? OR id = ? OR email = 'turing@cs.edu' AND ? IN ('alan@cs.edu', 'turing@cs.edu', 'FAC01')
    """, (email, email, email))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_faculty_by_id(faculty_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM faculty WHERE id = ?", (faculty_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_student_by_credentials(identifier, password):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM students WHERE (roll_no = ? OR email = ?) AND password = ?", (identifier, identifier, password))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_student_by_id(student_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM students WHERE id = ? OR roll_no = ?", (student_id, student_id))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_all_students():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, roll_no, name, email, department, semester, photo_url FROM students ORDER BY roll_no ASC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_faculty_subjects(faculty_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM subjects WHERE faculty_id = ? ORDER BY code ASC", (faculty_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_subject_by_id(subject_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT s.*, f.name as faculty_name FROM subjects s JOIN faculty f ON s.faculty_id = f.id WHERE s.id = ?", (subject_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def create_session(session_id, subject_id, faculty_id, classroom_name, lat, lng, radius=100.0, duration_minutes=30):
    conn = get_db()
    cursor = conn.cursor()
    now = time.time()
    expires_at = now + (duration_minutes * 60)
    cursor.execute("""
    INSERT INTO sessions (id, subject_id, faculty_id, classroom_name, lat, lng, allowed_radius_meters, created_at, expires_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    """, (session_id, subject_id, faculty_id, classroom_name, lat, lng, radius, now, expires_at))
    conn.commit()
    conn.close()

def get_session(session_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT s.*, sub.name as subject_name, sub.code as subject_code, f.name as faculty_name
    FROM sessions s
    JOIN subjects sub ON s.subject_id = sub.id
    JOIN faculty f ON s.faculty_id = f.id
    WHERE s.id = ?
    """, (session_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def end_session(session_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE sessions SET status = 'ended' WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()

def has_student_marked_session(session_id, student_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM attendance_logs WHERE session_id = ? AND student_id = ?", (session_id, student_id))
    row = cursor.fetchone()
    conn.close()
    return row is not None

def record_attendance(session_id, student_id, subject_id, lat, lng, distance, face_confidence, snapshot_path):
    conn = get_db()
    cursor = conn.cursor()
    marked_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
    INSERT INTO attendance_logs (session_id, student_id, subject_id, marked_at, gps_lat, gps_lng, distance_meters, face_confidence, verification_status, snapshot_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED', ?)
    """, (session_id, student_id, subject_id, marked_at, lat, lng, distance, face_confidence, snapshot_path))

    # Increment student_subjects attendance record
    cursor.execute("""
    UPDATE student_subjects 
    SET attended_classes = attended_classes + 1, total_classes = total_classes + 1
    WHERE student_id = ? AND subject_id = ?
    """, (student_id, subject_id))

    # Also update other enrolled students' total_classes for this subject if not attended
    cursor.execute("""
    UPDATE student_subjects
    SET total_classes = total_classes + 1
    WHERE student_id != ? AND subject_id = ?
    """, (student_id, subject_id))

    conn.commit()
    conn.close()

def get_session_attendance_records(session_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT a.*, s.name as student_name, s.roll_no, s.photo_url
    FROM attendance_logs a
    JOIN students s ON a.student_id = s.id
    WHERE a.session_id = ?
    ORDER BY a.marked_at DESC
    """, (session_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_faculty_attendance_records(faculty_id, subject_id=None):
    conn = get_db()
    cursor = conn.cursor()
    if subject_id and subject_id != 'ALL':
        cursor.execute("""
        SELECT a.*, s.name as student_name, s.roll_no, sub.name as subject_name, sub.code as subject_code, sess.classroom_name
        FROM attendance_logs a
        JOIN students s ON a.student_id = s.id
        JOIN subjects sub ON a.subject_id = sub.id
        JOIN sessions sess ON a.session_id = sess.id
        WHERE sess.faculty_id = ? AND a.subject_id = ?
        ORDER BY a.marked_at DESC
        """, (faculty_id, subject_id))
    else:
        cursor.execute("""
        SELECT a.*, s.name as student_name, s.roll_no, sub.name as subject_name, sub.code as subject_code, sess.classroom_name
        FROM attendance_logs a
        JOIN students s ON a.student_id = s.id
        JOIN subjects sub ON a.subject_id = sub.id
        JOIN sessions sess ON a.session_id = sess.id
        WHERE sess.faculty_id = ?
        ORDER BY a.marked_at DESC
        """, (faculty_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_student_dashboard(student_id):
    conn = get_db()
    cursor = conn.cursor()
    
    # Student profile
    cursor.execute("SELECT id, roll_no, name, email, department, semester, photo_url FROM students WHERE id = ?", (student_id,))
    student_row = cursor.fetchone()
    if not student_row:
        conn.close()
        return None
    student = dict(student_row)

    # Subject-wise attendance percentages
    cursor.execute("""
    SELECT sub.id, sub.code, sub.name, f.name as faculty_name, ss.attended_classes, ss.total_classes
    FROM student_subjects ss
    JOIN subjects sub ON ss.subject_id = sub.id
    JOIN faculty f ON sub.faculty_id = f.id
    WHERE ss.student_id = ?
    ORDER BY sub.code ASC
    """, (student_id,))
    subject_rows = cursor.fetchall()
    
    subjects_data = []
    total_attended = 0
    total_held = 0
    low_attendance_alerts = []

    for row in subject_rows:
        attended = row["attended_classes"]
        total = row["total_classes"] if row["total_classes"] > 0 else 1
        percentage = round((attended / total) * 100, 1)
        total_attended += attended
        total_held += total

        # Required classes calculation to hit 75%
        # Formula: (attended + x) / (total + x) >= 0.75  =>  x >= 3*total - 4*attended
        needed_to_75 = max(0, 3 * total - 4 * attended)
        
        is_low = percentage < 75.0
        if is_low:
            low_attendance_alerts.append({
                "subject_code": row["code"],
                "subject_name": row["name"],
                "percentage": percentage,
                "needed_classes": needed_to_75
            })

        subjects_data.append({
            "id": row["id"],
            "code": row["code"],
            "name": row["name"],
            "faculty_name": row["faculty_name"],
            "attended": attended,
            "total": total,
            "absent": total - attended,
            "percentage": percentage,
            "is_low": is_low,
            "needed_to_75": needed_to_75
        })

    overall_percentage = round((total_attended / total_held * 100), 1) if total_held > 0 else 0

    # Recent Attendance Activity
    cursor.execute("""
    SELECT a.*, sub.name as subject_name, sub.code as subject_code, sess.classroom_name
    FROM attendance_logs a
    JOIN subjects sub ON a.subject_id = sub.id
    JOIN sessions sess ON a.session_id = sess.id
    WHERE a.student_id = ?
    ORDER BY a.marked_at DESC
    LIMIT 10
    """, (student_id,))
    recent_activity = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return {
        "student": student,
        "overall_percentage": overall_percentage,
        "total_attended": total_attended,
        "total_held": total_held,
        "subjects": subjects_data,
        "has_low_attendance": len(low_attendance_alerts) > 0,
        "low_attendance_alerts": low_attendance_alerts,
        "recent_activity": recent_activity
    }

# SmartPresence AI — Anti-Proxy Dynamic Attendance Monitoring System

A full-stack, secure university attendance monitoring system built with **FastAPI**, **SQLite**, **OpenCV 5.0 AI Facial Recognition**, and **HTML5/Vanilla CSS/JavaScript Glassmorphism Design**.

---

## 🌟 Key Features

### 1. 👨‍🏫 Faculty Portal (`/faculty`)
- **Subject Selection**: Faculty selects lecture course (e.g., Data Structures, Operating Systems, DBMS).
- **Dynamic 5-Second QR Code**:
  - Automatically regenerates every 5 seconds with a cryptographically signed HMAC rolling token.
  - Mitigates photo-sharing proxies via WhatsApp/messaging apps.
- **30-Minute Automatic Expiry**:
  - Sessions automatically expire 30 minutes after launch.
  - Live animated SVG circular countdown for 5-second rotation and 30-minute session progress bar.
- **Shareable Working QR & Scan Link**:
  - High-resolution dynamic QR code image displayed on screen.
  - "Copy Student Scan Link" button.
  - "Open Student Portal in New Tab" button for immediate same-device testing.
- **Real-Time Attendance Audit Table**:
  - Live real-time feed of attendees as they mark attendance.
  - Shows Roll No, Name, Student Photo, Timestamp, GPS distance from classroom, and AI biometric match confidence %.
  - One-click **Export to CSV Report**.

---

### 2. 📱 Student Attendance Verification (`/student`)
- **QR Code Ingestion**:
  - Ingests `session_id` and `token` from QR code scan or direct URL parameter.
- **Anti-Proxy Triad Verification**:
  1. **Live GPS Location Geofencing**:
     - Reads student's current GPS position via HTML5 Geolocation API.
     - Calculates Haversine distance to target classroom coordinates.
     - Enforces student to be physically inside the classroom boundary (≤ 100 meters).
     - Includes testing simulators ("Inside Classroom 12m" and "Outside Hostel 550m") for instant verification without needing to travel.
  2. **Camera Access & Live Biometric Snapshot**:
     - Accesses webcam/front camera with facial alignment oval guide and scanning laser line.
     - Captures live snapshot for comparison and audit logs.
  3. **OpenCV AI Face Recognition**:
     - Compares live selfie against student's registered photo using OpenCV 5.0 Normalized Cross-Correlation and multi-channel histogram intersection.
     - Requires ≥ 70% confidence score for verification.
- **Single Attendance Constraint**:
  - Each student can mark attendance only once per session. Repeated attempts are strictly blocked.

---

### 3. 📊 Student Dashboard (`/dashboard`)
- **Subject-wise Attendance Percentages**:
  - Visual cards with color-coded progress bars (Green ≥ 75%, Amber/Red < 75%).
  - Shows attended classes, total classes held, and absent classes.
- **⚠️ Mandatory 75% Attendance Alert Banner**:
  - If attendance in any subject is `< 75%`, prominently displays:
    > `⚠️ Attendance below 75%, must attend classes.`
  - Lists the affected courses and calculates the exact number of consecutive classes required to reach 75%.
- **Recent Attendance History Table**:
  - Audit log showing timestamps, classroom, and AI verification details.
- **Student Profile Switcher**:
  - Fast dropdown to inspect different student profiles (Rahul, Priya, Rohan).

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.10+ (Tested on Python 3.14)
- Pip packages: `fastapi`, `uvicorn`, `opencv-python`, `numpy`, `qrcode`, `pillow`, `requests`

### 2. Launch the Application
```powershell
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
Open your browser at: **[http://127.0.0.1:8000/](http://127.0.0.1:8000/)**

---

## 🔑 Test Credentials

| Role | Name | Email / Roll No | Password | Notes |
|---|---|---|---|---|
| **Faculty** | Dr. Alan Turing | `alan@cs.edu` | `faculty123` | Professor & HOD (CS301, CS302, CS303) |
| **Faculty** | Prof. Ada Lovelace | `ada@cs.edu` | `faculty123` | Associate Professor (CS304, AI401) |
| **Student** | Rahul Verma | `2024CS101` | `student123` | Has 2 subjects < 75% (OS, Networks) |
| **Student** | Priya Sharma | `2024CS102` | `student123` | Has 1 subject < 75% (Networks) |
| **Student** | Rohan Patel | `2024CS103` | `student123` | Has 2 subjects < 75% (Data Structures, AI) |

---

## 📂 Project Architecture

```
Attendence/
├── main.py                     # FastAPI application endpoints & routing
├── database.py                 # SQLite database schema, seeding, and queries
├── qr_engine.py                # 5-second dynamic rolling token & QR generator
├── face_ai.py                  # OpenCV 5.0 AI face biometric verification engine
├── test_system.py              # Automated end-to-end API test suite
├── static/
│   ├── css/
│   │   └── style.css           # Glassmorphism UI design system & animations
│   ├── js/
│   │   ├── faculty.js          # QR auto-rotation, 30m timer & attendance feed
│   │   ├── student.js          # Stepper flow, GPS geofence, camera capture
│   │   └── dashboard.js        # Percentage calculation & <75% alert banners
│   ├── images/students/        # High-res reference ID photos for students
│   └── snapshots/              # Captured biometric snapshots from attendance
└── templates/
    ├── index.html              # Central landing & portal navigator
    ├── faculty.html            # Faculty portal & dynamic QR projector
    ├── student.html            # Multi-step student verification portal
    └── dashboard.html          # Student analytics & <75% attendance alerts
```

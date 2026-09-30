import requests
import base64

def run_tests():
    base_url = "http://127.0.0.1:8000"
    
    # 1. Faculty Login
    r = requests.post(f"{base_url}/api/login", json={"role": "faculty", "username": "alan@cs.edu", "password": "faculty123"})
    print("1. Faculty Login:", r.status_code, r.json()["user"]["name"])

    # 2. Get Faculty Subjects
    r = requests.get(f"{base_url}/api/faculty/FAC01/subjects")
    subs = r.json()
    print("2. Faculty Subjects:", len(subs), [s["code"] for s in subs])

    # 3. Create Session (30 min duration)
    r = requests.post(f"{base_url}/api/session/create", json={
        "faculty_id": "FAC01",
        "subject_id": "CS301",
        "classroom_name": "Room 402 - CS Block",
        "lat": 28.545000,
        "lng": 77.192600,
        "allowed_radius_meters": 100.0,
        "duration_minutes": 30
    })
    session_id = r.json()["session_id"]
    print("3. Created Session ID:", session_id)

    # 4. Get 5-second dynamic QR
    r = requests.get(f"{base_url}/api/session/{session_id}/qr")
    qr_data = r.json()
    token = qr_data["token"]
    print("4. Dynamic QR Status:", qr_data["status"], "Token:", token, "Token Expiry (s):", qr_data["token_expires_in"], "QR Image Bytes:", len(qr_data["qr_image"]))

    # 5. Verify Attendance (Rahul Verma - Inside Classroom + Face Match)
    img_b64 = "data:image/jpeg;base64," + base64.b64encode(open("static/images/students/rahul.jpg", "rb").read()).decode()
    r = requests.post(f"{base_url}/api/student/verify-attendance", json={
        "session_id": session_id,
        "token": token,
        "student_id": "STU101",
        "lat": 28.545080, # ~10 meters away
        "lng": 77.192650,
        "live_image": img_b64
    })
    print("5. Attendance Verification:", r.status_code, r.json().get("message"), "Face Confidence:", r.json().get("face_confidence"))

    # 6. Single Attendance Constraint Check (Duplicate attempt should be rejected!)
    r_dup = requests.post(f"{base_url}/api/student/verify-attendance", json={
        "session_id": session_id,
        "token": token,
        "student_id": "STU101",
        "lat": 28.545080,
        "lng": 77.192650,
        "live_image": img_b64
    })
    print("6. Duplicate Attendance Rejection:", r_dup.status_code, r_dup.json().get("detail"))

    # 7. GPS Geofence Rejection Check (Student 2 attempts to mark from 800m away)
    r_gps = requests.post(f"{base_url}/api/student/verify-attendance", json={
        "session_id": session_id,
        "token": token,
        "student_id": "STU102",
        "lat": 28.555000, # ~1100m away
        "lng": 77.200000,
        "live_image": img_b64
    })
    print("7. Geofence Rejection (>100m):", r_gps.status_code, r_gps.json().get("detail"))

    # 8. Student Dashboard Check (<75% alert message verification)
    r_dash = requests.get(f"{base_url}/api/student/STU101/dashboard")
    dash = r_dash.json()
    print("8. Student Dashboard:", dash["student"]["name"])
    print("   Overall %:", dash["overall_percentage"])
    print("   Has Low Attendance Alert (<75%):", dash["has_low_attendance"])
    for alert in dash["low_attendance_alerts"]:
        print(f"   -> ⚠️ Alert: {alert['subject_code']} is at {alert['percentage']}% (Need {alert['needed_classes']} consecutive classes)")

if __name__ == "__main__":
    run_tests()

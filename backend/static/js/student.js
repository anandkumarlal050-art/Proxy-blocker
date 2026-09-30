// Student Attendance Verification Script
let currentStudent = null;
let currentSession = null;
let currentSessionId = '';
let currentToken = '';

let classroomLat = 28.5450;
let classroomLng = 77.1926;
let classroomRadius = 100.0;

let studentLat = null;
let studentLng = null;
let calculatedDistance = null;
let isGpsVerified = false;

let videoStream = null;
let capturedSnapshotBase64 = null;

// Toast helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  const icon = type === 'success' ? '✅' : (type === 'danger' ? '❌' : (type === 'warning' ? '⚠️' : 'ℹ️'));
  toast.innerHTML = `<span style="font-size: 1.2rem;">${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Haversine formula on client
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

document.addEventListener('DOMContentLoaded', () => {
  parseUrlParams();
  setupEventListeners();
  loadSavedStudentAuth();
});

// Parse session_id and token from URL parameters
function parseUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const sId = params.get('session_id');
  const tok = params.get('token');

  if (sId) {
    currentSessionId = sId;
    document.getElementById('input-session-id').value = sId;
    fetchSessionDetails(sId);
  }
  if (tok) {
    currentToken = tok;
    document.getElementById('input-token').value = tok;
  }
}

// Fetch session metadata
async function fetchSessionDetails(sessionId) {
  try {
    const res = await fetch(`/api/session/${sessionId}/status`);
    if (!res.ok) throw new Error('Session not found or expired');
    const data = await res.json();
    currentSession = data.session;

    document.getElementById('banner-subject').textContent = `${currentSession.subject_code} - ${currentSession.subject_name}`;
    document.getElementById('banner-session-id').textContent = `Session: ${currentSession.id} • ${currentSession.classroom_name}`;
    
    classroomLat = currentSession.lat;
    classroomLng = currentSession.lng;
    classroomRadius = currentSession.allowed_radius_meters;

    document.getElementById('target-classroom-name').textContent = currentSession.classroom_name;
    document.getElementById('target-coords-text').textContent = `Lat: ${classroomLat.toFixed(6)}, Lng: ${classroomLng.toFixed(6)}`;
    document.getElementById('allowed-radius-text').textContent = `Within ${classroomRadius} meters`;

    if (data.is_expired) {
      document.getElementById('session-status-badge').className = 'badge badge-danger';
      document.getElementById('session-status-badge').textContent = 'Session Expired';
      showToast('This attendance session has expired or ended.', 'danger');
    }
  } catch (err) {
    document.getElementById('banner-subject').textContent = 'Manual Attendance Session';
    document.getElementById('banner-session-id').textContent = `Session ID: ${sessionId}`;
  }
}

function loadSavedStudentAuth() {
  const saved = localStorage.getItem('student_user');
  if (saved) {
    try {
      const student = JSON.parse(saved);
      document.getElementById('student-roll').value = student.roll_no;
    } catch (e) {}
  }
}

function setStep(stepNum) {
  for (let i = 1; i <= 4; i++) {
    const section = document.getElementById(`step-section-${i}`);
    const navItem = document.getElementById(`step-nav-${i}`);
    if (section) section.style.display = i === stepNum ? 'block' : 'none';
    if (navItem) {
      navItem.classList.remove('active', 'completed');
      if (i === stepNum) navItem.classList.add('active');
      else if (i < stepNum) navItem.classList.add('completed');
    }
  }
}

function setupEventListeners() {
  // 1-Click Fast Student Selector
  document.querySelectorAll('.quick-student-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const roll = btn.getAttribute('data-roll');
      document.getElementById('student-roll').value = roll;
      document.getElementById('student-password').value = 'student123';
      showToast(`Selected student: ${btn.getAttribute('data-name')} (${roll})`, 'info');
    });
  });

  // Step 1 Form Submit (Student Login)
  document.getElementById('student-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const roll = document.getElementById('student-roll').value.trim();
    const password = document.getElementById('student-password').value.trim();
    currentSessionId = document.getElementById('input-session-id').value.trim();
    currentToken = document.getElementById('input-token').value.trim();

    if (!currentSessionId || !currentToken) {
      showToast('Session ID and QR Token are required. Please scan the QR code.', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'student', username: roll, password: password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');

      currentStudent = data.user;
      localStorage.setItem('student_user', JSON.stringify(currentStudent));
      
      // Update Step 3 reference photo
      document.getElementById('ref-student-photo').src = currentStudent.photo_url;
      document.getElementById('ref-student-name').textContent = `${currentStudent.name} (${currentStudent.roll_no})`;

      showToast(`Signed in as ${currentStudent.name}`, 'success');

      // Check session status if not already loaded
      if (!currentSession) {
        await fetchSessionDetails(currentSessionId);
      }

      // Advance to Step 2 (GPS)
      setStep(2);
      detectStudentGps();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // Step 2: Back to Step 1
  document.getElementById('back-to-step1-btn').addEventListener('click', () => {
    setStep(1);
  });

  // Step 2: Real GPS button
  document.getElementById('get-real-gps-btn').addEventListener('click', () => {
    detectStudentGps();
  });

  // Step 2: Simulate Inside GPS
  document.getElementById('simulate-inside-gps').addEventListener('click', () => {
    // Within 12 meters of classroom coordinates
    studentLat = classroomLat + 0.0001;
    studentLng = classroomLng + 0.0001;
    evaluateDistance(studentLat, studentLng, "Simulated Inside Classroom (Test Mode)");
  });

  // Step 2: Simulate Outside GPS
  document.getElementById('simulate-outside-gps').addEventListener('click', () => {
    // 550 meters away
    studentLat = classroomLat + 0.005;
    studentLng = classroomLng + 0.005;
    evaluateDistance(studentLat, studentLng, "Simulated Outside Classroom (Hostel/Off-Campus)");
  });

  // Step 2: Proceed to Face Scan
  document.getElementById('proceed-to-face-btn').addEventListener('click', () => {
    if (!isGpsVerified) {
      showToast('GPS verification required before scanning face.', 'warning');
      return;
    }
    setStep(3);
    startCamera();
  });

  // Step 3: Back to Step 2
  document.getElementById('back-to-step2-btn').addEventListener('click', () => {
    stopCamera();
    setStep(2);
  });

  // Step 3: Camera controls
  document.getElementById('start-camera-btn').addEventListener('click', () => {
    startCamera();
  });

  document.getElementById('capture-photo-btn').addEventListener('click', () => {
    captureSnapshot();
  });

  document.getElementById('use-sample-face-btn').addEventListener('click', () => {
    autoFillSampleFace();
  });

  // Step 3: Submit Verification & Record Attendance
  document.getElementById('submit-verification-btn').addEventListener('click', async () => {
    if (!capturedSnapshotBase64) {
      showToast('Please capture your live face photo first.', 'warning');
      return;
    }

    const submitBtn = document.getElementById('submit-verification-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '🔄 Running AI Face Recognition...';

    try {
      const payload = {
        session_id: currentSessionId,
        token: currentToken,
        student_id: currentStudent.id,
        lat: studentLat,
        lng: studentLng,
        live_image: capturedSnapshotBase64
      };

      const res = await fetch('/api/student/verify-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Attendance verification failed');
      }

      // Success! Stop camera & advance to Step 4
      stopCamera();
      setStep(4);

      document.getElementById('success-student-name').textContent = `${data.student_name} (${data.roll_no})`;
      document.getElementById('success-subject').textContent = `${data.subject_code} - ${data.subject_name}`;
      document.getElementById('success-face-conf').textContent = `🤖 ${data.face_confidence}% Match (AI Verified)`;
      document.getElementById('success-gps-dist').textContent = `📍 ${data.gps_distance}m away (Inside Classroom)`;
      document.getElementById('success-timestamp').textContent = data.marked_at;

      showToast('Attendance recorded and verified successfully!', 'success');

    } catch (err) {
      showToast(err.message, 'danger');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '⚡ Verify Face & Record Attendance →';
    }
  });
}

// GPS Detection & Distance Evaluation
function detectStudentGps() {
  const coordsEl = document.getElementById('student-coords-text');
  const distEl = document.getElementById('distance-calc-text');
  const badgeContainer = document.getElementById('gps-status-badge-container');
  const proceedBtn = document.getElementById('proceed-to-face-btn');

  coordsEl.textContent = 'Requesting GPS access from browser...';
  badgeContainer.innerHTML = '<span class="badge badge-warning">Requesting GPS...</span>';
  proceedBtn.disabled = true;

  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        studentLat = pos.coords.latitude;
        studentLng = pos.coords.longitude;
        evaluateDistance(studentLat, studentLng, "Live GPS Device Sensor");
      },
      (err) => {
        coordsEl.textContent = 'GPS permission denied or unavailable.';
        distEl.innerHTML = '<span style="color: #f87171;">⚠️ Could not read GPS. You can click "Simulate Inside Classroom" below for test evaluation.</span>';
        badgeContainer.innerHTML = '<span class="badge badge-danger">GPS Unavailable</span>';
        showToast('GPS access denied. Use test simulator button below if needed.', 'warning');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  } else {
    coordsEl.textContent = 'Geolocation not supported in browser.';
  }
}

function evaluateDistance(lat, lng, sourceLabel) {
  const dist = calculateDistance(lat, lng, classroomLat, classroomLng);
  calculatedDistance = dist;

  const coordsEl = document.getElementById('student-coords-text');
  const distEl = document.getElementById('distance-calc-text');
  const badgeContainer = document.getElementById('gps-status-badge-container');
  const proceedBtn = document.getElementById('proceed-to-face-btn');

  coordsEl.textContent = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)} (${sourceLabel})`;

  if (dist <= classroomRadius) {
    isGpsVerified = true;
    distEl.innerHTML = `<span style="color: #34d399;">Distance: <strong>${dist} meters</strong> (Inside Classroom Geofence ≤ ${classroomRadius}m)</span>`;
    badgeContainer.innerHTML = '<span class="badge badge-success">✓ Geofence Verified</span>';
    proceedBtn.disabled = false;
    showToast(`GPS Verified: Inside classroom (${dist}m away)`, 'success');
  } else {
    isGpsVerified = false;
    distEl.innerHTML = `<span style="color: #f87171;">Distance: <strong>${dist} meters</strong> (Exceeds ${classroomRadius}m classroom boundary!)</span>`;
    badgeContainer.innerHTML = '<span class="badge badge-danger">✕ Outside Classroom</span>';
    proceedBtn.disabled = true;
    showToast(`Location Verification Failed! You are ${dist}m away from classroom.`, 'danger');
  }
}

// Camera Management
async function startCamera() {
  const video = document.getElementById('camera-feed');
  try {
    if (videoStream) {
      stopCamera();
    }
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
    });
    video.srcObject = videoStream;
    showToast('Device camera active. Position face in oval.', 'info');
  } catch (err) {
    console.warn('Camera access denied or unavailable:', err);
    showToast('Webcam unavailable. You can click "Auto-Fill Reference Face" for 1-click test evaluation.', 'warning');
  }
}

function stopCamera() {
  if (videoStream) {
    videoStream.getTracks().forEach(t => t.stop());
    videoStream = null;
  }
}

// Capture frame from video stream
function captureSnapshot() {
  const video = document.getElementById('camera-feed');
  const canvas = document.getElementById('hidden-canvas');
  if (!video || !video.videoWidth) {
    showToast('Camera is not active. Please click "Open Device Camera" or "Auto-Fill Reference Face".', 'warning');
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  capturedSnapshotBase64 = canvas.toDataURL('image/jpeg', 0.9);

  const preview = document.getElementById('captured-snapshot-preview');
  preview.src = capturedSnapshotBase64;
  preview.style.display = 'block';
  document.getElementById('snapshot-placeholder').style.display = 'none';
  document.getElementById('snapshot-status-text').textContent = '✅ Live Face Captured';

  document.getElementById('submit-verification-btn').disabled = false;
  showToast('Face snapshot captured! Click "Verify Face & Record Attendance".', 'success');
}

// 1-Click Auto-Fill Reference Face for testing without webcam
async function autoFillSampleFace() {
  if (!currentStudent) return;
  try {
    const res = await fetch(currentStudent.photo_url);
    const blob = await res.blob();
    const reader = new FileReader();
    reader.onloadend = () => {
      capturedSnapshotBase64 = reader.result;
      const preview = document.getElementById('captured-snapshot-preview');
      preview.src = capturedSnapshotBase64;
      preview.style.display = 'block';
      document.getElementById('snapshot-placeholder').style.display = 'none';
      document.getElementById('snapshot-status-text').textContent = '✅ Reference Face Loaded';
      document.getElementById('submit-verification-btn').disabled = false;
      showToast('Loaded registered face for testing AI verification.', 'success');
    };
    reader.readAsDataURL(blob);
  } catch (e) {
    showToast('Could not load sample face.', 'danger');
  }
}

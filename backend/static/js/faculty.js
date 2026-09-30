// Faculty Portal Management Script
let currentFaculty = null;
let activeSessionId = null;
let qrRefreshInterval = null;
let sessionTimerInterval = null;
let attendancePollInterval = null;
let currentRemainingSeconds = 1800;
let tokenSecondsLeft = 5;

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

// Format seconds into MM:SS
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

document.addEventListener('DOMContentLoaded', () => {
  initFacultyAuth();
  setupEventListeners();
});

function initFacultyAuth() {
  const stored = localStorage.getItem('faculty_user');
  if (stored) {
    try {
      currentFaculty = JSON.parse(stored);
      showDashboard();
      return;
    } catch (e) {
      localStorage.removeItem('faculty_user');
    }
  }
  showLogin();
}

function showLogin() {
  document.getElementById('login-section').style.display = 'block';
  document.getElementById('dashboard-section').style.display = 'none';
}

function showDashboard() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('dashboard-section').style.display = 'block';
  
  document.getElementById('faculty-name').textContent = currentFaculty.name;
  document.getElementById('faculty-dept').textContent = `${currentFaculty.department} • ${currentFaculty.designation || 'Faculty'}`;
  
  const initials = currentFaculty.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('faculty-avatar-text').textContent = initials;
  
  document.getElementById('export-csv-btn').href = `/api/faculty/${currentFaculty.id}/export-csv`;

  loadSubjects();
  loadAttendanceRecords();

  // Check if an active session was previously saved
  const savedSessionId = localStorage.getItem('active_faculty_session_id');
  if (savedSessionId) {
    checkAndResumeSession(savedSessionId);
  }
}

function setupEventListeners() {
  // Login Form
  document.getElementById('faculty-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'faculty', username: email, password: password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      
      currentFaculty = data.user;
      localStorage.setItem('faculty_user', JSON.stringify(currentFaculty));
      showToast(`Welcome back, ${currentFaculty.name}!`, 'success');
      showDashboard();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // Quick fill faculty
  document.getElementById('quick-fill-faculty').addEventListener('click', () => {
    document.getElementById('login-email').value = 'alan@cs.edu';
    document.getElementById('login-password').value = 'faculty123';
    document.getElementById('faculty-login-form').dispatchEvent(new Event('submit'));
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('faculty_user');
    localStorage.removeItem('active_faculty_session_id');
    clearInterval(qrRefreshInterval);
    clearInterval(sessionTimerInterval);
    clearInterval(attendancePollInterval);
    currentFaculty = null;
    activeSessionId = null;
    showToast('Signed out successfully', 'info');
    showLogin();
  });

  // Detect GPS
  document.getElementById('detect-gps-btn').addEventListener('click', () => {
    if ('geolocation' in navigator) {
      showToast('Detecting current GPS coordinates...', 'info');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          document.getElementById('session-lat').value = pos.coords.latitude.toFixed(6);
          document.getElementById('session-lng').value = pos.coords.longitude.toFixed(6);
          showToast(`GPS Coordinates detected: (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`, 'success');
        },
        (err) => {
          showToast('GPS access denied or unavailable. Using campus default.', 'warning');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      showToast('Geolocation not supported in this browser.', 'warning');
    }
  });

  // Campus Default GPS
  document.getElementById('reset-default-gps').addEventListener('click', () => {
    document.getElementById('session-lat').value = '28.545000';
    document.getElementById('session-lng').value = '77.192600';
    showToast('Campus default coordinates restored (Room 402).', 'info');
  });

  // Create Session Form
  document.getElementById('create-session-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const subjectId = document.getElementById('session-subject').value;
    const classroom = document.getElementById('session-classroom').value;
    const lat = parseFloat(document.getElementById('session-lat').value);
    const lng = parseFloat(document.getElementById('session-lng').value);
    const radius = parseFloat(document.getElementById('session-radius').value);

    if (!subjectId) {
      showToast('Please select a subject', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faculty_id: currentFaculty.id,
          subject_id: subjectId,
          classroom_name: classroom,
          lat: lat,
          lng: lng,
          allowed_radius_meters: radius,
          duration_minutes: 30
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not launch session');

      activeSessionId = data.session_id;
      localStorage.setItem('active_faculty_session_id', activeSessionId);
      showToast('Attendance Session Launched! 5s Dynamic QR active.', 'success');
      startSessionView(activeSessionId);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // End Session
  document.getElementById('end-session-btn').addEventListener('click', async () => {
    if (!confirm('Are you sure you want to end this attendance session? The QR code will no longer accept marks.')) return;
    
    if (activeSessionId) {
      try {
        await fetch(`/api/session/${activeSessionId}/end`, { method: 'POST' });
        showToast('Attendance session has been closed.', 'info');
      } catch (e) {}
    }
    stopSessionView();
  });

  // Copy Link
  document.getElementById('copy-scan-link-btn').addEventListener('click', () => {
    const url = document.getElementById('active-scan-url').textContent;
    if (url && url !== 'Loading link...') {
      navigator.clipboard.writeText(url).then(() => {
        showToast('Student attendance link copied to clipboard!', 'success');
      }).catch(() => {
        showToast('Failed to copy. Please manually copy the URL.', 'warning');
      });
    }
  });

  // Filter subject
  document.getElementById('filter-subject').addEventListener('change', () => {
    loadAttendanceRecords();
  });

  // Refresh Table
  document.getElementById('refresh-table-btn').addEventListener('click', () => {
    loadAttendanceRecords();
    showToast('Attendance records refreshed.', 'info');
  });
}

// Load Faculty Subjects
async function loadSubjects() {
  if (!currentFaculty) return;
  try {
    const res = await fetch(`/api/faculty/${currentFaculty.id}/subjects`);
    const subjects = await res.json();
    
    const subjectSelect = document.getElementById('session-subject');
    const filterSelect = document.getElementById('filter-subject');

    subjectSelect.innerHTML = '<option value="">-- Choose Subject --</option>';
    filterSelect.innerHTML = '<option value="ALL">All Subjects</option>';

    subjects.forEach(sub => {
      const opt = document.createElement('option');
      opt.value = sub.id;
      opt.textContent = `${sub.code} - ${sub.name}`;
      subjectSelect.appendChild(opt);

      const fOpt = document.createElement('option');
      fOpt.value = sub.id;
      fOpt.textContent = `${sub.code} - ${sub.name}`;
      filterSelect.appendChild(fOpt);
    });

    if (subjects.length > 0) {
      subjectSelect.value = subjects[0].id;
    }
  } catch (err) {
    console.error('Error loading subjects:', err);
  }
}

// Check and resume active session
async function checkAndResumeSession(sessionId) {
  try {
    const res = await fetch(`/api/session/${sessionId}/status`);
    if (!res.ok) {
      localStorage.removeItem('active_faculty_session_id');
      return;
    }
    const data = await res.json();
    if (!data.is_expired) {
      activeSessionId = sessionId;
      startSessionView(activeSessionId);
    } else {
      localStorage.removeItem('active_faculty_session_id');
    }
  } catch (e) {
    localStorage.removeItem('active_faculty_session_id');
  }
}

// Start Session UI and 5-Second QR Poller
function startSessionView(sessionId) {
  document.getElementById('session-setup-card').style.display = 'none';
  document.getElementById('active-session-card').style.display = 'block';

  // Immediately fetch first QR
  refreshDynamicQR();

  // 1-second countdown clock for the 5-second QR token rotation and 30-min total countdown
  tokenSecondsLeft = 5;
  clearInterval(qrRefreshInterval);
  qrRefreshInterval = setInterval(() => {
    tokenSecondsLeft -= 1;
    if (tokenSecondsLeft <= 0) {
      tokenSecondsLeft = 5;
      refreshDynamicQR();
    }
    updateTimerVisuals();
  }, 1000);

  // Poll attendance records every 4 seconds
  clearInterval(attendancePollInterval);
  attendancePollInterval = setInterval(() => {
    loadAttendanceRecords();
  }, 4000);
}

// Stop Session UI
function stopSessionView() {
  clearInterval(qrRefreshInterval);
  clearInterval(sessionTimerInterval);
  clearInterval(attendancePollInterval);
  activeSessionId = null;
  localStorage.removeItem('active_faculty_session_id');
  
  document.getElementById('session-setup-card').style.display = 'block';
  document.getElementById('active-session-card').style.display = 'none';
  loadAttendanceRecords();
}

// Fetch 5-second rotating QR from server
async function refreshDynamicQR() {
  if (!activeSessionId) return;

  try {
    const res = await fetch(`/api/session/${activeSessionId}/qr`);
    const data = await res.json();

    if (data.status === 'expired' || data.status === 'ended') {
      showToast(data.message || 'Session expired', 'warning');
      stopSessionView();
      return;
    }

    // Update active UI elements
    document.getElementById('active-subject-title').textContent = `${data.subject_code} - ${data.subject_name}`;
    document.getElementById('active-classroom-title').textContent = data.classroom_name;
    document.getElementById('dynamic-qr-img').src = data.qr_image;
    document.getElementById('active-scan-url').textContent = data.scan_url;
    document.getElementById('open-student-tab-btn').href = data.scan_url;
    
    currentRemainingSeconds = data.remaining_session_seconds;
    tokenSecondsLeft = data.token_expires_in || 5;
    
    updateTimerVisuals();
  } catch (err) {
    console.error('Error refreshing QR:', err);
  }
}

// Update SVG timer ring and countdowns
function updateTimerVisuals() {
  const tokenSecEl = document.getElementById('token-seconds-left');
  if (tokenSecEl) tokenSecEl.textContent = Math.max(1, tokenSecondsLeft);

  // Circular ring offset (circumference = 2 * PI * 10 = ~62.83)
  const circle = document.getElementById('timer-ring-circle');
  if (circle) {
    const maxOffset = 63;
    const progress = (5 - tokenSecondsLeft) / 5;
    circle.style.strokeDashoffset = (maxOffset * progress).toFixed(1);
  }

  // 30-min countdown
  const countdownEl = document.getElementById('session-countdown-text');
  if (countdownEl && currentRemainingSeconds > 0) {
    currentRemainingSeconds = Math.max(0, currentRemainingSeconds - 1);
    countdownEl.textContent = formatTime(currentRemainingSeconds);

    const progressBar = document.getElementById('overall-timer-progress');
    if (progressBar) {
      const pct = (currentRemainingSeconds / 1800) * 100;
      progressBar.style.width = `${pct}%`;
    }
  }
}

// Load attendance records into table
async function loadAttendanceRecords() {
  if (!currentFaculty) return;
  const filterSubject = document.getElementById('filter-subject').value;
  
  let url = `/api/faculty/${currentFaculty.id}/attendance-records`;
  if (filterSubject && filterSubject !== 'ALL') {
    url += `?subject_id=${filterSubject}`;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();
    const records = data.records || [];

    document.getElementById('live-attendees-badge').textContent = `${records.length} Attendees Recorded`;

    const tbody = document.getElementById('attendance-table-body');
    if (records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">
            No attendance records found yet.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = records.map(r => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${r.snapshot_path || '/static/images/students/rahul.jpg'}" alt="Student" class="student-thumb" onerror="this.src='/static/images/students/rahul.jpg'">
            <strong style="color: var(--text-primary); font-size: 0.95rem;">${r.student_name}</strong>
          </div>
        </td>
        <td><code style="color: var(--secondary);">${r.roll_no}</code></td>
        <td>${r.subject_code || ''}</td>
        <td style="font-size: 0.85rem; color: var(--text-secondary);">${r.marked_at}</td>
        <td>
          <span class="badge ${r.distance_meters <= 100 ? 'badge-success' : 'badge-warning'}">
            📍 ${r.distance_meters}m away
          </span>
        </td>
        <td>
          <span class="badge badge-success">
            🤖 ${r.face_confidence}% Match
          </span>
        </td>
        <td>
          <span class="badge badge-success">
            <span class="pulse-dot green" style="width: 6px; height: 6px;"></span>
            VERIFIED
          </span>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading attendance logs:', err);
  }
}

// Student Dashboard Management Script
let activeStudentId = 'STU101';

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

document.addEventListener('DOMContentLoaded', () => {
  initStudentSelection();
  setupEventListeners();
  loadDashboardData(activeStudentId);
});

function initStudentSelection() {
  const urlParams = new URLSearchParams(window.location.search);
  const qId = urlParams.get('student_id');
  if (qId) {
    activeStudentId = qId;
  } else {
    const saved = localStorage.getItem('student_user');
    if (saved) {
      try {
        const student = JSON.parse(saved);
        activeStudentId = student.id;
      } catch (e) {}
    }
  }

  const select = document.getElementById('switch-student-select');
  if (select) {
    select.value = activeStudentId;
  }
}

function setupEventListeners() {
  const select = document.getElementById('switch-student-select');
  if (select) {
    select.addEventListener('change', (e) => {
      activeStudentId = e.target.value;
      loadDashboardData(activeStudentId);
      showToast(`Switched student view`, 'info');
    });
  }
}

async function loadDashboardData(studentId) {
  try {
    const res = await fetch(`/api/student/${studentId}/dashboard`);
    if (!res.ok) throw new Error('Could not fetch student dashboard');
    const data = await res.json();

    renderStudentProfile(data.student);
    renderAttendanceAlerts(data);
    renderStatsOverview(data);
    renderSubjectsGrid(data.subjects);
    renderAttendanceLogs(data.recent_activity);

  } catch (err) {
    showToast(err.message, 'danger');
  }
}

function renderStudentProfile(student) {
  if (!student) return;
  document.getElementById('dashboard-student-name').textContent = student.name;
  document.getElementById('dashboard-student-roll').textContent = student.roll_no;
  document.getElementById('dashboard-student-dept').textContent = `${student.department} • ${student.semester}`;
  
  const photoEl = document.getElementById('dashboard-student-photo');
  if (photoEl) {
    photoEl.src = student.photo_url || '/static/images/students/rahul.jpg';
  }
}

// Render < 75% Alert Banner as required
function renderAttendanceAlerts(data) {
  const alertBanner = document.getElementById('low-attendance-alert-banner');
  const goodBanner = document.getElementById('good-standing-banner');
  const detailsEl = document.getElementById('low-attendance-details');

  if (data.has_low_attendance && data.low_attendance_alerts.length > 0) {
    alertBanner.style.display = 'flex';
    goodBanner.style.display = 'none';

    const subjectsList = data.low_attendance_alerts
      .map(a => `${a.subject_name} (${a.percentage}%)`)
      .join(', ');

    detailsEl.textContent = `The following subjects have fallen below the mandatory 75% attendance criteria: ${subjectsList}. You must attend upcoming lectures to avoid exam debarment.`;
  } else {
    alertBanner.style.display = 'none';
    goodBanner.style.display = 'flex';
  }
}

function renderStatsOverview(data) {
  const overallEl = document.getElementById('stat-overall-percentage');
  overallEl.textContent = `${data.overall_percentage}%`;
  overallEl.style.color = data.overall_percentage >= 75 ? '#34d399' : '#fbbf24';

  document.getElementById('stat-classes-attended').textContent = data.total_attended;
  document.getElementById('stat-classes-held').textContent = `out of ${data.total_held} classes conducted`;

  const atRiskCount = data.low_attendance_alerts.length;
  const atRiskEl = document.getElementById('stat-at-risk-count');
  atRiskEl.textContent = atRiskCount;
  atRiskEl.style.color = atRiskCount > 0 ? '#ef4444' : '#10b981';

  const examEligEl = document.getElementById('stat-exam-eligibility');
  if (data.overall_percentage >= 75) {
    examEligEl.textContent = 'ELIGIBLE';
    examEligEl.style.color = '#10b981';
  } else {
    examEligEl.textContent = 'AT RISK';
    examEligEl.style.color = '#ef4444';
  }
}

function renderSubjectsGrid(subjects) {
  const container = document.getElementById('subjects-grid-container');
  if (!container) return;

  container.innerHTML = subjects.map(sub => {
    const isLow = sub.is_low;
    const badgeClass = isLow ? 'badge-danger' : 'badge-success';
    const badgeText = isLow ? '⚠️ Below 75%' : '✓ Good Standing';
    const fillClass = isLow ? 'warning' : 'good';
    const pctColor = isLow ? '#f87171' : '#34d399';

    let adviceHtml = '';
    if (isLow) {
      adviceHtml = `
        <div style="margin-top: 12px; padding: 10px 12px; background: rgba(239, 68, 68, 0.1); border-radius: var(--radius-sm); border: 1px solid rgba(239, 68, 68, 0.25); font-size: 0.82rem; color: #fca5a5;">
          ⚠️ <strong>Required:</strong> Attend next <strong>${sub.needed_to_75}</strong> consecutive classes to reach 75%.
        </div>
      `;
    } else {
      adviceHtml = `
        <div style="margin-top: 12px; padding: 10px 12px; background: rgba(16, 185, 129, 0.08); border-radius: var(--radius-sm); border: 1px solid rgba(16, 185, 129, 0.2); font-size: 0.82rem; color: #6ee7b7;">
          ✓ On track. You have attended ${sub.attended} out of ${sub.total} classes.
        </div>
      `;
    }

    return `
      <div class="glass-card subject-card ${isLow ? 'low-attendance' : ''}">
        <div>
          <div class="subject-header">
            <div>
              <span class="subject-code">${sub.code}</span>
              <h3 class="subject-title">${sub.name}</h3>
              <p style="font-size: 0.82rem; color: var(--text-muted);">Instructor: ${sub.faculty_name}</p>
            </div>
            <span class="badge ${badgeClass}">${badgeText}</span>
          </div>

          <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 10px;">
            <span style="font-size: 0.85rem; color: var(--text-secondary);">Attendance Rate:</span>
            <span style="font-size: 1.5rem; font-weight: 800; color: ${pctColor};">${sub.percentage}%</span>
          </div>

          <div class="progress-bar-bg">
            <div class="progress-bar-fill ${fillClass}" style="width: ${Math.min(100, sub.percentage)}%;"></div>
          </div>

          <div class="stat-row">
            <span>Attended: <strong style="color: #fff;">${sub.attended}</strong></span>
            <span>Absent: <strong style="color: var(--text-muted);">${sub.absent}</strong></span>
            <span>Total Held: <strong style="color: #fff;">${sub.total}</strong></span>
          </div>
        </div>

        ${adviceHtml}
      </div>
    `;
  }).join('');
}

function renderAttendanceLogs(logs) {
  const tbody = document.getElementById('student-logs-tbody');
  if (!tbody) return;

  if (!logs || logs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">
          No verified attendance logs recorded yet for this semester.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = logs.map(l => `
    <tr>
      <td><code style="color: var(--secondary); font-weight: 700;">${l.subject_code}</code></td>
      <td style="color: var(--text-primary); font-weight: 600;">${l.subject_name}</td>
      <td style="font-size: 0.88rem; color: var(--text-secondary);">${l.classroom_name || 'Room 402 - CS Block'}</td>
      <td style="font-size: 0.85rem; color: var(--text-muted);">${l.marked_at}</td>
      <td>
        <span class="badge badge-success">
          🤖 ${l.face_confidence}% Match
        </span>
      </td>
      <td>
        <span class="badge badge-success">
          <span class="pulse-dot green" style="width: 6px; height: 6px;"></span>
          ${l.verification_status || 'VERIFIED'}
        </span>
      </td>
    </tr>
  `).join('');
}

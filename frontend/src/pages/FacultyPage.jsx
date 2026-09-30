import { useState, useEffect, useRef, useCallback } from 'react'
import Navbar from '../components/Navbar'
import api from '../api'

// ── Circular countdown SVG ──
function CircularTimer({ seconds, total, label, color = 'var(--accent)' }) {
  const r = 42
  const circ = 2 * Math.PI * r
  const offset = circ - (seconds / total) * circ
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle className="timer-track" cx="55" cy="55" r={r} fill="none" strokeWidth="6" stroke="rgba(255,255,255,0.08)" />
        <circle
          cx="55" cy="55" r={r} fill="none" strokeWidth="6"
          stroke={color} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 55 55)"
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
        <text x="55" y="50" textAnchor="middle" fill="var(--text-primary)" fontSize="18" fontWeight="800" fontFamily="inherit">
          {seconds}
        </text>
        <text x="55" y="67" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="inherit">
          {label}
        </text>
      </svg>
    </div>
  )
}

export default function FacultyPage() {
  const [step, setStep] = useState('login') // login | dashboard | session
  const [user, setUser] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [form, setForm] = useState({ username: '', password: '' })
  const [sessionForm, setSessionForm] = useState({ subject_id: '', classroom_name: '', lat: '', lng: '', radius: 100 })
  const [session, setSession] = useState(null)
  const [qrData, setQrData] = useState(null)
  const [attendees, setAttendees] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const qrInterval = useRef(null)

  const fetchQR = useCallback(async (sid) => {
    try {
      const res = await api.get(`/session/${sid}/qr`)
      if (res.data.status === 'active') {
        setQrData(res.data)
        const att = await api.get(`/session/${sid}/attendance`)
        setAttendees(att.data.records)
      } else {
        setQrData(prev => ({ ...prev, status: res.data.status }))
        clearInterval(qrInterval.current)
      }
    } catch (e) { /* ignore */ }
  }, [])

  useEffect(() => {
    if (session && step === 'session') {
      fetchQR(session.session_id)
      qrInterval.current = setInterval(() => fetchQR(session.session_id), 3000)
      return () => clearInterval(qrInterval.current)
    }
  }, [session, step, fetchQR])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await api.post('/login', { role: 'faculty', username: form.username, password: form.password })
      setUser(res.data.user)
      const subs = await api.get(`/faculty/${res.data.user.id}/subjects`)
      setSubjects(subs.data)
      setStep('dashboard')
    } catch (e) { setError(e.response?.data?.detail || 'Login failed') }
    setLoading(false)
  }

  const handleStartSession = async (e) => {
    e.preventDefault()
    if (!sessionForm.subject_id || !sessionForm.classroom_name || !sessionForm.lat || !sessionForm.lng) {
      return setError('Fill all fields')
    }
    setLoading(true); setError('')
    try {
      const res = await api.post('/session/create', {
        faculty_id: user.id,
        subject_id: sessionForm.subject_id,
        classroom_name: sessionForm.classroom_name,
        lat: parseFloat(sessionForm.lat),
        lng: parseFloat(sessionForm.lng),
        allowed_radius_meters: parseFloat(sessionForm.radius),
        duration_minutes: 30
      })
      setSession(res.data)
      setStep('session')
    } catch (e) { setError(e.response?.data?.detail || 'Failed to create session') }
    setLoading(false)
  }

  const handleEndSession = async () => {
    if (!window.confirm('End this attendance session?')) return
    await api.post(`/session/${session.session_id}/end`)
    clearInterval(qrInterval.current)
    setSession(null); setQrData(null); setAttendees([])
    setStep('dashboard')
  }

  const handleExportCSV = () => {
    window.location.href = `/api/faculty/${user.id}/export-csv`
  }

  const useMyGPS = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setSessionForm(f => ({ ...f, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) })),
      () => setError('GPS not available')
    )
  }

  // ── Login Screen ──
  if (step === 'login') return (
    <div className="page">
      <Navbar />
      <div className="container-sm" style={{ paddingTop: 80 }}>
        <div style={{ maxWidth: 440, margin: '0 auto' }}>
          <div className="animate-fade-in">
            <div className="section-badge mb-4">👨‍🏫 Faculty Portal</div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>Faculty Login</h1>
            <p className="text-muted mb-6">Sign in to start an attendance session and generate live QR codes.</p>
            {error && <div className="alert alert-danger">⚠️ {error}</div>}
            <form className="card" onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" placeholder="turing@cs.edu" value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="faculty123" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              </div>
              <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
                {loading ? <><span className="spinner-sm"></span> Signing in...</> : '🔑 Sign In'}
              </button>
            </form>
            <div className="card mt-4 text-sm text-muted">
              <strong style={{ color: 'var(--accent-light)' }}>Test Credentials:</strong><br />
              turing@cs.edu / faculty123 &nbsp;·&nbsp; ada@cs.edu / faculty123
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Dashboard ──
  if (step === 'dashboard') return (
    <div className="page">
      <Navbar />
      <div className="container" style={{ paddingTop: 40 }}>
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="section-badge mb-2">👋 Welcome</div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{user.name}</h1>
              <p className="text-muted text-sm">{user.designation} · {user.department}</p>
            </div>
            <button className="btn btn-ghost" onClick={() => { setUser(null); setStep('login') }}>Logout</button>
          </div>

          {error && <div className="alert alert-danger">⚠️ {error}</div>}

          <div className="grid-2">
            {/* Start Session Form */}
            <div className="card">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20 }}>📡 Start Attendance Session</h2>
              <form onSubmit={handleStartSession}>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <select className="form-select" value={sessionForm.subject_id}
                    onChange={e => setSessionForm(f => ({ ...f, subject_id: e.target.value }))}>
                    <option value="">Select subject...</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Classroom Name</label>
                  <input className="form-input" placeholder="e.g. CS Block Room 301" value={sessionForm.classroom_name}
                    onChange={e => setSessionForm(f => ({ ...f, classroom_name: e.target.value }))} />
                </div>
                <div className="grid-2" style={{ gap: 12, marginBottom: 20 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Latitude</label>
                    <input className="form-input" placeholder="28.5450" value={sessionForm.lat}
                      onChange={e => setSessionForm(f => ({ ...f, lat: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Longitude</label>
                    <input className="form-input" placeholder="77.1926" value={sessionForm.lng}
                      onChange={e => setSessionForm(f => ({ ...f, lng: e.target.value }))} />
                  </div>
                </div>
                <button type="button" className="btn btn-ghost btn-sm mb-4" onClick={useMyGPS}>
                  📍 Use My GPS Location
                </button>
                <div className="form-group">
                  <label className="form-label">Allowed Radius (meters)</label>
                  <input className="form-input" type="number" value={sessionForm.radius}
                    onChange={e => setSessionForm(f => ({ ...f, radius: e.target.value }))} />
                </div>
                <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
                  {loading ? <><span className="spinner-sm"></span> Creating...</> : '🚀 Start 30-Min Session'}
                </button>
              </form>
            </div>

            {/* Subjects */}
            <div className="card">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20 }}>📚 Your Subjects</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {subjects.map(s => (
                  <div key={s.id} className="card" style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.name}</div>
                        <div className="text-xs text-muted mt-1">{s.code} · {s.total_classes} total classes</div>
                      </div>
                      <span className="badge badge-accent">{s.code}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="divider" />
              <button className="btn btn-ghost btn-sm" onClick={handleExportCSV}>⬇️ Export CSV Report</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Live Session ──
  return (
    <div className="page">
      <Navbar />
      <div className="container" style={{ paddingTop: 40 }}>
        <div className="animate-fade-in">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="section-badge mb-2">🔴 LIVE SESSION</div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>
                {qrData?.subject_code} — {qrData?.subject_name}
              </h1>
              <p className="text-muted text-sm">📍 {qrData?.classroom_name}</p>
            </div>
            <div className="flex gap-3">
              <button className="btn btn-ghost btn-sm" onClick={handleExportCSV}>⬇️ CSV</button>
              <button className="btn btn-danger btn-sm" onClick={handleEndSession}>🛑 End Session</button>
            </div>
          </div>

          <div className="grid-2">
            {/* QR Panel */}
            <div className="card" style={{ textAlign: 'center' }}>
              <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: '1rem' }}>📱 Live QR Code</h3>
              {qrData?.status === 'active' ? (
                <>
                  <div className="qr-container" style={{ marginBottom: 20 }}>
                    {qrData.qr_image && <img src={qrData.qr_image} alt="QR Code" />}
                  </div>
                  <div className="flex gap-4 justify-center mt-2">
                    <CircularTimer seconds={qrData.token_expires_in} total={5} label="QR refresh" />
                    <CircularTimer seconds={Math.floor(qrData.remaining_session_seconds / 60)} total={30}
                      label="min left" color="var(--success)" />
                  </div>
                  <div className="flex gap-2 justify-center mt-4">
                    <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(qrData.scan_url)}>
                      📋 Copy Link
                    </button>
                    <a className="btn btn-ghost btn-sm" href={qrData.scan_url} target="_blank" rel="noreferrer">
                      🔗 Open Student Portal
                    </a>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">⏱️</div>
                  <p>Session {qrData?.status}</p>
                </div>
              )}
            </div>

            {/* Attendance Feed */}
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>👥 Live Attendance Feed</h3>
                <span className="badge badge-success">{attendees.length} Present</span>
              </div>
              {attendees.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <div className="empty-state-icon">🎓</div>
                  <p className="text-sm">Waiting for students to scan...</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
                  {attendees.map(a => (
                    <div key={a.id} className="card animate-fade-in"
                      style={{ padding: '14px 16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <div className="flex items-center gap-3">
                        <img src={a.photo_url} alt={a.student_name}
                          style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--success)' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{a.student_name}</div>
                          <div className="text-xs text-muted">{a.roll_no} · {a.marked_at}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="badge badge-success text-xs">{a.face_confidence}% AI</div>
                          <div className="text-xs text-muted mt-1">{a.distance_meters}m away</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useRef, useCallback } from 'react'
import Navbar from '../components/Navbar'
import api from '../api'
import { 
  GraduationCap, AlertTriangle, Key, Radio, MapPin, Play, BookOpen, Download,
  UserPlus, ArrowLeft, Camera, CircleDot, StopCircle, Smartphone, Copy, ExternalLink,
  Clock, Users, CheckCircle2, XCircle, LogOut, ShieldCheck
} from 'lucide-react'

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
  const [step, setStep] = useState(() => localStorage.getItem('faculty_step') || 'login') // login | dashboard | session
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('faculty_user')
    return saved ? JSON.parse(saved) : null
  })
  const [subjects, setSubjects] = useState([])
  const [form, setForm] = useState({ username: '', password: '' })
  const [sessionForm, setSessionForm] = useState({
    subject_id: '',
    classroom_name: '',
    lat: '',
    lng: '',
    radius: 200,
    faculty_name: user?.name || ''
  })
  const [updatingProfile, setUpdatingProfile] = useState(false)
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem('faculty_session')
    return saved ? JSON.parse(saved) : null
  })
  const [qrData, setQrData] = useState(null)
  const [attendees, setAttendees] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const qrInterval = useRef(null)

  // Add Student State
  const [studentForm, setStudentForm] = useState({ roll_no: '', name: '', email: '', password: '', department: '', semester: '' })
  const [capturedStudentImage, setCapturedStudentImage] = useState(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [photoValidation, setPhotoValidation] = useState(null) // null | 'validating' | 'ok' | 'fail'
  const [photoValidMsg, setPhotoValidMsg] = useState('')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

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
    if (user && step === 'dashboard') {
      if (subjects.length === 0) {
        api.get(`/faculty/${user.id}/subjects`).then(res => setSubjects(res.data)).catch(() => {})
      }
      if (!sessionForm.faculty_name && user.name) {
        setSessionForm(f => ({ ...f, faculty_name: user.name }))
      }
    }
  }, [user, step, subjects.length, sessionForm.faculty_name])

  useEffect(() => {
    if (session && step === 'session') {
      fetchQR(session.session_id)
      qrInterval.current = setInterval(() => fetchQR(session.session_id), 3000)
      return () => clearInterval(qrInterval.current)
    }
  }, [session, step, fetchQR])

  const handleSubjectChange = (subjectId) => {
    const selected = subjects.find(s => s.id === subjectId)
    setSessionForm(f => ({
      ...f,
      subject_id: subjectId,
      // Change faculty name when class changes: use the subject's faculty name or current user name
      faculty_name: selected?.faculty_name || user?.name || f.faculty_name
    }))
  }

  const handleUpdateProfileName = async () => {
    if (!sessionForm.faculty_name?.trim()) return
    setUpdatingProfile(true)
    try {
      const res = await api.post(`/faculty/${user.id}/update-profile`, { name: sessionForm.faculty_name.trim() })
      setUser(prev => ({ ...prev, name: res.data.user.name }))
      localStorage.setItem('faculty_user', JSON.stringify({ ...user, name: res.data.user.name }))
      alert(`Faculty name updated to: ${res.data.user.name}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update faculty name')
    }
    setUpdatingProfile(false)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await api.post('/login', { role: 'faculty', username: form.username, password: form.password })
      setUser(res.data.user)
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('faculty_user', JSON.stringify(res.data.user))
      setSessionForm(f => ({ ...f, faculty_name: res.data.user.name }))
      const subs = await api.get(`/faculty/${res.data.user.id}/subjects`)
      setSubjects(subs.data)
      setStep('dashboard')
      localStorage.setItem('faculty_step', 'dashboard')
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
        faculty_name: sessionForm.faculty_name || user.name,
        lat: parseFloat(sessionForm.lat),
        lng: parseFloat(sessionForm.lng),
        allowed_radius_meters: parseFloat(sessionForm.radius),
        duration_minutes: 30
      })
      const fullSession = {
        ...res.data,
        faculty_name: sessionForm.faculty_name || user.name,
        classroom_name: sessionForm.classroom_name
      }
      setSession(fullSession)
      localStorage.setItem('faculty_session', JSON.stringify(fullSession))
      setStep('session')
      localStorage.setItem('faculty_step', 'session')
    } catch (e) { setError(e.response?.data?.detail || 'Failed to create session') }
    setLoading(false)
  }

  const handleEndSession = async () => {
    if (!window.confirm('End this attendance session?')) return
    await api.post(`/session/${session.session_id}/end`)
    clearInterval(qrInterval.current)
    setSession(null); setQrData(null); setAttendees([])
    localStorage.removeItem('faculty_session')
    setStep('dashboard')
    localStorage.setItem('faculty_step', 'dashboard')
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

  // ── Add Student Functions ──
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
      setIsStreaming(true)
    } catch { setError('Camera access denied.') }
  }
  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    setIsStreaming(false)
  }
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    ctx.drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setCapturedStudentImage(dataUrl)
    stopCamera()
    // Validate the captured photo immediately
    setPhotoValidation('validating')
    setPhotoValidMsg('')
    try {
      await api.post('/validate-photo', { photo_b64: dataUrl })
      setPhotoValidation('ok')
      setPhotoValidMsg('Face detected and validated successfully!')
    } catch (err) {
      setPhotoValidation('fail')
      setPhotoValidMsg(err.response?.data?.detail || 'No face detected. Please retake.')
    }
  }
  const retakePhoto = () => { setCapturedStudentImage(null); setPhotoValidation(null); setPhotoValidMsg(''); startCamera() }

  const handleAddStudentSubmit = async (e) => {
    e.preventDefault()
    if (!capturedStudentImage) return setError('Please capture a photo first.')
    if (photoValidation === 'fail') return setError('Photo validation failed. Please retake with a clear face visible.')
    if (photoValidation === 'validating') return setError('Photo is still being validated, please wait.')
    setLoading(true); setError('')
    try {
      await api.post('/faculty/create-student', { ...studentForm, photo_b64: capturedStudentImage })
      setStep('dashboard')
      setStudentForm({ roll_no: '', name: '', email: '', password: '', department: '', semester: '' })
      setCapturedStudentImage(null)
      setPhotoValidation(null)
      setPhotoValidMsg('')
      alert('Student registered successfully! They can now log in and mark attendance.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create student.')
    }
    setLoading(false)
  }

  // ── Login Screen ──
  if (step === 'login') return (
    <div className="page">
      <Navbar />
      <div className="container-sm" style={{ paddingTop: 80 }}>
        <div style={{ maxWidth: 440, margin: '0 auto' }}>
          <div className="animate-fade-in">
            <div className="section-badge mb-4"><><GraduationCap size={16} style={{display:'inline', marginBottom:-3, marginRight:6}}/> Faculty Portal</></div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>Faculty Login</h1>
            <p className="text-muted mb-6">Sign in to start an attendance session and generate live QR codes.</p>
            {error && <div className="alert alert-danger"><><AlertTriangle size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> {error}</></div>}
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
                {loading ? <><span className="spinner-sm"></span> Signing in...</> : <><Key size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Sign In</>}
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
              <div className="section-badge mb-2">Welcome</div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{user.name}</h1>
              <p className="text-muted text-sm">{user.designation} · {user.department}</p>
            </div>
            <button className="btn btn-ghost" onClick={() => {
              setUser(null);
              setStep('login');
              localStorage.removeItem('token');
              localStorage.removeItem('faculty_user');
              localStorage.removeItem('faculty_session');
              localStorage.setItem('faculty_step', 'login');
            }}>Logout</button>
          </div>

          {error && <div className="alert alert-danger"><><AlertTriangle size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> {error}</></div>}

          <div className="grid-2">
            {/* Start Session Form */}
            <div className="card">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20 }}><><Radio size={18} style={{display:'inline', marginBottom:-4, marginRight:6}}/> Start Attendance Session</></h2>
              <form onSubmit={handleStartSession}>
                <div className="form-group">
                  <div className="flex justify-between items-center mb-1">
                    <label className="form-label" style={{ marginBottom: 0 }}>Class / Subject</label>
                    <span className="text-xs text-muted">Change class to auto-load teacher</span>
                  </div>
                  <select className="form-select" value={sessionForm.subject_id}
                    onChange={e => handleSubjectChange(e.target.value)}>
                    <option value="">Select class / subject...</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.code} — {s.name} {s.faculty_name ? `(${s.faculty_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <div className="flex justify-between items-center mb-1">
                    <label className="form-label" style={{ marginBottom: 0 }}>Faculty / Instructor Name</label>
                    <span className="badge badge-accent text-xs">Changeable</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="form-input"
                      style={{ flex: 1 }}
                      placeholder="e.g. Dr. Alan Turing"
                      value={sessionForm.faculty_name}
                      onChange={e => setSessionForm(f => ({ ...f, faculty_name: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      title="Save this name to your profile"
                      onClick={handleUpdateProfileName}
                      disabled={!sessionForm.faculty_name?.trim() || updatingProfile}
                    >
                      {updatingProfile ? 'Saving...' : 'Save Name'}
                    </button>
                  </div>
                  <div className="text-xs text-muted mt-1">
                    Auto-updates when you switch classes, and can be edited for substitute or co-instructor.
                  </div>
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
                  <><MapPin size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Use My GPS Location</>
                </button>
                <div className="form-group">
                  <div className="flex justify-between items-center mb-1">
                    <label className="form-label" style={{ marginBottom: 0 }}>Allowed Radius (meters)</label>
                    <span className="text-xs text-muted">Indoor phone GPS buffer included</span>
                  </div>
                  <input className="form-input" type="number" value={sessionForm.radius}
                    onChange={e => setSessionForm(f => ({ ...f, radius: parseFloat(e.target.value) || 200 }))} />
                  <div className="flex gap-2 mt-2">
                    {[
                      { label: '100m (Strict)', val: 100 },
                      { label: '200m (Room)', val: 200 },
                      { label: '500m (Building)', val: 500 },
                      { label: '1000m (Campus)', val: 1000 }
                    ].map(p => (
                      <button key={p.val} type="button" className={`btn btn-sm ${sessionForm.radius === p.val ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ flex: 1, padding: '4px 6px', fontSize: '0.78rem' }}
                        onClick={() => setSessionForm(f => ({ ...f, radius: p.val }))}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
                  {loading ? <><span className="spinner-sm"></span> Creating...</> : <><Play size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Start 30-Min Session</>}
                </button>
              </form>
            </div>

            {/* Subjects */}
            <div className="card">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20 }}><><BookOpen size={18} style={{display:'inline', marginBottom:-4, marginRight:6}}/> Your Subjects</></h2>
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
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={handleExportCSV}><><Download size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Export CSV Report</></button>
                <button className="btn btn-ghost btn-sm" onClick={() => setStep('add_student')}><><UserPlus size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Register New Student</></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Add Student ──
  if (step === 'add_student') return (
    <div className="page">
      <Navbar />
      <div className="container-sm" style={{ paddingTop: 80 }}>
        <div className="flex justify-between items-center mb-4">
          <button className="btn btn-ghost btn-sm" onClick={() => { setStep('dashboard'); stopCamera(); setPhotoValidation(null); setPhotoValidMsg('') }}>
            <><ArrowLeft size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Back to Dashboard</>
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => {
            setUser(null); setStep('login');
            localStorage.removeItem('token'); localStorage.removeItem('faculty_user');
            localStorage.removeItem('faculty_session'); localStorage.setItem('faculty_step', 'login');
            stopCamera();
          }}><><LogOut size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Logout</></button>
        </div>
        <div className="card animate-fade-in">
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 16 }}>Register New Student Face</h2>
          <p className="text-muted text-sm mb-6">Capture a clear, well-lit frontal photo. The system will verify face detection before saving.</p>
          {error && <div className="alert alert-danger mb-4"><><AlertTriangle size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> {error}</></div>}

          <form onSubmit={handleAddStudentSubmit}>
            <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Full Name</label>
                <input className="form-input" required value={studentForm.name} onChange={e => setStudentForm(f => ({...f, name: e.target.value}))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Roll Number</label>
                <input className="form-input" required placeholder="e.g. 2024CS105" value={studentForm.roll_no} onChange={e => setStudentForm(f => ({...f, roll_no: e.target.value}))} />
              </div>
            </div>
            <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email</label>
                <input className="form-input" required type="email" value={studentForm.email} onChange={e => setStudentForm(f => ({...f, email: e.target.value}))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Password</label>
                <input className="form-input" required type="password" value={studentForm.password} onChange={e => setStudentForm(f => ({...f, password: e.target.value}))} />
              </div>
            </div>
            <div className="grid-2" style={{ gap: 12, marginBottom: 20 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Department</label>
                <input className="form-input" required value={studentForm.department} onChange={e => setStudentForm(f => ({...f, department: e.target.value}))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Semester</label>
                <input className="form-input" required value={studentForm.semester} onChange={e => setStudentForm(f => ({...f, semester: e.target.value}))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Reference Face Photo</label>
              <div style={{ background: '#000', borderRadius: 12, overflow: 'hidden', aspectRatio: '4/3', position: 'relative' }}>
                {!capturedStudentImage ? (
                  <>
                    <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    {!isStreaming ? (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: 8 }}>Position your face in good lighting</div>
                        <button type="button" className="btn btn-primary" onClick={startCamera}><><Camera size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Start Camera</></button>
                      </div>
                    ) : (
                      <>
                        <div className="face-oval" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                          <svg viewBox="0 0 200 280" fill="none" style={{ width: '55%', height: '80%' }}>
                            <ellipse cx="100" cy="140" rx="72" ry="100" stroke="rgba(99,102,241,0.8)" strokeWidth="2" strokeDasharray="6 4" />
                          </svg>
                        </div>
                        <div className="scan-line" />
                        <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                          <button type="button" className="btn btn-primary" onClick={capturePhoto}><><Camera size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Capture Reference Photo</></button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <img src={capturedStudentImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Captured" />
                    <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                      <button type="button" className="btn btn-ghost" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={retakePhoto}>Retake Photo</button>
                    </div>
                  </>
                )}
              </div>

              {/* Photo validation feedback */}
              {photoValidation === 'validating' && (
                <div className="alert alert-warning mt-2" style={{ marginBottom: 0 }}>
                  <><span className="spinner-sm" style={{ marginRight: 8 }} /> Detecting face in photo...</>
                </div>
              )}
              {photoValidation === 'ok' && (
                <div className="alert alert-success mt-2" style={{ marginBottom: 0 }}>
                  <><CheckCircle2 size={16} color="var(--success)" style={{display:'inline', marginBottom:-3, marginRight:6}}/> {photoValidMsg}</>
                </div>
              )}
              {photoValidation === 'fail' && (
                <div className="alert alert-danger mt-2" style={{ marginBottom: 0 }}>
                  <><XCircle size={16} color="var(--danger)" style={{display:'inline', marginBottom:-3, marginRight:6}}/> {photoValidMsg}</>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full mt-4"
              disabled={loading || !capturedStudentImage || photoValidation === 'fail' || photoValidation === 'validating'}
            >
              {loading ? <><span className="spinner-sm" /> Registering...</> : <><ShieldCheck size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Register Student & Save Face</>}
            </button>
          </form>
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
              <div className="section-badge mb-2"><><CircleDot size={18} color="var(--danger)" style={{display:'inline', marginBottom:-4, marginRight:6}}/> LIVE SESSION</></div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>
                {qrData?.subject_code} — {qrData?.subject_name}
              </h1>
              <p className="text-muted text-sm" style={{ marginTop: 4 }}>
                <><MapPin size={14} style={{display:'inline', marginBottom:-2, marginRight:4}}/> {qrData?.classroom_name} &nbsp;·&nbsp; <GraduationCap size={14} style={{display:'inline', marginBottom:-2, marginRight:4}}/> Faculty: <strong style={{color:'var(--accent-light)'}}>{qrData?.faculty_name || sessionForm.faculty_name || user?.name}</strong></>
              </p>
            </div>
            <div className="flex gap-3">
              <button className="btn btn-ghost btn-sm" onClick={() => window.location.href = `/api/session/${session.session_id}/export-csv`}><><Download size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> CSV</></button>
              <button className="btn btn-danger btn-sm" onClick={handleEndSession}><><StopCircle size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> End Session</></button>
            </div>
          </div>

          <div className="grid-2">
            {/* QR Panel */}
            <div className="card" style={{ textAlign: 'center' }}>
              <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: '1rem' }}><><Smartphone size={18} style={{display:'inline', marginBottom:-4, marginRight:6}}/> Live QR Code</></h3>
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
                      <><Copy size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Copy Link</>
                    </button>
                    <a className="btn btn-ghost btn-sm" href={qrData.scan_url} target="_blank" rel="noreferrer">
                      <><ExternalLink size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Open Student Portal</>
                    </a>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon"><Clock size={40} color="var(--muted)" /></div>
                  <p>Session {qrData?.status}</p>
                </div>
              )}
            </div>

            {/* Attendance Feed */}
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 style={{ fontWeight: 700, fontSize: '1rem' }}><><Users size={18} style={{display:'inline', marginBottom:-4, marginRight:6}}/> Live Attendance Feed</></h3>
                <span className="badge badge-success">{attendees.length} Present</span>
              </div>
              {attendees.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <div className="empty-state-icon"><GraduationCap size={40} color="var(--muted)" /></div>
                  <p className="text-sm">Waiting for students to scan...</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
                  {attendees.map(a => (
                    <div key={a.id} className="card animate-fade-in"
                      style={{ padding: '14px 16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <div className="flex items-center gap-3">
                        <img src={a.photo_url?.startsWith('/') ? `${import.meta.env.PROD ? 'https://proxy-blocker-production.up.railway.app' : ''}${a.photo_url}` : a.photo_url} alt={a.student_name}
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

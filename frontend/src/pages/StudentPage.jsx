import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../api'

const STEPS = ['Login', 'GPS Verify', 'Face Capture', 'Result']

export default function StudentPage() {
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(0)
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({ username: '', password: '' })
  const [gpsStatus, setGpsStatus] = useState(null) // null | checking | ok | fail
  const [gpsCoords, setGpsCoords] = useState({ lat: null, lng: null })
  const [capturedImage, setCapturedImage] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [streaming, setStreaming] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const sessionId = searchParams.get('session_id') || ''
  const token = searchParams.get('token') || ''

  // Auto-fill from URL if session params present
  useEffect(() => {
    if (sessionId && token && step === 1 && user) {
      startGPS()
    }
  }, [step, user])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await api.post('/login', { role: 'student', username: form.username, password: form.password })
      setUser(res.data.user)
      if (!sessionId) {
        setError('No QR session found. Please scan the faculty QR code first.')
        setLoading(false)
        return
      }
      setStep(1)
    } catch (e) { setError(e.response?.data?.detail || 'Login failed') }
    setLoading(false)
  }

  const startGPS = () => {
    setGpsStatus('checking')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsStatus('ok')
      },
      () => setGpsStatus('fail'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const simulateGPS = (inside) => {
    if (inside) {
      setGpsCoords({ lat: 28.545100, lng: 77.192650 })
    } else {
      setGpsCoords({ lat: 28.550000, lng: 77.196000 })
    }
    setGpsStatus('ok')
  }

  const proceedToCamera = () => {
    if (gpsStatus !== 'ok') return
    setStep(2)
    startCamera()
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
      setStreaming(true)
    } catch { setError('Camera access denied. Please allow camera access.') }
  }

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    setStreaming(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    ctx.drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setCapturedImage(dataUrl)
    stopCamera()
  }

  const retakePhoto = () => {
    setCapturedImage(null)
    startCamera()
  }

  const submitAttendance = async () => {
    if (!capturedImage || !gpsCoords.lat) return
    setLoading(true); setError('')
    try {
      const res = await api.post('/student/verify-attendance', {
        session_id: sessionId,
        token: token,
        student_id: user.id,
        lat: gpsCoords.lat,
        lng: gpsCoords.lng,
        live_image: capturedImage
      })
      setResult({ success: true, data: res.data })
      setStep(3)
    } catch (e) {
      setResult({ success: false, detail: e.response?.data?.detail || 'Verification failed' })
      setStep(3)
    }
    setLoading(false)
  }

  // ── Step 0: Login ──
  if (step === 0) return (
    <div className="page">
      <Navbar />
      <div className="container-sm" style={{ paddingTop: 80 }}>
        <div style={{ maxWidth: 440, margin: '0 auto' }} className="animate-fade-in">
          <div className="section-badge mb-4">📱 Student Attendance</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>Student Login</h1>
          <p className="text-muted mb-6">Log in with your roll number and password to mark attendance.</p>

          {sessionId
            ? <div className="alert alert-success">✅ QR Session detected: <strong>{sessionId.slice(0, 15)}...</strong></div>
            : <div className="alert alert-warning">⚠️ No QR session found. Scan the faculty QR code first, then log in.</div>
          }

          {error && <div className="alert alert-danger">⚠️ {error}</div>}

          <form className="card" onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Roll Number or Email</label>
              <input className="form-input" placeholder="2024CS101" value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="student123" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? <><span className="spinner-sm"></span> Signing in...</> : '🔑 Sign In'}
            </button>
          </form>
          <div className="card mt-4 text-sm text-muted">
            <strong style={{ color: 'var(--accent-light)' }}>Test:</strong> 2024CS101 / student123
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="page">
      <Navbar />
      <div className="container-sm" style={{ paddingTop: 40 }}>
        <div className="animate-fade-in">
          {/* Stepper */}
          <div className="stepper mb-8">
            {STEPS.map((label, i) => (
              <div key={label} className={`step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="step-circle">{i < step ? '✓' : i + 1}</div>
                  <div className="step-label">{label}</div>
                </div>
                {i < STEPS.length - 1 && <div className="step-line" />}
              </div>
            ))}
          </div>

          {/* Student info */}
          {user && (
            <div className="card flex items-center gap-4 mb-6" style={{ padding: '16px 20px' }}>
              <img src={user.photo_url} alt={user.name}
                style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }} />
              <div>
                <div style={{ fontWeight: 700 }}>{user.name}</div>
                <div className="text-xs text-muted">{user.roll_no} · {user.semester}</div>
              </div>
            </div>
          )}

          {/* Step 1: GPS */}
          {step === 1 && (
            <div className="card">
              <h2 style={{ fontWeight: 700, marginBottom: 20, fontSize: '1.2rem' }}>📍 GPS Location Verification</h2>
              <p className="text-muted text-sm mb-6">We need to verify you're physically inside the classroom (within 100m).</p>
              {gpsStatus === 'checking' && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div className="spinner mb-4" />
                  <p className="text-muted">Acquiring GPS location...</p>
                </div>
              )}
              {gpsStatus === 'ok' && (
                <div className="alert alert-success">
                  ✅ GPS acquired: {gpsCoords.lat?.toFixed(5)}, {gpsCoords.lng?.toFixed(5)}
                </div>
              )}
              {gpsStatus === 'fail' && (
                <div className="alert alert-danger">❌ GPS failed. Try simulators below.</div>
              )}
              <div className="flex gap-3 flex-wrap mt-4">
                <button className="btn btn-primary" onClick={startGPS}>📡 Get My GPS</button>
                <button className="btn btn-ghost" onClick={() => simulateGPS(true)}>🏫 Simulate Inside (12m)</button>
                <button className="btn btn-ghost" onClick={() => simulateGPS(false)}>🏠 Simulate Outside (550m)</button>
              </div>
              {gpsStatus === 'ok' && (
                <button className="btn btn-success btn-full mt-6" onClick={proceedToCamera}>
                  ✅ GPS Verified — Continue to Camera →
                </button>
              )}
            </div>
          )}

          {/* Step 2: Camera */}
          {step === 2 && (
            <div className="card">
              <h2 style={{ fontWeight: 700, marginBottom: 20, fontSize: '1.2rem' }}>🤖 AI Face Verification</h2>
              <p className="text-muted text-sm mb-6">Look directly at the camera. Keep your face centered in the oval.</p>
              {error && <div className="alert alert-danger">⚠️ {error}</div>}
              {!capturedImage ? (
                <>
                  <div className="camera-wrap" style={{ marginBottom: 20 }}>
                    <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div className="face-oval">
                      <svg viewBox="0 0 200 280" fill="none">
                        <ellipse cx="100" cy="140" rx="72" ry="100" stroke="rgba(99,102,241,0.7)" strokeWidth="2" strokeDasharray="6 4" />
                      </svg>
                    </div>
                    {streaming && <div className="scan-line" />}
                  </div>
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <button className="btn btn-primary btn-full" onClick={capturePhoto} disabled={!streaming}>
                    📸 Capture Photo
                  </button>
                </>
              ) : (
                <>
                  <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', marginBottom: 20 }}>
                    <img src={capturedImage} alt="Captured" style={{ width: '100%', display: 'block', maxWidth: 420, margin: '0 auto' }} />
                  </div>
                  <div className="flex gap-3">
                    <button className="btn btn-ghost flex-1" onClick={retakePhoto}>🔄 Retake</button>
                    <button className="btn btn-primary flex-1" onClick={submitAttendance} disabled={loading}>
                      {loading ? <><span className="spinner-sm"></span> Verifying...</> : '✅ Submit Attendance'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Result */}
          {step === 3 && result && (
            <div className={`card ${result.success ? '' : ''}`} style={{ textAlign: 'center', padding: '48px 32px' }}>
              <div style={{ fontSize: '4rem', marginBottom: 20 }}>{result.success ? '✅' : '❌'}</div>
              {result.success ? (
                <>
                  <h2 style={{ fontWeight: 800, fontSize: '1.6rem', color: 'var(--success)', marginBottom: 12 }}>
                    Attendance Recorded!
                  </h2>
                  <p className="text-muted mb-6">{result.data.message}</p>
                  <div className="grid-2" style={{ gap: 12, textAlign: 'left' }}>
                    {[
                      ['Student', result.data.student_name],
                      ['Roll No', result.data.roll_no],
                      ['Subject', `${result.data.subject_code} — ${result.data.subject_name}`],
                      ['Classroom', result.data.classroom_name],
                      ['GPS Distance', `${result.data.gps_distance}m`],
                      ['AI Confidence', `${result.data.face_confidence}%`],
                      ['Time', result.data.marked_at],
                    ].map(([k, v]) => (
                      <div key={k} className="card" style={{ padding: '12px 16px', background: 'var(--success-bg)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <div className="text-xs text-muted">{k}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h2 style={{ fontWeight: 800, fontSize: '1.6rem', color: 'var(--danger)', marginBottom: 12 }}>
                    Verification Failed
                  </h2>
                  <div className="alert alert-danger" style={{ textAlign: 'left' }}>
                    {result.detail}
                  </div>
                  <button className="btn btn-primary" onClick={() => { setStep(1); setResult(null); setCapturedImage(null) }}>
                    🔄 Try Again
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

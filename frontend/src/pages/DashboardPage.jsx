import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import api from '../api'

function ProgressBar({ percentage }) {
  const color = percentage >= 75 ? 'progress-green' : percentage >= 60 ? 'progress-amber' : 'progress-red'
  return (
    <div className="progress-bar mt-2">
      <div className={`progress-fill ${color}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
    </div>
  )
}

export default function DashboardPage() {
  const [step, setStep] = useState('login')
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({ username: '', password: '' })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [allStudents, setAllStudents] = useState([])

  useEffect(() => {
    api.get('/students').then(r => setAllStudents(r.data)).catch(() => {})
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await api.post('/login', { role: 'student', username: form.username, password: form.password })
      const u = res.data.user
      setUser(u)
      const d = await api.get(`/student/${u.id}/dashboard`)
      setData(d.data)
      setStep('dashboard')
    } catch (e) { setError(e.response?.data?.detail || 'Login failed') }
    setLoading(false)
  }

  const switchStudent = async (id) => {
    setLoading(true)
    try {
      const d = await api.get(`/student/${id}/dashboard`)
      setData(d.data)
      setUser(d.data.student)
    } catch { }
    setLoading(false)
  }

  if (step === 'login') return (
    <div className="page">
      <Navbar />
      <div className="container-sm" style={{ paddingTop: 80 }}>
        <div style={{ maxWidth: 440, margin: '0 auto' }} className="animate-fade-in">
          <div className="section-badge mb-4">📊 Student Dashboard</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>View Your Attendance</h1>
          <p className="text-muted mb-6">Log in to see subject-wise attendance percentages and 75% alerts.</p>
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
              {loading ? <><span className="spinner-sm"></span> Loading...</> : '📊 View Dashboard'}
            </button>
          </form>
          <div className="card mt-4 text-sm text-muted">
            <strong style={{ color: 'var(--accent-light)' }}>Quick switch:</strong><br />
            2024CS101, 2024CS102, 2024CS103 / student123
          </div>
        </div>
      </div>
    </div>
  )

  const pct = data?.overall_percentage || 0

  return (
    <div className="page">
      <Navbar />
      <div className="container" style={{ paddingTop: 40 }}>
        <div className="animate-fade-in">
          {/* Header */}
          <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: 16 }}>
            <div className="flex items-center gap-4">
              <img src={user?.photo_url} alt={user?.name}
                style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }} />
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 2 }}>{user?.name}</h1>
                <p className="text-muted text-sm">{user?.roll_no} · {user?.semester} · {user?.department}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select className="form-select" style={{ width: 220 }} value={user?.id || ''}
                onChange={e => switchStudent(e.target.value)}>
                {allStudents.map(s => <option key={s.id} value={s.id}>{s.name} ({s.roll_no})</option>)}
              </select>
              <button className="btn btn-ghost" onClick={() => { setUser(null); setData(null); setStep('login') }}>Logout</button>
            </div>
          </div>

          {/* 75% Alert Banner */}
          {data?.has_low_attendance && (
            <div className="alert alert-warning mb-6" style={{ flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>Attendance Below 75% — Action Required!</div>
                  <div className="text-sm" style={{ color: 'rgba(253,230,138,0.8)', marginTop: 4 }}>
                    You must attend more classes in the following subjects to avoid attendance shortage.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.low_attendance_alerts.map(a => (
                  <div key={a.subject_code} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 16px'
                  }}>
                    <div>
                      <span style={{ fontWeight: 700 }}>{a.subject_code}</span>
                      <span style={{ color: 'rgba(253,230,138,0.7)', marginLeft: 8 }}>{a.subject_name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span className="badge badge-danger">{a.percentage}%</span>
                      {a.needed_classes > 0 && (
                        <span style={{ fontSize: '0.8rem', color: 'rgba(253,230,138,0.7)' }}>
                          Need {a.needed_classes} more class{a.needed_classes > 1 ? 'es' : ''} to reach 75%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overall stat */}
          <div className="grid-3 mb-6">
            <div className="card" style={{ textAlign: 'center', padding: '28px' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: pct >= 75 ? 'var(--success)' : 'var(--danger)', marginBottom: 8 }}>
                {pct}%
              </div>
              <div className="text-sm text-muted">Overall Attendance</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '28px' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--accent-light)', marginBottom: 8 }}>
                {data?.total_attended}
              </div>
              <div className="text-sm text-muted">Classes Attended</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '28px' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 8 }}>
                {(data?.total_held || 0) - (data?.total_attended || 0)}
              </div>
              <div className="text-sm text-muted">Classes Absent</div>
            </div>
          </div>

          {/* Subject Cards */}
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20 }}>📚 Subject-wise Attendance</h2>
          <div className="grid-2 mb-8">
            {data?.subjects?.map(s => (
              <div key={s.id} className={`card card-hover ${s.is_low ? 'danger-card' : ''}`}
                style={s.is_low ? { borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' } : {}}>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{s.name}</div>
                    <div className="text-xs text-muted mt-1">{s.code} · {s.faculty_name}</div>
                  </div>
                  <span className={`badge ${s.percentage >= 75 ? 'badge-success' : s.percentage >= 60 ? 'badge-warning' : 'badge-danger'}`}
                    style={{ fontSize: '1rem', padding: '6px 14px' }}>
                    {s.percentage}%
                  </span>
                </div>
                <ProgressBar percentage={s.percentage} />
                <div className="flex justify-between mt-3 text-xs text-muted">
                  <span>✅ {s.attended} attended</span>
                  <span>❌ {s.absent} absent</span>
                  <span>📅 {s.total} total</span>
                </div>
                {s.is_low && s.needed_to_75 > 0 && (
                  <div className="text-xs" style={{ color: 'var(--danger)', marginTop: 10, fontWeight: 600 }}>
                    ⚠️ Attend {s.needed_to_75} more consecutive class{s.needed_to_75 > 1 ? 'es' : ''} to reach 75%
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20 }}>🕐 Recent Attendance History</h2>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : data?.recent_activity?.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p>No attendance records yet.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Classroom</th>
                    <th>Date & Time</th>
                    <th>GPS Distance</th>
                    <th>AI Confidence</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recent_activity?.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.subject_name}</div>
                        <div className="text-xs text-muted">{r.subject_code}</div>
                      </td>
                      <td className="text-sm">{r.classroom_name}</td>
                      <td className="text-sm text-muted">{r.marked_at}</td>
                      <td><span className="badge badge-accent">{r.distance_meters}m</span></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="progress-bar" style={{ width: 60 }}>
                            <div className="progress-fill progress-green" style={{ width: `${r.face_confidence}%` }} />
                          </div>
                          <span className="text-xs">{r.face_confidence}%</span>
                        </div>
                      </td>
                      <td><span className="badge badge-success">{r.verification_status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

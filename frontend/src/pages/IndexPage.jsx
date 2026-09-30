import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'

const features = [
  { icon: '📡', title: 'Dynamic 5-Second QR', desc: 'Cryptographically signed rolling HMAC tokens. WhatsApp photo sharing cannot bypass this.' },
  { icon: '📍', title: 'GPS Geofencing', desc: 'Haversine distance calculation enforces ≤100m classroom boundary in real time.' },
  { icon: '🤖', title: 'AI Face Recognition', desc: 'OpenCV 5.0 NCC + histogram intersection biometric matching with ≥70% confidence threshold.' },
  { icon: '⏱️', title: '30-Min Auto Expiry', desc: 'Sessions automatically expire after 30 minutes with live circular countdown timers.' },
  { icon: '🔒', title: 'Single Submission Lock', desc: 'One attendance mark per student per session. Duplicate attempts are permanently blocked.' },
  { icon: '📊', title: 'Live Audit Dashboard', desc: 'Real-time attendance feed with student photos, GPS distance, and AI confidence scores.' },
]

const credentials = [
  { role: 'Faculty', name: 'Dr. Alan Turing', login: 'turing@cs.edu', password: 'faculty123' },
  { role: 'Faculty', name: 'Prof. Ada Lovelace', login: 'ada@cs.edu', password: 'faculty123' },
  { role: 'Student', name: 'Rahul Verma', login: '2024CS101', password: 'student123' },
  { role: 'Student', name: 'Priya Sharma', login: '2024CS102', password: 'student123' },
  { role: 'Student', name: 'Rohan Patel', login: '2024CS103', password: 'student123' },
]

export default function IndexPage() {
  return (
    <div className="page">
      <Navbar />

      {/* Hero */}
      <section style={{ padding: '80px 0 60px', textAlign: 'center' }}>
        <div className="container">
          <div className="animate-fade-in">
            <div className="section-badge" style={{ justifyContent: 'center', marginBottom: 20 }}>
              <span>🛡️</span> Anti-Proxy Attendance System
            </div>
            <h1 className="section-title" style={{ fontSize: '3.2rem', marginBottom: 24 }}>
              Attendance That <span>Cannot Be Faked</span>
            </h1>
            <p className="section-subtitle" style={{ margin: '0 auto 48px', textAlign: 'center' }}>
              SmartPresence AI combines dynamic QR codes, GPS geofencing, and AI facial recognition to create an unhackable attendance system for universities.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/faculty" className="btn btn-primary btn-lg">
                👨‍🏫 Faculty Portal
              </Link>
              <Link to="/student" className="btn btn-ghost btn-lg">
                📱 Student Portal
              </Link>
              <Link to="/dashboard" className="btn btn-ghost btn-lg">
                📊 Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '0 0 60px' }}>
        <div className="container">
          <div className="grid-3">
            {[
              { num: '5s', label: 'QR Rotation Speed' },
              { num: '100m', label: 'GPS Boundary' },
              { num: '70%+', label: 'Face Match Threshold' },
            ].map(s => (
              <div key={s.label} className="card" style={{ textAlign: 'center', padding: '32px' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-light)', marginBottom: 8 }}>{s.num}</div>
                <div className="text-muted text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '0 0 60px' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 className="section-title" style={{ fontSize: '2rem' }}>
              5 Layers of <span>Anti-Proxy Security</span>
            </h2>
          </div>
          <div className="grid-3">
            {features.map(f => (
              <div key={f.title} className="card card-hover">
                <div style={{ fontSize: '2rem', marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontWeight: 700, marginBottom: 10, fontSize: '1rem' }}>{f.title}</h3>
                <p className="text-muted text-sm" style={{ lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '0 0 60px' }}>
        <div className="container-sm">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 className="section-title" style={{ fontSize: '2rem' }}>How It Works</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { n: 1, role: 'Faculty', text: 'Logs in → selects subject → starts session → live QR displayed on projector' },
              { n: 2, role: 'Student', text: 'Scans QR → GPS verified → live selfie captured → AI face matched → attendance marked' },
              { n: 3, role: 'Faculty', text: 'Watches real-time feed → sees GPS distance + face confidence → exports CSV report' },
            ].map(s => (
              <div key={s.n} className="card flex gap-4 items-center">
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '1.1rem'
                }}>{s.n}</div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.role}</div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Test Credentials */}
      <section style={{ padding: '0 0 60px' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 className="section-title" style={{ fontSize: '2rem' }}>Test <span>Credentials</span></h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Role</th><th>Name</th><th>Login (Email / Roll No)</th><th>Password</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map(c => (
                  <tr key={c.login}>
                    <td><span className={`badge badge-${c.role === 'Faculty' ? 'accent' : 'success'}`}>{c.role}</span></td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--accent-light)' }}>{c.login}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{c.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}

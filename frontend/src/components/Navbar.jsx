import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const loc = useLocation()
  const active = (path) => loc.pathname === path ? 'nav-link active' : 'nav-link'

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <div className="brand-icon">🎓</div>
        Smart<span>Presence</span> AI
      </Link>
      <div className="navbar-links">
        <Link to="/" className={active('/')}>Home</Link>
        <Link to="/faculty" className={active('/faculty')}>Faculty</Link>
        <Link to="/student" className={active('/student')}>Student</Link>
        <Link to="/dashboard" className={active('/dashboard')}>Dashboard</Link>
      </div>
    </nav>
  )
}

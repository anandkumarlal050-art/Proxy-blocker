import { Link, useLocation, useNavigate } from 'react-router-dom'
import { GraduationCap, LogOut } from 'lucide-react'

export default function Navbar() {
  const loc = useLocation()
  const navigate = useNavigate()
  const active = (path) => loc.pathname === path ? 'nav-link active' : 'nav-link'

  const isFacultyLoggedIn = !!localStorage.getItem('faculty_user')
  const isStudentLoggedIn = !!localStorage.getItem('student_user')
  const isLoggedIn = isFacultyLoggedIn || isStudentLoggedIn

  const handleLogout = () => {
    // Clear all auth state
    localStorage.removeItem('token')
    localStorage.removeItem('faculty_user')
    localStorage.removeItem('faculty_session')
    localStorage.setItem('faculty_step', 'login')
    localStorage.removeItem('student_user')
    // Redirect to home
    navigate('/')
    // Force a page reload so all page-level state resets cleanly
    window.location.href = '/'
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <div className="brand-icon"><GraduationCap size={24} color="#fff" /></div>
        Smart<span>Presence</span> AI
      </Link>
      <div className="navbar-links">
        <Link to="/" className={active('/')}>Home</Link>
        <Link to="/faculty" className={active('/faculty')}>Faculty</Link>
        <Link to="/student" className={active('/student')}>Student</Link>
        <Link to="/dashboard" className={active('/dashboard')}>Dashboard</Link>
        {isLoggedIn && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 8 }}
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut size={15} style={{ display: 'inline', marginBottom: -2, marginRight: 4 }} />
            Logout
          </button>
        )}
      </div>
    </nav>
  )
}

import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import IndexPage from './pages/IndexPage'
import FacultyPage from './pages/FacultyPage'
import StudentPage from './pages/StudentPage'
import DashboardPage from './pages/DashboardPage'
import api from './api'

const FIVE_MINUTES = 5 * 60 * 1000

export default function App() {
  useEffect(() => {
    // Keep Render free tier alive — ping every 5 minutes
    const ping = () => api.get('/health').catch(() => {})
    ping() // ping immediately on load
    const interval = setInterval(ping, FIVE_MINUTES)
    return () => clearInterval(interval)
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/faculty" element={<FacultyPage />} />
        <Route path="/student" element={<StudentPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  )
}

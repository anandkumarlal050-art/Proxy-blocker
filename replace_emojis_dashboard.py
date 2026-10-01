import re

replacements = [
    (r"import api from '\.\./api'", "import api from '../api'\nimport { \n  BarChart3, AlertTriangle, BookOpen, Check, X, Calendar, Clock, ClipboardList\n} from 'lucide-react'"),
    (r"📊 Student Dashboard", "<><BarChart3 size={16} style={{display:'inline', marginBottom:-3, marginRight:6}}/> Student Dashboard</>"),
    (r"⚠️ \{error\}", "<><AlertTriangle size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> {error}</>"),
    (r"'📊 View Dashboard'", "<><BarChart3 size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> View Dashboard</>"),
    (r"⚠️", "<AlertTriangle size={24} style={{display:'inline', marginRight: 8, color: 'var(--warning)'}} />"),
    (r"📚 Subject-wise Attendance", "<><BookOpen size={18} style={{display:'inline', marginBottom:-4, marginRight:6}}/> Subject-wise Attendance</>"),
    (r"✅ \{s\.attended\}", "<><Check size={12} style={{display:'inline', marginBottom:-2, marginRight:2}}/> {s.attended}</>"),
    (r"❌ \{s\.absent\}", "<><X size={12} style={{display:'inline', marginBottom:-2, marginRight:2}}/> {s.absent}</>"),
    (r"📅 \{s\.total\}", "<><Calendar size={12} style={{display:'inline', marginBottom:-2, marginRight:2}}/> {s.total}</>"),
    (r"🕐 Recent Attendance History", "<><Clock size={18} style={{display:'inline', marginBottom:-4, marginRight:6}}/> Recent Attendance History</>"),
    (r"📋", "<ClipboardList size={40} color=\"var(--muted)\" />")
]

with open('frontend/src/pages/DashboardPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

for old, new in replacements:
    content = re.sub(old, new, content)

# One ⚠️ is not matching the second replacement if it's the exact string. Let's fix the second replacement for line 114
content = re.sub(r"<span style={{ fontSize: '1\.5rem' }}>⚠️</span>", "<span style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center' }}><AlertTriangle size={24} /></span>", content)
content = re.sub(r"⚠️ Attend", "<AlertTriangle size={12} style={{display:'inline', marginBottom:-2, marginRight:2}}/> Attend", content)

with open('frontend/src/pages/DashboardPage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

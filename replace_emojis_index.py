import re

replacements = [
    (r"import Navbar from '\.\./components/Navbar'", "import Navbar from '../components/Navbar'\nimport { Radio, MapPin, ScanFace, Clock, Lock, LayoutDashboard, Shield, GraduationCap, Smartphone, BarChart3 } from 'lucide-react'"),
    (r"'📡'", "<Radio size={32} color=\"var(--accent)\" />"),
    (r"'📍'", "<MapPin size={32} color=\"var(--accent)\" />"),
    (r"'🤖'", "<ScanFace size={32} color=\"var(--accent)\" />"),
    (r"'⏱️'", "<Clock size={32} color=\"var(--accent)\" />"),
    (r"'🔒'", "<Lock size={32} color=\"var(--accent)\" />"),
    (r"'📊'", "<LayoutDashboard size={32} color=\"var(--accent)\" />"),
    (r"<span>🛡️</span>", "<span style={{display: 'inline-flex', verticalAlign: 'middle', marginRight: 8}}><Shield size={20} color=\"var(--accent)\" /></span>"),
    (r"👨‍🏫 Faculty Portal", "<><GraduationCap size={18} style={{display:'inline', marginBottom:-4, marginRight:6}}/> Faculty Portal</>"),
    (r"📱 Student Portal", "<><Smartphone size={18} style={{display:'inline', marginBottom:-4, marginRight:6}}/> Student Portal</>"),
    (r"📊 Dashboard", "<><BarChart3 size={18} style={{display:'inline', marginBottom:-4, marginRight:6}}/> Dashboard</>")
]

with open('frontend/src/pages/IndexPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

for old, new in replacements:
    content = re.sub(old, new, content)

with open('frontend/src/pages/IndexPage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

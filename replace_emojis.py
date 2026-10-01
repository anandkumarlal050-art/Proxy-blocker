import re

replacements = [
    (r"import api from '../api'", "import api from '../api'\nimport { \n  GraduationCap, AlertTriangle, Key, Radio, MapPin, Play, BookOpen, Download,\n  UserPlus, ArrowLeft, Camera, CircleDot, StopCircle, Smartphone, Copy, ExternalLink,\n  Clock, Users\n} from 'lucide-react'"),
    (r"👨‍🏫 Faculty Portal", "<><GraduationCap size={16} style={{display:'inline', marginBottom:-3, marginRight:6}}/> Faculty Portal</>"),
    (r"⚠️ \{error\}", "<><AlertTriangle size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> {error}</>"),
    (r"'🔑 Sign In'", "<><Key size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Sign In</>"),
    (r"👋 Welcome", "Welcome"),
    (r"📡 Start Attendance Session", "<><Radio size={18} style={{display:'inline', marginBottom:-4, marginRight:6}}/> Start Attendance Session</>"),
    (r"📍 Use My GPS Location", "<><MapPin size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Use My GPS Location</>"),
    (r"'🚀 Start 30-Min Session'", "<><Play size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Start 30-Min Session</>"),
    (r"📚 Your Subjects", "<><BookOpen size={18} style={{display:'inline', marginBottom:-4, marginRight:6}}/> Your Subjects</>"),
    (r"⬇️ Export CSV Report", "<><Download size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Export CSV Report</>"),
    (r"👤 Register New Student", "<><UserPlus size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Register New Student</>"),
    (r"← Back to Dashboard", "<><ArrowLeft size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Back to Dashboard</>"),
    (r"📸 Capture Reference", "<><Camera size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Capture Reference</>"),
    (r"🔴 LIVE SESSION", "<><CircleDot size={18} color=\"var(--danger)\" style={{display:'inline', marginBottom:-4, marginRight:6}}/> LIVE SESSION</>"),
    (r"📍 \{qrData\?\.classroom_name\}", "<><MapPin size={14} style={{display:'inline', marginBottom:-2, marginRight:4}}/> {qrData?.classroom_name}</>"),
    (r"⬇️ CSV", "<><Download size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> CSV</>"),
    (r"🛑 End Session", "<><StopCircle size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> End Session</>"),
    (r"📱 Live QR Code", "<><Smartphone size={18} style={{display:'inline', marginBottom:-4, marginRight:6}}/> Live QR Code</>"),
    (r"📋 Copy Link", "<><Copy size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Copy Link</>"),
    (r"🔗 Open Student Portal", "<><ExternalLink size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Open Student Portal</>"),
    (r"⏱️", "<Clock size={40} color=\"var(--muted)\" />"),
    (r"👥 Live Attendance Feed", "<><Users size={18} style={{display:'inline', marginBottom:-4, marginRight:6}}/> Live Attendance Feed</>"),
    (r"🎓", "<GraduationCap size={40} color=\"var(--muted)\" />")
]

with open('frontend/src/pages/FacultyPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

for old, new in replacements:
    content = re.sub(old, new, content)

with open('frontend/src/pages/FacultyPage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

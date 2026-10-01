import re

replacements = [
    (r"import api from '../api'", "import api from '../api'\nimport { \n  Smartphone, Key, AlertTriangle, MapPin, Radio, School, Home, Camera, \n  RefreshCw, Upload, CheckCircle2, XCircle\n} from 'lucide-react'"),
    (r"📱 Student Attendance", "<><Smartphone size={16} style={{display:'inline', marginBottom:-3, marginRight:6}}/> Student Attendance</>"),
    (r"✅ QR Session detected:", "<><CheckCircle2 size={16} color=\"var(--success)\" style={{display:'inline', marginBottom:-3, marginRight:4}}/> QR Session detected:</>"),
    (r"⚠️ No QR session found\. Scan the faculty QR code first, then log in\.", "<><AlertTriangle size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> No QR session found. Scan the faculty QR code first, then log in.</>"),
    (r"⚠️ \{error\}", "<><AlertTriangle size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> {error}</>"),
    (r"'🔑 Sign In'", "<><Key size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Sign In</>"),
    (r"⚠️ No QR session found in URL\. Please scan the live QR code from the faculty dashboard\.", "<><AlertTriangle size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> No QR session found in URL. Please scan the live QR code from the faculty dashboard.</>"),
    (r"📍 GPS Location Verification", "<><MapPin size={18} style={{display:'inline', marginBottom:-4, marginRight:6}}/> GPS Location Verification</>"),
    (r"✅ GPS acquired:", "<><CheckCircle2 size={16} color=\"var(--success)\" style={{display:'inline', marginBottom:-3, marginRight:4}}/> GPS acquired:</>"),
    (r"❌ GPS failed\. Try simulators below\.", "<><XCircle size={16} color=\"var(--danger)\" style={{display:'inline', marginBottom:-3, marginRight:4}}/> GPS failed. Try simulators below.</>"),
    (r"📡 Get My GPS", "<><Radio size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Get My GPS</>"),
    (r"🏫 Simulate Inside \(12m\)", "<><School size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Simulate Inside (12m)</>"),
    (r"🏠 Simulate Outside \(550m\)", "<><Home size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Simulate Outside (550m)</>"),
    (r"✅ GPS Verified — Continue to Camera →", "<><CheckCircle2 size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> GPS Verified — Continue to Camera →</>"),
    (r"🤖 AI Face Verification", "AI Face Verification"),
    (r"📸 Capture Photo", "<><Camera size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Capture Photo</>"),
    (r"🔄 Retake", "<><RefreshCw size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Retake</>"),
    (r"'✅ Submit Attendance'", "<><Upload size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Submit Attendance</>"),
    (r"\{result\.success \? '✅' : '❌'\}", "{result.success ? <CheckCircle2 size={64} color=\"var(--success)\"/> : <XCircle size={64} color=\"var(--danger)\"/>}"),
    (r"🔄 Try Again", "<><RefreshCw size={16} style={{display:'inline', marginBottom:-3, marginRight:4}}/> Try Again</>")
]

with open('frontend/src/pages/StudentPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

for old, new in replacements:
    content = re.sub(old, new, content)

with open('frontend/src/pages/StudentPage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

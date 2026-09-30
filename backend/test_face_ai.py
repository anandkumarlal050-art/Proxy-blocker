import sys
sys.path.append(r"c:\Users\anand\OneDrive\Desktop\Attendence\backend")
from face_ai import verify_faces
import base64
from PIL import Image
import io

# Create dummy image in memory
img = Image.new('RGB', (128, 128), color = 'red')
buffered = io.BytesIO()
img.save(buffered, format="JPEG")
img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

# Test verify_faces
is_match, conf, detail = verify_faces(img_str, "/static/images/students/rahul.jpg")
print(f"Match: {is_match}, Conf: {conf}, Detail: {detail}")

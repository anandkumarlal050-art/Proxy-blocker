import asyncio
import json
import base64
import io
from PIL import Image

sys_path = r"c:\Users\anand\OneDrive\Desktop\Attendence\backend"
import sys
sys.path.append(sys_path)
from face_ai import verify_faces

def run():
    img = Image.new('RGB', (128, 128), color = 'red')
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG")
    b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
    img_uri = "data:image/jpeg;base64," + b64

    is_match, conf, details = verify_faces(img_uri, "/static/images/students/rahul.jpg")
    print(f"Match: {is_match}, Conf: {conf}, Details: {details}")

if __name__ == "__main__":
    run()

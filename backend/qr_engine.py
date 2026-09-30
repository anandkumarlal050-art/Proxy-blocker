import hmac
import hashlib
import time
import io
import base64
import qrcode
from PIL import Image

SECRET_KEY = b"secure_dynamic_attendance_rotator_2026_key"

def get_current_slot(interval: int = 5) -> int:
    """Returns the current 5-second slot index."""
    return int(time.time() // interval)

def generate_token(session_id: str, slot: int = None, interval: int = 5) -> str:
    """Generates a cryptographic 16-character token for the given session and 5s slot."""
    if slot is None:
        slot = get_current_slot(interval)
    payload = f"{session_id}:{slot}".encode("utf-8")
    return hmac.new(SECRET_KEY, payload, hashlib.sha256).hexdigest()[:16]

def validate_token(session_id: str, token: str, interval: int = 5, tolerance_slots: int = 3) -> bool:
    """
    Validates if the provided token matches the current slot or recent slots.
    Tolerance of 3 slots (15 seconds) covers camera scan and network latency.
    """
    if not token or not session_id:
        return False
    current_slot = get_current_slot(interval)
    # Check current slot and previous tolerance_slots
    for offset in range(tolerance_slots + 1):
        slot = current_slot - offset
        valid_token = generate_token(session_id, slot, interval)
        if hmac.compare_digest(valid_token.lower(), token.lower()):
            return True
    return False

def generate_qr_image_base64(data: str) -> str:
    """Generates a clean, high-resolution QR code PNG encoded as base64 data URI."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=3,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0f172a", back_color="#ffffff")
    
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"

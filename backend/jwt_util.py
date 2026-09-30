import json
import base64
import hmac
import hashlib
import time

SECRET_KEY = "my_super_secret_jwt_key"

def b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def create_jwt(payload: dict, expires_in: int = 3600*24) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload["exp"] = int(time.time()) + expires_in
    
    header_b64 = b64url_encode(json.dumps(header).encode('utf-8'))
    payload_b64 = b64url_encode(json.dumps(payload).encode('utf-8'))
    
    signature = hmac.new(
        SECRET_KEY.encode('utf-8'),
        f"{header_b64}.{payload_b64}".encode('utf-8'),
        hashlib.sha256
    ).digest()
    
    signature_b64 = b64url_encode(signature)
    
    return f"{header_b64}.{payload_b64}.{signature_b64}"

def verify_jwt(token: str) -> dict:
    parts = token.split(".")
    if len(parts) != 3:
        return None
        
    header_b64, payload_b64, signature_b64 = parts
    
    signature = hmac.new(
        SECRET_KEY.encode('utf-8'),
        f"{header_b64}.{payload_b64}".encode('utf-8'),
        hashlib.sha256
    ).digest()
    
    expected_signature_b64 = b64url_encode(signature)
    
    if not hmac.compare_digest(signature_b64, expected_signature_b64):
        return None
        
    # add padding if needed
    payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
    payload_json = base64.urlsafe_b64decode(payload_b64).decode('utf-8')
    payload = json.loads(payload_json)
    
    if payload.get("exp", 0) < time.time():
        return None
        
    return payload

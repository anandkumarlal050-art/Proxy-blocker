import os
import base64
import io
import math
from PIL import Image

try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    try:
        import numpy as np
    except ImportError:
        np = None

# Path to Haar cascade (look in multiple places)
_CASCADE_PATHS = [
    os.path.join(os.path.dirname(__file__), "haarcascade_frontalface_default.xml"),
    os.path.join(os.path.dirname(__file__), "..", "haarcascade_frontalface_default.xml"),
    os.path.join(os.path.dirname(__file__), "..", "static", "haarcascade_frontalface_default.xml"),
]
_CASCADE_PATH = None
for p in _CASCADE_PATHS:
    if os.path.exists(p):
        _CASCADE_PATH = p
        break


def base64_to_pil(base64_str: str) -> Image.Image:
    """Converts a base64 image data string (with or without data:image/... prefix) to PIL Image."""
    if "," in base64_str:
        base64_str = base64_str.split(",", 1)[1]
    image_bytes = base64.b64decode(base64_str)
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


def _detect_face_region(gray_img):
    """
    Detects the largest face in a grayscale numpy image using Haar cascade.
    Returns a cropped grayscale face region, or None if no face detected.
    """
    if not CV2_AVAILABLE or _CASCADE_PATH is None:
        return None
    try:
        face_cascade = cv2.CascadeClassifier(_CASCADE_PATH)
        faces = face_cascade.detectMultiScale(
            gray_img,
            scaleFactor=1.1,
            minNeighbors=4,
            minSize=(40, 40),
            flags=cv2.CASCADE_SCALE_IMAGE
        )
        if len(faces) == 0:
            return None
        # Pick the largest face
        largest = max(faces, key=lambda r: r[2] * r[3])
        x, y, w, h = largest
        # Add 15% padding
        pad_x = int(w * 0.15)
        pad_y = int(h * 0.15)
        x1 = max(0, x - pad_x)
        y1 = max(0, y - pad_y)
        x2 = min(gray_img.shape[1], x + w + pad_x)
        y2 = min(gray_img.shape[0], y + h + pad_y)
        return gray_img[y1:y2, x1:x2]
    except Exception:
        return None


def validate_photo_for_registration(image_b64: str):
    """
    Validates that a photo is suitable for face registration.
    Returns (is_valid: bool, message: str)
    """
    try:
        pil_img = base64_to_pil(image_b64)
        w, h = pil_img.size
        if w < 100 or h < 100:
            return False, "Image too small. Please use a higher resolution photo."

        if CV2_AVAILABLE and np is not None:
            img_np = np.array(pil_img)
            gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
            face = _detect_face_region(gray)
            if face is None:
                return False, "No face detected in the photo. Please ensure your face is clearly visible, well-lit, and centered."
            return True, "Face detected and validated successfully."
        else:
            # Without OpenCV, accept the photo but warn
            return True, "Photo accepted (face detection unavailable — ensure face is clearly visible)."
    except Exception as e:
        return False, f"Image validation error: {str(e)}"


def verify_faces(live_image_b64: str, reference_image_path: str):
    """
    Verifies the live captured selfie against the student's stored reference photo.
    Uses OpenCV Haar cascade face detection + multi-metric comparison.
    Returns: (is_match: bool, confidence_score: float, details: str)
    """
    try:
        # Load live image
        live_pil = base64_to_pil(live_image_b64)

        # Load reference photo from local disk
        base_name = os.path.basename(reference_image_path)
        possible_paths = [
            reference_image_path if os.path.isabs(reference_image_path) else "",
            os.path.join(os.path.dirname(__file__), reference_image_path.lstrip("/\\")),
            os.path.join(os.path.dirname(__file__), "static", "images", "students", base_name),
            os.path.join(os.path.dirname(__file__), "static", "static", "images", "students", base_name),
            os.path.join(os.path.dirname(__file__), "..", "static", "images", "students", base_name)
        ]

        found_path = None
        for p in possible_paths:
            if p and os.path.exists(p):
                found_path = p
                break

        if not found_path:
            return False, 0.0, f"Reference image not found: {reference_image_path}"

        ref_pil = Image.open(found_path).convert("RGB")

        # ── OpenCV pipeline with Haar face detection ──
        if CV2_AVAILABLE and np is not None:
            try:
                live_np = np.array(live_pil)
                ref_np = np.array(ref_pil)

                live_gray = cv2.cvtColor(live_np, cv2.COLOR_RGB2GRAY)
                ref_gray = cv2.cvtColor(ref_np, cv2.COLOR_RGB2GRAY)

                # Try to extract face regions
                live_face = _detect_face_region(live_gray)
                ref_face = _detect_face_region(ref_gray)

                if live_face is not None and ref_face is not None:
                    # Both faces detected — compare face crops
                    live_region = cv2.resize(live_face, (128, 128))
                    ref_region = cv2.resize(ref_face, (128, 128))
                    use_face_crop = True
                else:
                    # Fall back to full image comparison
                    live_region = cv2.resize(live_gray, (128, 128))
                    ref_region = cv2.resize(ref_gray, (128, 128))
                    use_face_crop = False

                # Histogram equalization for lighting normalization
                live_eq = cv2.equalizeHist(live_region)
                ref_eq = cv2.equalizeHist(ref_region)

                # 1. Normalized Cross-Correlation (NCC)
                res = cv2.matchTemplate(live_eq, ref_eq, cv2.TM_CCOEFF_NORMED)
                ncc_val = float(res[0][0])
                # NCC: -1 to 1, map to 0-100
                ncc_score = (ncc_val + 1.0) / 2.0 * 100.0

                # 2. Histogram Intersection
                hist1 = cv2.calcHist([live_eq], [0], None, [64], [0, 256])
                hist2 = cv2.calcHist([ref_eq], [0], None, [64], [0, 256])
                cv2.normalize(hist1, hist1, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
                cv2.normalize(hist2, hist2, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
                hist_corr = float(cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL))
                hist_score = (hist_corr + 1.0) / 2.0 * 100.0

                # 3. Structural Similarity using SSIM approximation via block differences
                # Divide into 16x16 blocks and compute local std-normalized correlation
                block_size = 16
                block_scores = []
                for by in range(0, 128, block_size):
                    for bx in range(0, 128, block_size):
                        b1 = live_eq[by:by+block_size, bx:bx+block_size].astype(float)
                        b2 = ref_eq[by:by+block_size, bx:bx+block_size].astype(float)
                        m1, m2 = b1.mean(), b2.mean()
                        s1 = b1.std() + 1e-6
                        s2 = b2.std() + 1e-6
                        n1 = (b1 - m1) / s1
                        n2 = (b2 - m2) / s2
                        block_corr = float(np.mean(n1 * n2))
                        block_scores.append(block_corr)
                structural_score = (sum(block_scores) / len(block_scores) + 1.0) / 2.0 * 100.0

                # Weighted composite (face crop gets higher NCC weight)
                if use_face_crop:
                    composite = ncc_score * 0.50 + hist_score * 0.20 + structural_score * 0.30
                else:
                    composite = ncc_score * 0.40 + hist_score * 0.30 + structural_score * 0.30

                # DO NOT artificially clamp to pass threshold — use real scores
                # A real match of the same person should score naturally > 70
                # Different people will score lower due to structural differences
                final_score = round(min(99.5, max(0.0, composite)), 1)
                is_match = final_score >= 65.0

                face_info = "face-crop " if use_face_crop else "full-frame "
                method = f"OpenCV Haar {face_info}(NCC+Hist+Structural)"
                return is_match, final_score, method

            except Exception as cv_err:
                pass  # Fall through to PIL fallback

        # ── PIL Pearson Correlation Fallback ──
        live_small = live_pil.convert("L").resize((64, 64))
        ref_small = ref_pil.convert("L").resize((64, 64))

        live_pixels = list(live_small.getdata())
        ref_pixels = list(ref_small.getdata())

        mean_l = sum(live_pixels) / len(live_pixels)
        mean_r = sum(ref_pixels) / len(ref_pixels)

        numerator = sum((l - mean_l) * (r - mean_r) for l, r in zip(live_pixels, ref_pixels))
        denom_l = math.sqrt(sum((l - mean_l) ** 2 for l in live_pixels))
        denom_r = math.sqrt(sum((r - mean_r) ** 2 for r in ref_pixels))

        if denom_l * denom_r > 0:
            pearson = numerator / (denom_l * denom_r)
        else:
            pearson = 0.0

        # Map pearson (-1 to 1) to score (0 to 100) without artificial clamping
        raw_score = (pearson + 1.0) / 2.0 * 100.0
        final_score = round(min(99.0, max(0.0, raw_score)), 1)
        is_match = final_score >= 65.0

        return is_match, final_score, "PIL Pearson Correlation (OpenCV unavailable)"

    except Exception as e:
        return False, 0.0, f"Face verification error: {str(e)}"

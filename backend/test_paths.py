import os

__file__ = r"c:\Users\anand\OneDrive\Desktop\Attendence\backend\face_ai.py"

reference_image_path = "/static/images/students/rahul.jpg"
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

print("Possible Paths:")
for p in possible_paths:
    print(p, "Exists:", os.path.exists(p) if p else False)

print("Found path:", found_path)

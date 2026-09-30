import os
import shutil

backend_dir = r"c:\Users\anand\OneDrive\Desktop\Attendence\backend"
static_static_dir = os.path.join(backend_dir, "static", "static")
static_dir = os.path.join(backend_dir, "static")

if os.path.exists(static_static_dir):
    for item in os.listdir(static_static_dir):
        s = os.path.join(static_static_dir, item)
        d = os.path.join(static_dir, item)
        if os.path.exists(d):
            if os.path.isdir(d):
                shutil.rmtree(d)
            else:
                os.remove(d)
        shutil.move(s, d)
    
    os.rmdir(static_static_dir)
    print("Successfully moved static files to backend/static/")
else:
    print("No static/static directory found.")

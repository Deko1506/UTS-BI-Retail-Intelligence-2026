"""Verify deployment entry points and production state-change protection."""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import app as appmod

app = appmod.app
failures = []


def check(name, condition):
    print(f"[{'PASS' if condition else 'FAIL'}] {name}")
    if not condition:
        failures.append(name)


project = Path(__file__).resolve().parent.parent
static_cover = (project / "docs" / "index.html").read_text(encoding="utf-8")
workflow = (project / ".github" / "workflows" / "pages.yml").read_text(encoding="utf-8")
render = (project / "render.yaml").read_text(encoding="utf-8")

check("Pages entry is a static cover", "<title>Retail Intelligence" in static_cover and "{{" not in static_cover)
check("Pages cover uses configurable app URL", "RETAIL_APP_URL" in static_cover)
check("Pages deploy packages cover assets only", "cp docs/index.html docs/config.js site/" in workflow)
check("Flask deployment uses production server", "gunicorn" in render and "FLASK_SECRET_KEY" in render)
check("Flask deployment uses one worker for in-memory sessions", "--workers 1" in render)

old_testing = app.config["TESTING"]
app.config["TESTING"] = False
try:
    with app.test_client() as client:
        page = client.get("/")
        html = page.get_data(as_text=True)
        token = re.search(r'name="csrf_token" value="([^"]+)"', html)
        check("Production cover issues CSRF token", token is not None)
        rejected = client.post("/start", data={"analyst": "Tester"})
        check("Production rejects missing CSRF token", rejected.status_code == 403)
        accepted = client.post("/start", data={"analyst": "Tester", "csrf_token": token.group(1)})
        check("Production accepts matching CSRF token", accepted.status_code in (302, 303))
        check("Security headers are sent", page.headers.get("X-Frame-Options") == "DENY")
finally:
    app.config["TESTING"] = old_testing

if failures:
    print(f"FAILED: {failures}")
    sys.exit(1)
print("ALL DEPLOYMENT CHECKS PASSED")

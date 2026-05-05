"""
Live smoke test against the running uvicorn server.
Tests: health, CORS preflight, 401 shape, 422 shape, upload endpoint presence.
"""
import urllib.request
import urllib.error
import json
import sys

BASE = "http://127.0.0.1:8000"
API  = f"{BASE}/api/v1"

PASS = []
FAIL = []

def check(name, ok, detail=""):
    if ok:
        PASS.append(name)
        print(f"  [OK]  {name}")
    else:
        FAIL.append(name)
        print(f"  [ERR] {name}: {detail}")

def get(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())
    except Exception as ex:
        return None, str(ex)

def post(url, body, headers=None):
    data = json.dumps(body).encode()
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, data=data, headers=h, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())
    except Exception as ex:
        return None, str(ex)

print("=" * 50)
print("LIVE SMOKE TEST — Vendor Portal API")
print("=" * 50)

# 1. Health check
status, body = get(f"{BASE}/")
check("Root endpoint reachable", status == 200)

# 2. CORS header present on preflight
try:
    req = urllib.request.Request(
        f"{API}/auth/login",
        method="OPTIONS",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST"}
    )
    with urllib.request.urlopen(req, timeout=5) as r:
        cors = r.getheader("Access-Control-Allow-Origin", "")
    check("CORS allows localhost:3000", cors == "http://localhost:3000", cors)
except Exception as ex:
    check("CORS allows localhost:3000", False, str(ex))

# 3. Protected endpoint returns 401 JSON (not HTML)
status, body = get(f"{API}/orders")
check("401 returns JSON (not HTML)", isinstance(body, dict), str(body))
check("401 has 'status' key", isinstance(body, dict) and "status" in body, str(body))

# 4. Login with bad credentials returns 401 or 422 with proper envelope
status, body = post(f"{API}/auth/login", {"email": "bad@bad.com", "password": "wrong", "role": "vendor"})
check("Bad login returns 4xx", status in (401, 422, 400))
check("Bad login body has 'message' key", isinstance(body, dict) and "message" in body, str(body))

# 5. 422 validation shape — missing required field
status, body = post(f"{API}/auth/login", {"email": "bad@bad.com"})  # missing password, role
check("422 Pydantic error is JSON envelope", isinstance(body, dict) and "message" in body, str(body))

# 6. Upload endpoint exists (returns 401 or 422, not 404)
status, body = get(f"{API}/uploads/po-document")
check("Upload endpoint registered (not 404)", status != 404, f"status={status}")

# 7. Static files mount doesn't crash server
status, body = get(f"{BASE}/uploads/files/nonexistent.pdf")
check("Static mount returns 404 (not 500)", status == 404, f"status={status}")

print()
print(f"RESULTS: {len(PASS)} passed, {len(FAIL)} failed")

if FAIL:
    print("\nFailed checks:")
    for f in FAIL:
        print(f"  - {f}")
    sys.exit(1)
else:
    print("ALL LIVE CHECKS PASSED")

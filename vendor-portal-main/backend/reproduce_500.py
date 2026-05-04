
import urllib.request
import json
import sys

BASE = "http://127.0.0.1:8000"
API  = f"{BASE}/api/v1"

def post(url, body):
    data = json.dumps(body).encode()
    h = {"Content-Type": "application/json"}
    req = urllib.request.Request(url, data=data, headers=h, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())
    except Exception as ex:
        return None, str(ex)

payload = {
    "role": "vendor",
    "org_name": "Test Org",
    "email": "test-vendor-123@example.com",
    "password": "password123",
    "confirm_password": "password123",
    "first_name": "Test",
    "last_name": "Vendor",
    "phone": "1234567890",
    "address_line1": "123 Street",
    "city": "City",
    "state": "State",
    "country": "Country",
    "postal_code": "12345"
}

print(f"Testing registration with payload: {json.dumps(payload, indent=2)}")
status, body = post(f"{API}/auth/register", payload)
print(f"Status: {status}")
print(f"Body: {json.dumps(body, indent=2)}")

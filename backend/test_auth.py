"""Live auth tests after bcrypt fix."""
import urllib.request, urllib.error, json, time, sys

API = 'http://127.0.0.1:8000/api/v1'

def post(url, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers={'Content-Type':'application/json'}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

results = []

# 1. bcrypt hash/verify sanity
from app.core.security import hash_password, verify_password
h = hash_password('hello123')
ok1 = verify_password('hello123', h) and not verify_password('wrong', h)
results.append(('bcrypt hash/verify', ok1))

# 2. Register new vendor
email = 'test{}@vendor.com'.format(int(time.time()))
s, b = post(API + '/auth/register', {
    'role': 'vendor', 'org_name': 'Test Corp', 'email': email,
    'password': 'TestPass1!', 'confirm_password': 'TestPass1!',
    'first_name': 'John', 'last_name': 'Doe'
})
results.append(('Register vendor (200)', s == 200))
print('Register:', s, b.get('message', str(b)[:80]))

# 3. Admin login
s, b = post(API + '/auth/admin/login', {
    'email': 'admin@vendorhub.com', 'password': 'admin123', 'role': 'admin'
})
results.append(('Admin login (200)', s == 200))
print('Admin login:', s, b.get('message', str(b)[:80]))
if s == 200:
    print('  token present:', 'access_token' in b.get('data', {}))

# Summary
print()
for name, ok in results:
    print('  [OK]  ' + name if ok else '  [ERR] ' + name)

if all(ok for _, ok in results):
    print('\nALL AUTH TESTS PASSED')
else:
    sys.exit(1)

import urllib.request
import json

url = "http://127.0.0.1:8000/api/v1/auth/login"
data = json.dumps({"email": "admin@example.com", "password": "password"}).encode()
req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")

# Wait, I need a manufacturer's token. 
# Better yet, I can just inspect the latest error in the application log if there is one.

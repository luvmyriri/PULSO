import requests
r = requests.post('http://localhost:33159/api/auth/login', data={'username': 'juan@example.com', 'password': 'password123'}, timeout=5)
print('status:', r.status_code)
print('response:', r.text[:300])

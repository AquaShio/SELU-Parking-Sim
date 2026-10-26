import urllib.request
import json

url = "https://api.concept3d.com/categories/104752?map=2329&children&key=0001085cc708b9cef47080f064612ca5"
headers = {"User-Agent": "Mozilla/5.0"}
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))

up_locs = data.get('children', {}).get('locations', [])
print(f"Total official Concept3D Upperclass lots: {len(up_locs)}")
for loc in up_locs:
    print(f"  [{loc['id']}] {loc['name']}")

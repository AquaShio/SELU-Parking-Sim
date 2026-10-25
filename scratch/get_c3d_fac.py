import urllib.request
import json

url = "https://api.concept3d.com/categories/104746?map=2329&children&key=0001085cc708b9cef47080f064612ca5"
headers = {"User-Agent": "Mozilla/5.0"}
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))

fac_locs = data.get('children', {}).get('locations', [])
print(f"Total official Concept3D Faculty/Staff lots: {len(fac_locs)}")
with open('scratch/c3d_faculty_lots.json', 'w', encoding='utf-8') as f:
    json.dump(fac_locs, f, indent=2)

for loc in fac_locs:
    print(f"  [{loc['id']}] {loc['name']}")

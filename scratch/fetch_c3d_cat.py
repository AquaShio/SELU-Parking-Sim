import urllib.request
import json

url = "https://api.concept3d.com/categories?map=2329&children=true&key=0001085c708c4235b77c99fb5241822f"
headers = {"User-Agent": "Mozilla/5.0"}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        with open('scratch/concept3d_categories.json', 'w', encoding='utf-8') as out:
            json.dump(data, out, indent=2)
        print("Success fetching categories:", len(data))
except Exception as e:
    print("Error:", e)

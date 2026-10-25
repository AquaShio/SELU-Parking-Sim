import json

with open('backend/data/maps/selu_campus.json') as f:
    d = json.load(f)

# Find stalls in the top-left area of Image 1:
# Anzalone is at x=8835, y=9667.
# Top-left of Image 1 is around x=8500..8800, y=9400..9600.
top_left_stalls = []
for lot in d['lots']:
    for s in lot.get('stalls', []):
        if 8400 <= s['x'] <= 8800 and 9300 <= s['y'] <= 9600:
            top_left_stalls.append((lot['id'], lot['name'], s['id'], s['x'], s['y'], s['stall_type']))

print(f"Found {len(top_left_stalls)} stalls in top-left region:")
for item in top_left_stalls:
    print(" ", item)

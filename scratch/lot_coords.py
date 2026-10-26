import json

with open('backend/data/maps/selu_campus.json') as f:
    d = json.load(f)

for lot in d['lots']:
    if any(k in lot['name'].lower() for k in ['fayard', 'anzalone', 'mane', 'vickers']):
        stalls = lot.get('stalls', [])
        if stalls:
            xs = [s['x'] for s in stalls]
            ys = [s['y'] for s in stalls]
            print(f"{lot['id']} ({lot['name']}): {len(stalls)} stalls, x: [{min(xs):.1f}, {max(xs):.1f}], y: [{min(ys):.1f}, {max(ys):.1f}]")

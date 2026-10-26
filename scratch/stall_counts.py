import json

with open('backend/data/maps/selu_campus.json', encoding='utf-8') as f:
    d = json.load(f)

counts = {}
for lot in d.get('lots', []):
    for s in lot.get('stalls', []):
        t = s.get('stall_type', 'unknown')
        counts[t] = counts.get(t, 0) + 1

print("Current stall breakdown across campus:")
for t, c in sorted(counts.items()):
    print(f"  {t:15}: {c}")

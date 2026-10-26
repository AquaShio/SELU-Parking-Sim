import json

fac_lots = json.load(open('scratch/c3d_faculty_lots.json', encoding='utf-8'))
for loc in fac_lots:
    if loc['id'] == 1149000:
        print("Found Fayard Hall Lot in C3D Faculty/Staff:")
        print(json.dumps(loc['shape'], indent=2))
        print("Description:", loc.get('description'))
        print("Tags:", loc.get('tags'))

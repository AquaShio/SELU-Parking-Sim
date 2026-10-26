import json
from PIL import Image

# In Image 1, let's examine the diagonal lot between Anzalone Hall and the road:
# Anzalone Hall right wall is at x = 8835.7 + 90.0 = 8925.7, or building polygon extends to ~9000.
# The diagonal stalls are between x = 9200 and 9450, y = 9560 and 9800.
# Let's inspect the two rows of diagonal stalls from Image 1:
# Row 1 (upper diagonal, angled ~68 deg):
# Row 2 (lower diagonal, angled ~68 deg):

# Let's also check all trees near Anzalone to make sure no stalls overlap trees!
with open('backend/data/maps/selu_campus.json') as f:
    d = json.load(f)

trees_near_anzalone = [t for t in d['trees'] if 8700 <= t['x'] <= 9500 and 9400 <= t['y'] <= 10100]
print(f"Trees near Anzalone: {len(trees_near_anzalone)}")
for t in trees_near_anzalone:
    print(f"  Tree at ({t['x']:.1f}, {t['y']:.1f}), r={t['radius']}")

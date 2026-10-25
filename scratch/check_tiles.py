import os
from PIL import Image

tile1 = 'backend/data/tiles/19_130392_215438.webp'
tile2 = 'backend/data/tiles/19_130393_215438.webp'
tile3 = 'backend/data/tiles/19_130392_215439.webp'
tile4 = 'backend/data/tiles/19_130393_215439.webp'

for t in [tile1, tile2, tile3, tile4]:
    print(t, 'exists:', os.path.exists(t))

from PIL import Image

# Stitch the 4 tiles together:
# 19_130392_215438 (top-left)  | 19_130393_215438 (top-right)
# 19_130392_215439 (bottom-left) | 19_130393_215439 (bottom-right)

t_tl = Image.open('backend/data/tiles/19_130392_215438.webp').convert('RGBA')
t_tr = Image.open('backend/data/tiles/19_130393_215438.webp').convert('RGBA')
t_bl = Image.open('backend/data/tiles/19_130392_215439.webp').convert('RGBA')
t_br = Image.open('backend/data/tiles/19_130393_215439.webp').convert('RGBA')

canvas = Image.new('RGBA', (1024, 1024))
canvas.paste(t_tl, (0, 0))
canvas.paste(t_tr, (512, 0))
canvas.paste(t_bl, (0, 512))
canvas.paste(t_br, (512, 512))

# World coordinates of top-left (tx=130392, ty=215438):
# originX = 130375, originY = 215420
# worldX_0 = (130392 - 130375) * 512 = 17 * 512 = 8704
# worldY_0 = (215438 - 215420) * 512 = 18 * 512 = 9216

print(f"Stitched map covers World X: [{8704}, {8704 + 1024}], World Y: [{9216}, {9216 + 1024}]")

# Let's save a crop around Anzalone Hall (World X: 8800..9600, World Y: 9400..10100)
# localX = worldX - 8704, localY = worldY - 9216
x1 = 8800 - 8704
y1 = 9400 - 9216
x2 = 9600 - 8704
y2 = 10100 - 9216

crop = canvas.crop((x1, y1, x2, y2))
crop.save('scratch/anzalone_area.png')
print("Saved scratch/anzalone_area.png, size:", crop.size)

"""Contact sheets of the bench pictures: four to a sheet, each labelled, so a whole pass over the scenes can be looked at fast.

    python tools/stagecraft/contact-sheet.py <folder> [<per sheet = 4>]

Writes sheet-1.jpg, sheet-2.jpg ... beside the pictures (which are gitignored with the rest of lab/shots).
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

folder = Path(sys.argv[1])
per = int(sys.argv[2]) if len(sys.argv) > 2 else 4
files = sorted(p for p in folder.glob("rest-*.jpg"))
cols = 2
cell = (960, 540)
for n in range(0, len(files), per):
    group = files[n:n + per]
    rows = (len(group) + cols - 1) // cols
    sheet = Image.new("RGB", (cell[0] * cols, cell[1] * rows), "black")
    draw = ImageDraw.Draw(sheet)
    for i, f in enumerate(group):
        im = Image.open(f).convert("RGB").resize(cell)
        x, y = (i % cols) * cell[0], (i // cols) * cell[1]
        sheet.paste(im, (x, y))
        draw.rectangle([x, y, x + 330, y + 22], fill="black")
        draw.text((x + 6, y + 5), f.stem.replace("rest-", ""), fill="white")
    sheet.save(folder / f"sheet-{n // per + 1}.jpg", quality=88)
    print(f"sheet-{n // per + 1}.jpg", [f.stem for f in group])

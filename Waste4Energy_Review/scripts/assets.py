"""Extract supplied presentation assets without changing the source document."""
import sys
from pathlib import Path
import fitz

source = Path(sys.argv[1])
out = Path(__file__).resolve().parents[1] / 'assets'
doc = fitz.open(source)
names = ['paul-bordelon', 'jeff-gloyd', 'torry-ingram', 'grant-williams']
# Render the original composited portraits: isolated embedded photographs have
# PDF soft masks that do not reproduce correctly as standalone image files.
for name, rect in zip(names, doc[2].get_image_rects(25)):
    doc[2].get_pixmap(matrix=fitz.Matrix(3, 3), clip=rect).save(str(out / f'{name}.png'))
for page, name in [(6, 'site-plan'), (7, 'receiving-plan'), (8, 'blending-plan'), (9, 'equipment-plan'), (10, 'areas-of-focus')]:
    doc[page].get_pixmap(matrix=fitz.Matrix(1.7, 1.7)).save(str(out / f'{name}.png'))

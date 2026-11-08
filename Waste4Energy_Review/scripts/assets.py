"""Extract supplied presentation assets without changing the source document."""
import sys
from pathlib import Path
import fitz

source = Path(sys.argv[1])
out = Path(__file__).resolve().parents[1] / 'assets'
doc = fitz.open(source)
(out / 'vision-processing.jpeg').write_bytes(doc.extract_image(24)['image'])
# Original, unmodified photos from physical slide 5, matched to their labels.
for name, xref in [('paints', 106), ('carbon-black', 107), ('inks', 108), ('consumer-products', 109), ('oily-sludges', 110), ('pesticides-herbicides', 111), ('isocyanates', 112), ('industrial-plant-trash', 113)]:
    (out / f'waste-{name}.jpeg').write_bytes(doc.extract_image(xref)['image'])
names = ['paul-bordelon', 'jeff-gloyd', 'torry-ingram', 'grant-williams']
# Render the original composited portraits: isolated embedded photographs have
# PDF soft masks that do not reproduce correctly as standalone image files.
for name, rect in zip(names, doc[2].get_image_rects(25)):
    doc[2].get_pixmap(matrix=fitz.Matrix(3, 3), clip=rect).save(str(out / f'{name}.png'))
for page, name in [(6, 'site-plan'), (7, 'receiving-plan'), (8, 'blending-plan'), (9, 'equipment-plan')]:
    doc[page].get_pixmap(matrix=fitz.Matrix(1.7, 1.7)).save(str(out / f'{name}.png'))

# Edit the native presentation objects so geography and every data label remain
# exact. Replace the four shared map symbols, remove the old corner wordmark
# and embedded title, then trim the unused slide margins.
page = doc[10]
symbol_rects = page.get_image_rects(160)
page.delete_image(160)
page.delete_image(29)
for rect in page.search_for('AREAS OF FOCUS'):
    page.add_redact_annot(rect, fill=(1, 1, 1))
page.apply_redactions(images=0, graphics=0)
symbol = fitz.open()
symbol_page = symbol.new_page(width=92, height=64)
symbol_page.insert_image(symbol_page.rect, filename=str(out / 'map-symbol.png'))
for rect in symbol_rects:
    page.show_pdf_page(rect, symbol, 0, clip=fitz.Rect(22, 3, 86, 63))
page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=fitz.Rect(210, 145, 890, 485)).save(str(out / 'areas-of-focus-v2.png'))

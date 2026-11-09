// One-time web export of selected image-generation outputs. Originals stay intact.
// Usage: node scripts/prepare-generated-images.mjs /absolute/path/to/manifest.json
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { root } from './build.mjs';

const manifest = JSON.parse(await readFile(process.argv[2], 'utf8'));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const {source, output} of manifest) {
    if (!/^generated-[a-z-]+\.webp$/.test(output)) throw new Error('Invalid output filename.');
    const original = await readFile(source);
    const uri = 'data:image/png;base64,' + original.toString('base64');
    const bytes = await page.evaluate(async source => {
      const image = new Image(); image.src = source; await image.decode();
      const canvas = new OffscreenCanvas(768, 768);
      const scale = Math.max(768 / image.naturalWidth, 768 / image.naturalHeight);
      const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
      canvas.getContext('2d').drawImage(image, (768 - width) / 2, (768 - height) / 2, width, height);
      const blob = await canvas.convertToBlob({type:'image/webp',quality:.88});
      return [...new Uint8Array(await blob.arrayBuffer())];
    }, uri);
    await writeFile(path.join(root,'assets',output),Buffer.from(bytes));
    console.log(`${output}: ${Math.round(bytes.length / 1024)} KB`);
  }
} finally { await browser.close(); }

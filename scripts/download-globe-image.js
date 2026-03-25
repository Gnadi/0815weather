/**
 * Optional: Self-host the globe texture for maximum performance.
 *
 * By default the landing page uses wsrv.nl (a free open-source image proxy)
 * to serve the earth-blue-marble.jpg at the correct size and in WebP format.
 * Running this script downloads the original image and converts it to local
 * WebP files in public/img/, which can then be served directly.
 *
 * To switch to self-hosted images after running this script, update
 * LandingPage.jsx and index.html to use /img/earth-globe-*.webp URLs instead
 * of the wsrv.nl URLs.
 *
 * Usage: node scripts/download-globe-image.js
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'img');

const SOURCE_URL = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';

const SIZES = [
  { name: 'earth-globe-220.webp', width: 220, format: 'webp', quality: 75 },
  { name: 'earth-globe-300.webp', width: 300, format: 'webp', quality: 80 },
  { name: 'earth-globe-500.webp', width: 500, format: 'webp', quality: 85 },
  { name: 'earth-globe-500.jpg',  width: 500, format: 'jpeg', quality: 82 },
];

function download(url) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const request = (targetUrl) => {
      https.get(targetUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          request(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${targetUrl}`));
          return;
        }
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    };
    request(url);
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('Downloading earth-blue-marble.jpg from unpkg…');
  const buffer = await download(SOURCE_URL);
  console.log(`Downloaded ${(buffer.length / 1024).toFixed(0)} KB`);

  for (const { name, width, format, quality } of SIZES) {
    const outPath = path.join(OUT_DIR, name);
    const instance = sharp(buffer).resize(width);
    if (format === 'webp') {
      await instance.webp({ quality }).toFile(outPath);
    } else {
      await instance.jpeg({ quality, progressive: true }).toFile(outPath);
    }
    const size = fs.statSync(outPath).size;
    console.log(`  ✓ ${name} — ${(size / 1024).toFixed(1)} KB`);
  }

  console.log('Done. Images saved to public/img/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

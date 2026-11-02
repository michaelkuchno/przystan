// Renders source images for `npx @capacitor/assets generate --android` from the SVG logo.
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const logo = readFileSync('public/logo.svg');
const fg = Buffer.from(
  readFileSync('public/logo.svg', 'utf8').replace(/<rect[^>]*\/>/, ''), // foreground without the green tile
);
await sharp(logo, { density: 1200 }).resize(1024, 1024).png().toFile('assets/icon-only.png');
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#456552' } }).png().toFile('assets/icon-background.png');
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: await sharp(fg, { density: 1200 }).resize(640, 640).png().toBuffer(), gravity: 'centre' }])
  .png()
  .toFile('assets/icon-foreground.png');
const splash = async (bg, out) =>
  sharp({ create: { width: 2732, height: 2732, channels: 4, background: bg } })
    .composite([{ input: await sharp(logo, { density: 1200 }).resize(600, 600).png().toBuffer(), gravity: 'centre' }])
    .png()
    .toFile(out);
await splash('#f6f1ea', 'assets/splash.png');
await splash('#151816', 'assets/splash-dark.png');
console.log('assets ready');

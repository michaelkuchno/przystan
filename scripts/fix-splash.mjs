// Regenerates scripts/splash-links.html from the generator output naming.
import { readdirSync, writeFileSync } from 'node:fs';
const sizes = {
  '750x1334': [375, 667, 2], '1125x2436': [375, 812, 3], '1179x2556': [393, 852, 3], '1284x2778': [428, 926, 3],
  '1290x2796': [430, 932, 3], '1640x2360': [820, 1180, 2], '2048x2732': [1024, 1366, 2],
};
const links = readdirSync('public/splash').filter((f) => f.endsWith('.png')).map((f) => {
  const m = f.match(/apple-splash-(landscape|portrait)-(dark-)?(\d+)x(\d+)\.png/);
  if (!m) return '';
  const [, orient, dark, a, b] = m;
  const key = orient === 'landscape' ? `${b}x${a}` : `${a}x${b}`;
  const s = sizes[key];
  if (!s) return '';
  return `<link rel="apple-touch-startup-image" media="screen and ${dark ? '(prefers-color-scheme: dark) and ' : ''}(device-width: ${s[0]}px) and (device-height: ${s[1]}px) and (-webkit-device-pixel-ratio: ${s[2]}) and (orientation: ${orient})" href="./splash/${f}">`;
}).filter(Boolean);
writeFileSync('scripts/splash-links.html', links.join('\n') + '\n');
console.log(`${links.length} splash links`);

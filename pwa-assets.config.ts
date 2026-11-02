import { defineConfig, minimal2023Preset, createAppleSplashScreens } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#456552' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#456552' } },
    appleSplashScreens: createAppleSplashScreens(
      {
        padding: 0.55,
        resizeOptions: { background: '#f6f1ea', fit: 'contain' },
        darkResizeOptions: { background: '#151816', fit: 'contain' },
        linkMediaOptions: { log: true, addMediaScreen: true, basePath: './splash/', xhtml: false },
        png: { compressionLevel: 9, quality: 70 },
        name: (landscape, size, dark) => `splash/apple-splash-${landscape ? 'landscape' : 'portrait'}-${dark ? 'dark-' : ''}${size.width}x${size.height}.png`,
      },
      ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Plus', 'iPhone 13 mini', 'iPhone SE 4.7"', 'iPad Air 10.9"', 'iPad Pro 12.9"'],
    ),
  },
  images: ['public/logo.svg'],
});

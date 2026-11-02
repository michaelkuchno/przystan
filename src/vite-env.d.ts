/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

declare module 'pdfmake/build/vfs_fonts' {
  const vfs: Record<string, string>;
  export default vfs;
}

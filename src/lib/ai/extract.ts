/**
 * Text from a study file – extracted on the device (pdf.js legacy build for iOS Safari, worker
 * bundled with the app, no CDN). Loaded lazily only when a PDF is opened.
 */
export const MAX_FILE_CHARS = 60_000;

export async function extractText(file: File): Promise<string> {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const workerUrl = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages: string[] = [];
    let total = 0;
    for (let i = 1; i <= doc.numPages && total < MAX_FILE_CHARS; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      const text = tc.items
        .map((it) => ('str' in it ? it.str + (it.hasEOL ? '\n' : ' ') : ''))
        .join('')
        .replace(/[ \t]+/g, ' ');
      pages.push(text);
      total += text.length;
    }
    await doc.cleanup();
    return pages.join('\n\n').slice(0, MAX_FILE_CHARS).trim();
  }
  return (await file.text()).slice(0, MAX_FILE_CHARS).trim();
}

/** Opens the system file picker (txt, md, pdf). */
export function pickStudyFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md,.pdf,text/plain,application/pdf';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

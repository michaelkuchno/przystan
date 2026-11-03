import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import './styles/index.css';
import { initI18n } from './i18n';
import { applyTheme, loadPrefs, subscribePrefs, getPrefs } from './lib/prefs';
import { requestPersistentStorage } from './lib/db';
import { initViewport } from './lib/viewport';
import { App } from './app/App';

async function boot() {
  const prefs = await loadPrefs();
  applyTheme(prefs);
  subscribePrefs(() => applyTheme(getPrefs()));
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyTheme(getPrefs()));
  await initI18n(prefs.lang, prefs.term);
  void requestPersistentStorage();
  initViewport();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void boot();

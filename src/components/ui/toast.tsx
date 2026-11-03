import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

/* ------------------------------------------------------------------ Toast */

interface ToastItem {
  id: number;
  text: string;
  tone: 'ok' | 'warn' | 'info';
  action?: { label: string; run: () => void };
}
const ToastCtx = createContext<(t: Omit<ToastItem, 'id'>) => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const reduce = useReducedMotion();
  const push = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = ++seq.current;
    setItems((x) => [...x.slice(-2), { ...t, id }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), t.action ? 7000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tabbar-h)+1rem)] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6"
        aria-live="polite"
        role="status"
      >
        <AnimatePresence>
          {items.map((i) => (
            <motion.div
              key={i.id}
              initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-fg px-4 py-3 text-sm text-bg shadow-xl"
            >
              {i.tone === 'ok' ? (
                <CheckCircle2 className="size-5 shrink-0" aria-hidden />
              ) : i.tone === 'warn' ? (
                <AlertTriangle className="size-5 shrink-0" aria-hidden />
              ) : (
                <Info className="size-5 shrink-0" aria-hidden />
              )}
              <span className="flex-1">{i.text}</span>
              {i.action && (
                <button
                  className="min-h-11 rounded-lg px-3 font-semibold underline-offset-2 hover:underline"
                  onClick={() => {
                    i.action?.run();
                    setItems((x) => x.filter((y) => y.id !== i.id));
                  }}
                >
                  {i.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

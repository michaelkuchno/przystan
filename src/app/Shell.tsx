import { useEffect, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Users,
  CalendarDays,
  Sparkles,
  LayoutGrid,
  Search,
  Lock,
  LifeBuoy,
  Presentation,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  MessagesSquare,
  Sprout,
  ClipboardList,
  Compass,
  HeartHandshake,
  Scale,
  ChefHat,
  Settings as SettingsIcon,
  NotebookText,
  NotebookPen,
} from 'lucide-react';
import { cn } from '@/components/ui/cn';
import { IconButton, Badge } from '@/components/ui/core';
import { Logo } from '@/components/Logo';
import { usePrefs, setPrefs } from '@/lib/prefs';
import { lockNow, switchMode } from './session';

export const MAIN_NAV = [
  { to: '/', key: 'dashboard', icon: Home, end: true },
  { to: '/clients', key: 'clients', icon: Users },
  { to: '/meetings', key: 'meetings', icon: CalendarDays },
  { to: '/tools', key: 'tools', icon: Sparkles },
  { to: '/more', key: 'more', icon: LayoutGrid },
] as const;

export const SECONDARY_NAV = [
  { to: '/screening', key: 'screening', icon: ClipboardList },
  { to: '/recipes', key: 'recipes', icon: ChefHat },
  { to: '/prevention', key: 'prevention', icon: Sprout },
  { to: '/resocialization', key: 'resocialization', icon: Scale },
  { to: '/family', key: 'family', icon: HeartHandshake },
  { to: '/help', key: 'help', icon: Compass },
  { to: '/knowledge', key: 'knowledge', icon: BookOpen },
  { to: '/simulator', key: 'simulator', icon: MessagesSquare },
  { to: '/learn', key: 'learn', icon: GraduationCap },
  { to: '/notes', key: 'notes', icon: NotebookText },
  { to: '/practice', key: 'practice', icon: NotebookPen },
  { to: '/settings', key: 'settings', icon: SettingsIcon },
] as const;

/** Order of screens in presentation mode (arrow keys). */
const TOUR = [
  '/',
  '/clients',
  '/meetings',
  '/tools',
  '/screening',
  '/recipes',
  '/prevention',
  '/simulator',
  '/help',
  '/knowledge',
  '/learn',
  '/resocialization',
  '/family',
];

function usePresentationKeys(on: boolean) {
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    if (!on) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable], [role="slider"]')) return;
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const base = '/' + (loc.pathname.split('/')[1] ?? '');
      const idx = Math.max(0, TOUR.indexOf(base === '/' ? '/' : base));
      const next = e.key === 'ArrowRight' ? Math.min(TOUR.length - 1, idx + 1) : Math.max(0, idx - 1);
      nav(TOUR[next]!);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [on, loc.pathname, nav]);
  const base = '/' + (loc.pathname.split('/')[1] ?? '');
  return { index: TOUR.indexOf(base), total: TOUR.length };
}

export function Shell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const prefs = usePrefs();
  const nav = useNavigate();
  const loc = useLocation();
  const demo = prefs.mode === 'demo';
  const tour = usePresentationKeys(prefs.presentation);

  useEffect(() => {
    window.scrollTo?.({ top: 0 });
  }, [loc.pathname]);

  return (
    <div className="min-h-dvh lg:pl-72">
      <a
        href="#main"
        className="sr-only z-[80] rounded-lg bg-fg px-4 py-2 text-bg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        {t('skipToContent')}
      </a>

      {/* Sidebar (desktop / tablet landscape) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-line bg-surface/80 backdrop-blur lg:flex">
        <div className="flex items-center gap-3 px-5 pt-6 pb-4">
          <Logo className="size-10" />
          <div>
            <div className="font-serif text-xl font-semibold">{t('appName')}</div>
            <div className="text-xs text-muted">{t('tagline')}</div>
          </div>
        </div>
        <nav aria-label={t('nav.label')} className="flex-1 overflow-y-auto px-3 pb-4">
          {[...MAIN_NAV.filter((n) => n.key !== 'more'), ...SECONDARY_NAV].map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={'end' in n ? n.end : false}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 rounded-xl px-3 text-[length:calc(0.95rem*var(--fs-body))] transition',
                  isActive ? 'bg-primary-soft font-semibold text-primary-soft-fg' : 'text-fg/80 hover:bg-surface-2',
                )
              }
            >
              <n.icon className="size-5" aria-hidden />
              {t(`nav.${n.key}`)}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t border-line p-3">
          <NavLink
            to="/crisis"
            className="flex min-h-11 items-center gap-3 rounded-xl bg-accent-soft px-3 font-medium text-accent-soft-fg"
          >
            <LifeBuoy className="size-5" aria-hidden />
            {t('nav.crisis')}
          </NavLink>
        </div>
      </aside>

      {/* Header */}
      <header className="safe-top safe-x sticky top-0 z-20 border-b border-line/70 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-3 sm:px-5">
          <NavLink to="/" className="mr-1 flex items-center gap-2 lg:hidden" aria-label={t('nav.dashboard')}>
            <Logo className="size-8" />
          </NavLink>
          <button
            type="button"
            onClick={() => void switchMode(demo ? 'practice' : 'demo')}
            className="flex min-h-11 min-w-0 shrink items-center rounded-full px-1"
            title={t('mode.switch')}
          >
            {/* header chrome: the label grows with the system font only up to a cap, then truncates */}
            {demo ? (
              <Badge
                tone="accent"
                className="max-w-full min-w-0 text-[length:min(calc(0.8rem*var(--fs-body)),1.05rem)] font-bold tracking-wider"
              >
                <span className="truncate">DEMO · {t('mode.demoShort')}</span>
              </Badge>
            ) : (
              <Badge tone="primary" className="max-w-full min-w-0 text-[length:min(var(--text-xs),1rem)]">
                <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{t('mode.practiceShort')}</span>
              </Badge>
            )}
          </button>
          <div className="flex-1" />
          {prefs.presentation && tour.index >= 0 && (
            <span className="mr-2 hidden text-xs text-muted tabular-nums sm:inline">
              ← {tour.index + 1}/{tour.total} →
            </span>
          )}
          <IconButton label={t('nav.search')} onClick={() => nav('/search')}>
            <Search className="size-5" />
          </IconButton>
          <IconButton
            label={prefs.presentation ? t('presentation.off') : t('presentation.on')}
            onClick={() => void setPrefs({ presentation: !prefs.presentation })}
            aria-pressed={prefs.presentation}
            className={cn('hidden sm:inline-flex', prefs.presentation && 'bg-primary-soft text-primary-soft-fg')}
          >
            <Presentation className="size-5" />
          </IconButton>
          <IconButton label={t('nav.crisis')} onClick={() => nav('/crisis')} className="text-accent lg:hidden">
            <LifeBuoy className="size-5" />
          </IconButton>
          <IconButton label={t('lockNow')} onClick={lockNow}>
            <Lock className="size-5" />
          </IconButton>
        </div>
      </header>

      {children}

      {/* Bottom tab bar (phones / tablets) */}
      <nav
        aria-label={t('nav.label')}
        className="safe-bottom safe-x hide-on-keyboard fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {MAIN_NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={'end' in n ? n.end : false}
              className={({ isActive }) =>
                cn(
                  'flex h-[var(--tabbar-item-h)] min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-[length:var(--tabbar-label)] leading-tight font-medium transition',
                  isActive ? 'text-primary' : 'text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-[min(2rem,44px)] w-[min(3.5rem,64px)] max-w-full shrink-0 items-center justify-center rounded-full transition',
                      isActive && 'bg-primary-soft',
                    )}
                  >
                    <n.icon className="size-5" aria-hidden />
                  </span>
                  <span className="block max-w-full truncate">{t(`nav.${n.key}`)}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { RequireContent } from '@/content/ContentProvider';
import { ConfirmProvider } from '@/components/ui/overlay';
import { ToastProvider } from '@/components/ui/toast';
import { Skeleton } from '@/components/ui/core';
import { Shell } from './Shell';
import { Dashboard } from '@/features/dashboard/Dashboard';
import Crisis from '@/features/settings/Crisis';
import { ensureLazyNamespaces, lazyReady } from '@/i18n';
import { usePrefs } from '@/lib/prefs';
import { subscribe } from '@/lib/store';
import { useTranslation } from 'react-i18next';

const ClientsList = lazy(() => import('@/features/clients/ClientsList'));
const ClientForm = lazy(() => import('@/features/clients/ClientForm'));
const ClientDetail = lazy(() => import('@/features/clients/ClientDetail'));
const MeetingsList = lazy(() => import('@/features/meetings/MeetingsList'));
const MeetingEditor = lazy(() => import('@/features/meetings/MeetingEditor'));
const MeetingLive = lazy(() => import('@/features/meetings/MeetingLive'));
const RecipesList = lazy(() => import('@/features/recipes/RecipesList'));
const RecipeEditor = lazy(() => import('@/features/recipes/RecipeEditor'));
const ToolsHub = lazy(() => import('@/features/tools/ToolsHub'));
const ToolRunner = lazy(() => import('@/features/tools/ToolRunner'));
const ScreeningHub = lazy(() => import('@/features/screening/ScreeningHub'));
const ScreeningForm = lazy(() => import('@/features/screening/ScreeningForm'));
const PreventionList = lazy(() => import('@/features/prevention/PreventionList'));
const PreventionWizard = lazy(() => import('@/features/prevention/PreventionWizard'));
const Resocialization = lazy(() => import('@/features/resocialization/Resocialization'));
const Family = lazy(() => import('@/features/family/Family'));
const HelpSystem = lazy(() => import('@/features/help/HelpSystem'));
const Knowledge = lazy(() => import('@/features/knowledge/Knowledge'));
const KnowledgeCardPage = lazy(() => import('@/features/knowledge/KnowledgeCardPage'));
const SimulatorList = lazy(() => import('@/features/simulator/SimulatorList'));
const SimulatorRun = lazy(() => import('@/features/simulator/SimulatorRun'));
const Learn = lazy(() => import('@/features/learn/Learn'));
const Study = lazy(() => import('@/features/learn/Study'));
const Exam = lazy(() => import('@/features/learn/Exam'));
const DeckEditor = lazy(() => import('@/features/learn/DeckEditor'));
const Settings = lazy(() => import('@/features/settings/Settings'));
const InfoPage = lazy(() => import('@/features/settings/InfoPage'));
const More = lazy(() => import('@/features/more/More'));
const Search = lazy(() => import('@/features/search/Search'));
const PracticeLog = lazy(() => import('@/features/practice/PracticeLog'));
const NotesList = lazy(() => import('@/features/notes/NotesList'));
const NoteEditor = lazy(() => import('@/features/notes/NoteEditor'));
const CaseStudy = lazy(() => import('@/features/casestudy/CaseStudy'));
const AuditLog = lazy(() => import('@/features/audit/AuditLog'));
const Trash = lazy(() => import('@/features/audit/Trash'));
const AiSettings = lazy(() => import('@/features/ai/AiSettings'));
const AiInfo = lazy(() => import('@/features/ai/AiInfo'));
const Messages = lazy(() => import('@/features/messages/Messages'));
const NotifySettings = lazy(() => import('@/features/notify/NotifySettings'));
const Ask = lazy(() => import('@/features/ai/Ask'));
const SimulatorLive = lazy(() => import('@/features/simulator/SimulatorLive'));
const GenerateCards = lazy(() => import('@/features/learn/GenerateCards'));
const OpenExam = lazy(() => import('@/features/learn/OpenExam'));

function PageFallback() {
  return (
    <div className="mx-auto max-w-4xl space-y-3 px-4 pt-6" aria-busy="true">
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  );
}

/** UI strings loaded after unlocking (AI assistant) – kept out of the start-up bundle. */
function RequireLazyStrings({ children }: { children: ReactNode }) {
  const { lang } = usePrefs();
  const [ready, setReady] = useState(() => lazyReady(lang));
  useEffect(() => {
    let alive = true;
    void ensureLazyNamespaces(lang).then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [lang]);
  return ready ? <>{children}</> : <PageFallback />;
}

/**
 * Notifications (docs/NOTIFICATIONS.md): re-plans reminders after unlocking and – debounced – after
 * every data change; sends the daily summary when due. Loaded lazily, does nothing when turned off.
 */
function NotificationRunner() {
  const { t } = useTranslation();
  const enabled = usePrefs().notify.enabled;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => void import('@/lib/notify/engine').then((m) => m.runNotifications(t)).catch(() => undefined),
        1500,
      );
    };
    run();
    const unsub = enabled ? subscribe(run) : () => undefined;
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [enabled, t]);
  return null;
}

/** Everything after unlocking – loaded as a separate chunk. */
export default function AuthedApp({ overlay }: { overlay?: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <ConfirmProvider>
          <Shell>
            <RequireContent fallback={<PageFallback />}>
              <RequireLazyStrings>
                <NotificationRunner />
                <Suspense fallback={<PageFallback />}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/clients" element={<ClientsList />} />
                    <Route path="/clients/new" element={<ClientForm />} />
                    <Route path="/clients/:id/edit" element={<ClientForm />} />
                    <Route path="/clients/:id/:tab?" element={<ClientDetail />} />
                    <Route path="/meetings" element={<MeetingsList />} />
                    <Route path="/meetings/new" element={<MeetingEditor />} />
                    <Route path="/meetings/:id" element={<MeetingEditor />} />
                    <Route path="/meetings/:id/live" element={<MeetingLive />} />
                    <Route path="/recipes" element={<RecipesList />} />
                    <Route path="/recipes/:id" element={<RecipeEditor />} />
                    <Route path="/tools" element={<ToolsHub />} />
                    <Route path="/tools/:tool" element={<ToolRunner />} />
                    <Route path="/screening" element={<ScreeningHub />} />
                    <Route path="/screening/:instrument" element={<ScreeningForm />} />
                    <Route path="/prevention" element={<PreventionList />} />
                    <Route path="/prevention/:id" element={<PreventionWizard />} />
                    <Route path="/resocialization/:tab?" element={<Resocialization />} />
                    <Route path="/family/:tab?" element={<Family />} />
                    <Route path="/help/:tab?" element={<HelpSystem />} />
                    <Route path="/practice" element={<PracticeLog />} />
                    <Route path="/case-study/:id" element={<CaseStudy />} />
                    <Route path="/notes" element={<NotesList />} />
                    <Route path="/notes/:id" element={<NoteEditor />} />
                    <Route path="/knowledge" element={<Knowledge />} />
                    <Route path="/knowledge/:id" element={<KnowledgeCardPage />} />
                    <Route path="/simulator" element={<SimulatorList />} />
                    <Route path="/simulator/:id" element={<SimulatorRun />} />
                    <Route path="/simulator/:id/live" element={<SimulatorLive />} />
                    <Route path="/learn" element={<Learn />} />
                    <Route path="/learn/study/:deck" element={<Study />} />
                    <Route path="/learn/exam" element={<Exam />} />
                    <Route path="/learn/exam-open" element={<OpenExam />} />
                    <Route path="/learn/generate" element={<GenerateCards />} />
                    <Route path="/learn/deck/:id" element={<DeckEditor />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/settings/ai" element={<AiSettings />} />
                    <Route path="/settings/notify" element={<NotifySettings />} />
                    <Route path="/messages/:tab?" element={<Messages />} />
                    <Route path="/ai/info" element={<AiInfo />} />
                    <Route path="/ask" element={<Ask />} />
                    <Route path="/audit" element={<AuditLog />} />
                    <Route path="/trash" element={<Trash />} />
                    <Route path="/info/:page" element={<InfoPage />} />
                    <Route path="/crisis" element={<Crisis />} />
                    <Route path="/more" element={<More />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </RequireLazyStrings>
            </RequireContent>
          </Shell>
          {overlay}
        </ConfirmProvider>
      </ToastProvider>
    </MotionConfig>
  );
}

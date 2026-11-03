import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { RequireContent } from '@/content/ContentProvider';
import { ConfirmProvider } from '@/components/ui/overlay';
import { ToastProvider } from '@/components/ui/toast';
import { Skeleton } from '@/components/ui/core';
import { Shell } from './Shell';
import { Dashboard } from '@/features/dashboard/Dashboard';
import Crisis from '@/features/settings/Crisis';

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

function PageFallback() {
  return (
    <div className="mx-auto max-w-4xl space-y-3 px-4 pt-6" aria-busy="true">
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  );
}

/** Everything after unlocking – loaded as a separate chunk. */
export default function AuthedApp({ overlay }: { overlay?: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <ConfirmProvider>
          <Shell>
            <RequireContent fallback={<PageFallback />}>
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
                  <Route path="/learn" element={<Learn />} />
                  <Route path="/learn/study/:deck" element={<Study />} />
                  <Route path="/learn/exam" element={<Exam />} />
                  <Route path="/learn/deck/:id" element={<DeckEditor />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/info/:page" element={<InfoPage />} />
                  <Route path="/crisis" element={<Crisis />} />
                  <Route path="/more" element={<More />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </RequireContent>
          </Shell>
          {overlay}
        </ConfirmProvider>
      </ToastProvider>
    </MotionConfig>
  );
}

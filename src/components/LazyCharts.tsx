import { lazy, Suspense, type ComponentProps } from 'react';
import { Skeleton } from './ui/core';

const charts = () => import('./charts');
const Radar = lazy(() => charts().then((m) => ({ default: m.DiagnosisRadar })));
const Trend = lazy(() => charts().then((m) => ({ default: m.TrendChart })));
const PrePost = lazy(() => charts().then((m) => ({ default: m.PrePostChart })));

type P<T> = T extends (p: infer X) => unknown ? X : never;

export function DiagnosisRadar(props: P<typeof import('./charts').DiagnosisRadar>) {
  return (
    <Suspense fallback={<Skeleton className="h-80" />}>
      <Radar {...props} />
    </Suspense>
  );
}

export function TrendChart(props: ComponentProps<typeof Trend>) {
  return (
    <Suspense fallback={<Skeleton className="h-60" />}>
      <Trend {...props} />
    </Suspense>
  );
}

export function PrePostChart(props: ComponentProps<typeof PrePost>) {
  return (
    <Suspense fallback={<Skeleton className="h-56" />}>
      <PrePost {...props} />
    </Suspense>
  );
}

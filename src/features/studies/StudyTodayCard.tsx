import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Flame, School } from 'lucide-react';
import { Card } from '@/components/ui/core';
import { usePrefs } from '@/lib/prefs';
import { todayIso } from '@/lib/platform';
import { visibleStreak } from '@/lib/studies/settings';
import { yesterdayIso } from '@/lib/studies/streak';

/** Dashboard: today's study goal and streak (shown once the studies module is set up). */
export default function StudyTodayCard() {
  const { t } = useTranslation('studies');
  const { study } = usePrefs();
  const today = todayIso();
  const done = study.lastDay === today ? study.doneToday : 0;
  const streak = visibleStreak(study, today, yesterdayIso());
  return (
    <Link to="/studies" className="mt-4 block" data-testid="study-dashboard">
      <Card className="flex items-center gap-3 transition hover:border-primary/40">
        <School className="size-6 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{t('dashboard')}</div>
          <div className="text-sm text-muted">
            {t('today.goal')}: {Math.min(done, study.dailyGoal)} / {study.dailyGoal}
            {done >= study.dailyGoal ? ' ✓' : ''}
          </div>
        </div>
        <span className="flex items-center gap-1 font-semibold">
          <Flame className={streak ? 'size-5 text-accent' : 'size-5 text-muted'} aria-hidden /> {streak}
        </span>
      </Card>
    </Link>
  );
}

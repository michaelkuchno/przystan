/** Study preferences (plain, part of Prefs – no personal data). Must not import prefs.ts. */
export interface StudyPrefs {
  /** Chosen programme ('' = none yet). */
  programId: string;
  /** Current semester (1-based). */
  semester: number;
  /** Daily goal: number of flash cards / questions. */
  dailyGoal: number;
  /** Days in a row with the daily goal reached. */
  streak: number;
  /** YYYY-MM-DD of the last study day and how much was done that day. */
  lastDay?: string;
  doneToday: number;
}

export const defaultStudyPrefs = (): StudyPrefs => ({ programId: '', semester: 1, dailyGoal: 15, streak: 0, doneToday: 0 });

/** Counts studied items for today and updates the streak (pure – unit tested). */
export function recordStudy(p: StudyPrefs, items: number, today: string, yesterday: string): StudyPrefs {
  const sameDay = p.lastDay === today;
  const done = (sameDay ? p.doneToday : 0) + items;
  const reachedNow = done >= p.dailyGoal && (!sameDay || p.doneToday < p.dailyGoal);
  let streak = p.streak;
  if (!sameDay && p.lastDay !== yesterday) streak = 0;
  if (reachedNow) streak += 1;
  return { ...p, lastDay: today, doneToday: done, streak };
}

/** Streak to show: it breaks only when a whole day was missed. */
export function visibleStreak(p: StudyPrefs, today: string, yesterday: string): number {
  return p.lastDay === today || p.lastDay === yesterday ? p.streak : 0;
}

import { getPrefs, setPrefs } from '@/lib/prefs';
import { todayIso } from '@/lib/platform';
import { recordStudy } from './settings';

const yesterdayIso = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Counts learned items (cards, exam questions) towards the daily goal and the streak. */
export async function countStudy(items: number): Promise<{ goalReached: boolean }> {
  const before = getPrefs().study;
  const after = recordStudy(before, items, todayIso(), yesterdayIso());
  await setPrefs({ study: after });
  return { goalReached: after.streak > before.streak };
}

export { yesterdayIso };

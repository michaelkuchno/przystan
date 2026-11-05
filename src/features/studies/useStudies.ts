import { useEffect, useMemo, useState } from 'react';
import { all, useStore } from '@/lib/store';
import { usePrefs } from '@/lib/prefs';
import { loadProgram, mergeCourses, type CourseView } from '@/lib/studies/program';
import type { Program } from '@/lib/studies/types';
import type { StudyContext } from '@/lib/ai/studyPrompts';
import { loadPack, loadPacks, type StudyPack } from '@/lib/studies/packs';

/** Built-in pack of one course (undefined while loading, null = none). */
export function usePack(courseId: string | undefined): StudyPack | null | undefined {
  const [pack, setPack] = useState<{ id: string; pack: StudyPack | null } | null>(null);
  useEffect(() => {
    let alive = true;
    if (courseId) void loadPack(courseId).then((p) => alive && setPack({ id: courseId, pack: p }));
    return () => {
      alive = false;
    };
  }, [courseId]);
  return pack && pack.id === courseId ? pack.pack : undefined;
}

/** Built-in packs of the given courses (for search and questions). */
export function usePacks(courseIds: string[]): Map<string, StudyPack> {
  const key = courseIds.join(',');
  const [packs, setPacks] = useState<Map<string, StudyPack>>(new Map());
  useEffect(() => {
    let alive = true;
    void loadPacks(key ? key.split(',') : []).then((p) => alive && setPacks(p));
    return () => {
      alive = false;
    };
  }, [key]);
  return packs;
}

/** Programme (lazy JSON) + the student's records, merged. */
export function useStudies() {
  const { study } = usePrefs();
  const [program, setProgram] = useState<Program | null>(null);
  const [loaded, setLoaded] = useState(false);
  const overrides = useStore(() => all('studyCourse'));
  const materials = useStore(() => all('studyMaterial'));
  const attempts = useStore(() => all('studyAttempt'));
  const decks = useStore(() => all('deck'));
  const states = useStore(() => all('cardState'));

  useEffect(() => {
    let alive = true;
    void loadProgram(study.programId).then((p) => {
      if (!alive) return;
      setProgram(p);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [study.programId]);

  const courses: CourseView[] = useMemo(() => mergeCourses(program, overrides), [program, overrides]);
  const context: StudyContext = useMemo(
    () => ({
      university: program?.university ?? '',
      program: program?.program ?? '',
      specialization: program?.specialization ?? '',
    }),
    [program],
  );
  return { program, loaded, courses, materials, attempts, decks, states, study, context };
}

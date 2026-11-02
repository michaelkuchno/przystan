import type { MitiCategory, Scenario, ScenarioOption } from '@/content/types';

export interface SimStep {
  nodeId: string;
  option: ScenarioOption;
}

export interface SimStats {
  alliance: number; // 0–100
  changeTalk: number;
  sustainTalk: number;
  reflections: number;
  complexReflections: number;
  questions: number;
  openQuestions: number;
  miConsistent: number;
  miInconsistent: number;
  /** reflection-to-question ratio (MITI target ≥ 1) */
  rq: number | null;
  /** % open questions (MITI target ≥ 50%) */
  pctOpen: number | null;
  /** % complex reflections (MITI target ≥ 40%) */
  pctComplex: number | null;
}

const INCONSISTENT: MitiCategory[] = ['confront', 'moralize', 'adviseWithoutPermission'];
const CONSISTENT: MitiCategory[] = [
  'affirmation',
  'adviseWithPermission',
  'summary',
  'complexReflection',
  'simpleReflection',
  'openQuestion',
];

export function computeStats(scenario: Scenario, steps: SimStep[]): SimStats {
  const nodes = new Map(scenario.nodes.map((n) => [n.id, n]));
  let alliance = 50;
  let changeTalk = 0;
  let sustainTalk = 0;
  const count = (c: MitiCategory[]) => steps.filter((s) => c.includes(s.option.category)).length;
  for (const s of steps) {
    alliance = Math.max(0, Math.min(100, alliance + s.option.alliance * 10));
    const next = nodes.get(s.option.next);
    if (next?.talk === 'change') changeTalk++;
    if (next?.talk === 'sustain') sustainTalk++;
  }
  const reflections = count(['simpleReflection', 'complexReflection']);
  const complexReflections = count(['complexReflection']);
  const questions = count(['openQuestion', 'closedQuestion']);
  const openQuestions = count(['openQuestion']);
  return {
    alliance,
    changeTalk,
    sustainTalk,
    reflections,
    complexReflections,
    questions,
    openQuestions,
    miConsistent: count(CONSISTENT),
    miInconsistent: count(INCONSISTENT),
    rq: questions ? Math.round((reflections / questions) * 10) / 10 : reflections ? null : null,
    pctOpen: questions ? Math.round((openQuestions / questions) * 100) : null,
    pctComplex: reflections ? Math.round((complexReflections / reflections) * 100) : null,
  };
}

export const isConsistent = (c: MitiCategory) => !INCONSISTENT.includes(c) && c !== 'closedQuestion';
export const isInconsistent = (c: MitiCategory) => INCONSISTENT.includes(c);

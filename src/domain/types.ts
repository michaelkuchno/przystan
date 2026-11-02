/**
 * Domain model of Przystań. Every record below is stored encrypted in IndexedDB
 * (see src/lib/db.ts). Dates are ISO strings (YYYY-MM-DD or full ISO timestamps).
 */

export type Space = 'practice' | 'demo';

export type WorkContext =
  | 'clinic' // poradnia leczenia uzależnień / punkt konsultacyjny
  | 'residential' // ośrodek stacjonarny / dzienny / hostel
  | 'prison' // zakład karny / areszt
  | 'juvenile' // zakład poprawczy / schronisko dla nieletnich / MOW / MOS
  | 'probation' // kuratela sądowa
  | 'school' // szkoła / świetlica / profilaktyka
  | 'community' // środowisko otwarte, OPS, PCPR
  | 'streetwork'
  | 'homeless' // ośrodek dla osób w kryzysie bezdomności
  | 'crisis'; // ośrodek interwencji kryzysowej / pogotowie opiekuńcze

export const WORK_CONTEXTS: WorkContext[] = [
  'clinic',
  'residential',
  'prison',
  'juvenile',
  'probation',
  'school',
  'community',
  'streetwork',
  'homeless',
  'crisis',
];

export type ProblemId =
  | 'alcohol'
  | 'cannabis'
  | 'stimulants'
  | 'opioids'
  | 'sedatives'
  | 'nps'
  | 'nicotine'
  | 'gambling'
  | 'gaming'
  | 'internet'
  | 'shopping'
  | 'codependency'
  | 'other';

export const PROBLEMS: ProblemId[] = [
  'alcohol',
  'cannabis',
  'stimulants',
  'opioids',
  'sedatives',
  'nps',
  'nicotine',
  'gambling',
  'gaming',
  'internet',
  'shopping',
  'codependency',
  'other',
];

/** Transtheoretical model (Prochaska & DiClemente). "recurrence" = powrót do zachowań (nawrót). */
export type Stage = 'precontemplation' | 'contemplation' | 'preparation' | 'action' | 'maintenance' | 'recurrence';
export const STAGES: Stage[] = ['precontemplation', 'contemplation', 'preparation', 'action', 'maintenance', 'recurrence'];

export type Goal = 'abstinence' | 'harmReduction' | 'undecided';
export type ClientStatus = 'active' | 'paused' | 'closed';
export type AgeGroup = 'child' | 'teen' | 'youngAdult' | 'adult' | 'senior';
export type Sex = 'female' | 'male' | 'other' | 'unspecified';

export interface KeyDate {
  id: string;
  label: string;
  date: string;
}

export interface Client {
  id: string;
  /** Pseudonymous code / initials – the default identifier. */
  code: string;
  /** Optional, discouraged. */
  fullName?: string;
  ageGroup: AgeGroup;
  age?: number;
  sex: Sex;
  context: WorkContext;
  problems: ProblemId[];
  goal: Goal;
  stage: Stage;
  status: ClientStatus;
  /** Group (e.g. a school class) instead of a single person. */
  isGroup?: boolean;
  strengths: string;
  supportNetwork: string;
  family: string;
  education: string;
  notes?: string;
  /** e.g. end of probation, leaving the facility, court hearing. */
  keyDates: KeyDate[];
  createdAt: string;
  updatedAt: string;
}

export type DiagnosisAreaId =
  | 'family'
  | 'schoolWork'
  | 'peers'
  | 'leisure'
  | 'health'
  | 'substanceUse'
  | 'riskBehaviour'
  | 'justice';

export const DIAGNOSIS_AREAS: DiagnosisAreaId[] = [
  'family',
  'schoolWork',
  'peers',
  'leisure',
  'health',
  'substanceUse',
  'riskBehaviour',
  'justice',
];

export interface DiagnosisArea {
  /** 1 = poważne trudności … 5 = dobre funkcjonowanie */
  score: number;
  notes: string;
}

export interface Diagnosis {
  id: string;
  clientId: string;
  date: string;
  areas: Record<DiagnosisAreaId, DiagnosisArea>;
  riskFactors: string[];
  protectiveFactors: string[];
  resources: string;
  conclusions: string;
}

export interface IprAction {
  id: string;
  text: string;
  responsible: string;
  due?: string;
  done: boolean;
}

export interface IprGoal {
  id: string;
  title: string;
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound?: string;
  actions: IprAction[];
  /** 0–100 */
  progress: number;
  reviewNotes: string;
}

export interface Ipr {
  id: string;
  clientId: string;
  startDate: string;
  reviewDate?: string;
  goals: IprGoal[];
  evaluation: string;
}

export interface SupportPerson {
  id: string;
  name: string;
  contact: string;
}

export interface RelapsePlan {
  id: string;
  clientId: string;
  highRiskSituations: string[];
  triggers: string[];
  warningSigns: string[];
  copingStrategies: string[];
  supportPeople: SupportPerson[];
  supportPlaces: string[];
  lapsePlan: string;
  updatedAt: string;
}

export type MeetingType = 'individual' | 'group' | 'family';
export type MeetingStatus = 'planned' | 'done' | 'missed' | 'cancelled';
export type NoteType = 'progress' | 'dap' | 'observation';

export interface Meeting {
  id: string;
  clientId?: string;
  type: MeetingType;
  /** ISO timestamp */
  date: string;
  durationMin: number;
  status: MeetingStatus;
  title?: string;
  agenda: string[];
  quickNotes: string;
  noteType: NoteType;
  /** Keys depend on noteType – see NOTE_FIELDS. */
  note: Record<string, string>;
  toolsUsed: string[];
  homework: string;
  recipeId?: string;
}

export const NOTE_FIELDS: Record<NoteType, string[]> = {
  progress: ['goal', 'course', 'observations', 'agreements', 'nextStep'],
  dap: ['data', 'assessment', 'plan'],
  observation: ['situation', 'behaviour', 'emotions', 'relations', 'strengths', 'conclusions'],
};

export type InstrumentId = 'AUDIT' | 'AUDIT-C' | 'DUDIT';
export type ToolId =
  | 'urgeSurfing'
  | 'readinessRuler'
  | 'decisionalBalance'
  | 'chainAnalysis'
  | 'halt'
  | 'thoughtRecord'
  | 'scaling'
  | 'triggerMap'
  | 'supportMap'
  | 'grounding'
  | 'breathing'
  | 'socialSkills';

export interface Measurement {
  id: string;
  clientId: string;
  date: string;
  /** Screening instrument or interactive tool. */
  source: { kind: 'screening'; instrument: InstrumentId } | { kind: 'tool'; tool: ToolId };
  /** Main numeric value used on charts (screening total, craving after, readiness…). */
  score?: number;
  /** Optional second value, e.g. craving before. */
  scoreBefore?: number;
  answers?: number[];
  /** Interpretation band id, e.g. "zone2". */
  band?: string;
  /** Free-form tool payload (balance matrix, chain links, thought record…). */
  payload?: Record<string, unknown>;
  meetingId?: string;
  note?: string;
}

export type TimelineEventType =
  | 'court'
  | 'pass'
  | 'transfer'
  | 'schoolReturn'
  | 'work'
  | 'stageChange'
  | 'lapse'
  | 'milestone'
  | 'other';

export interface TimelineEvent {
  id: string;
  clientId: string;
  date: string;
  type: TimelineEventType;
  title: string;
  note: string;
}

export type GenoNodeKind = 'female' | 'male' | 'person' | 'institution' | 'group';
export type GenoEdgeType = 'family' | 'strong' | 'weak' | 'conflict' | 'stressful' | 'support' | 'cutoff';

export interface GenoNode {
  id: string;
  label: string;
  kind: GenoNodeKind;
  x: number;
  y: number;
  isClient?: boolean;
  deceased?: boolean;
  substance?: boolean;
  note?: string;
}

export interface GenoEdge {
  id: string;
  from: string;
  to: string;
  type: GenoEdgeType;
}

export interface Genogram {
  id: string;
  clientId: string;
  nodes: GenoNode[];
  edges: GenoEdge[];
  updatedAt: string;
}

export interface RecipeItem {
  id: string;
  /** Id of an ingredient from content templates.json, or "custom". */
  ingredientId: string;
  title: string;
  minutes: number;
  note: string;
}

/** "Przepis na zajęcia" – a session plan. */
export interface Recipe {
  id: string;
  title: string;
  goal: string;
  audience: string;
  durationMin: number;
  items: RecipeItem[];
  templateId?: string;
  updatedAt: string;
}

export type PreventionLevel = 'universal' | 'selective' | 'indicated';

export interface EvaluationIndicator {
  id: string;
  label: string;
  /** Mean values on a common scale (e.g. 1–5) from pre/post surveys. */
  pre?: number;
  post?: number;
}

export interface PreventionProgram {
  id: string;
  title: string;
  setting: string;
  needs: string;
  resources: string;
  targetGroup: string;
  level: PreventionLevel;
  riskFactors: string[];
  protectiveFactors: string[];
  generalGoal: string;
  specificGoals: string[];
  strategies: string[];
  recipeIds: string[];
  schedule: { id: string; date: string; activity: string }[];
  budgetResources: string;
  indicators: EvaluationIndicator[];
  checklist: Record<string, boolean>;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  area: string;
  text: string;
  due?: string;
  done: boolean;
}

export interface ReadaptationPlan {
  id: string;
  clientId: string;
  releaseDate?: string;
  items: ChecklistItem[];
  updatedAt: string;
}

export interface FamilyPlan {
  id: string;
  clientId: string;
  familyGoals: string[];
  familyStrengths: string;
  supportForFamily: string[];
  safetyNotes: string;
  agreements: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  due?: string;
  done: boolean;
  clientId?: string;
}

export interface FlashCard {
  id: string;
  front: string;
  back: string;
}

export interface Deck {
  id: string;
  title: string;
  module: string;
  cards: FlashCard[];
  builtIn?: boolean;
}

export interface CardState {
  /** `${deckId}:${cardId}` */
  id: string;
  deckId: string;
  cardId: string;
  easiness: number;
  interval: number;
  repetitions: number;
  due: string;
  lapses: number;
}

export interface SimulatorRun {
  id: string;
  scenarioId: string;
  date: string;
  choices: string[];
  alliance: number;
  changeTalk: number;
  sustainTalk: number;
}

/** Map of every record kind to its type. */
export interface RecordMap {
  client: Client;
  diagnosis: Diagnosis;
  ipr: Ipr;
  relapsePlan: RelapsePlan;
  meeting: Meeting;
  measurement: Measurement;
  event: TimelineEvent;
  genogram: Genogram;
  recipe: Recipe;
  prevention: PreventionProgram;
  readaptation: ReadaptationPlan;
  familyPlan: FamilyPlan;
  task: Task;
  deck: Deck;
  cardState: CardState;
  simRun: SimulatorRun;
}

export type RecordKind = keyof RecordMap;
export const RECORD_KINDS: RecordKind[] = [
  'client',
  'diagnosis',
  'ipr',
  'relapsePlan',
  'meeting',
  'measurement',
  'event',
  'genogram',
  'recipe',
  'prevention',
  'readaptation',
  'familyPlan',
  'task',
  'deck',
  'cardState',
  'simRun',
];

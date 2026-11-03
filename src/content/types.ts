/**
 * Shapes of the bilingual content files in src/locales/{pl,en}/content/*.json.
 * The PL and EN file of each kind must have the same structure and the same ids
 * (enforced by src/content/content.test.ts).
 */
import type {
  Client,
  Diagnosis,
  FamilyPlan,
  Genogram,
  Ipr,
  Measurement,
  Meeting,
  PreventionLevel,
  PreventionProgram,
  ReadaptationPlan,
  Recipe,
  RelapsePlan,
  TimelineEvent,
  ToolId,
  WorkContext,
  Deck,
} from '@/domain/types';

export type ReviewStatus = 'do_weryfikacji' | 'zweryfikowane';

export interface Source {
  authors: string;
  year: number | string;
  title: string;
  publisher?: string;
}

/* ---------------------------------------------------------------- knowledge */

export type KnowledgeSection = 'approaches' | 'resocialization' | 'family' | 'criteria' | 'law' | 'prevention';

export interface KnowledgeCard {
  id: string;
  section: KnowledgeSection;
  title: string;
  /** Istota – 2–4 sentences. */
  essence: string;
  whenToUse: string[];
  techniques: string[];
  /** Przykładowe sformułowania (what the practitioner can say). */
  phrases: string[];
  pitfalls: string[];
  sources: Source[];
  tags: string[];
  reviewStatus: ReviewStatus;
}

/** knowledge.json, resocialization.json, family.json */
export interface KnowledgeFile {
  cards: KnowledgeCard[];
}

/* ------------------------------------------------------------- help system */

export type InstitutionCategory = 'treatment' | 'social' | 'justice' | 'selfHelp' | 'phone' | 'education' | 'local' | 'central';

export interface Institution {
  id: string;
  name: string;
  category: InstitutionCategory;
  role: string;
  forWhom: string;
  howToAccess: string;
  reviewStatus: ReviewStatus;
}

export interface ReferralQuestion {
  id: 'age' | 'problem' | 'context' | 'urgency';
  text: string;
  options: { id: string; label: string }[];
}

/**
 * A rule matches when for every key in `when` the user's answer is one of the
 * listed option ids. Keys that are absent match any answer.
 */
export interface ReferralRule {
  id: string;
  title: string;
  when: Partial<Record<ReferralQuestion['id'], string[]>>;
  institutionIds: string[];
  steps: string[];
  note?: string;
}

export interface LegalBasis {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
  /** e.g. "2026-11" */
  stateAsOf: string;
  reviewStatus: ReviewStatus;
}

export interface CrisisNumber {
  id: string;
  country: 'CH' | 'PL';
  number: string;
  name: string;
  description: string;
  reviewStatus: ReviewStatus;
}

export interface HelpSystemFile {
  intro: string;
  institutions: Institution[];
  referral: { questions: ReferralQuestion[]; rules: ReferralRule[] };
  legal: LegalBasis[];
  crisis: CrisisNumber[];
  /** EN only: note that content describes Poland; PL: empty string. */
  countryNote: string;
}

/* -------------------------------------------------------------- prevention */

export type FactorDomain = 'individual' | 'family' | 'school' | 'peers' | 'community';

export interface PreventionFile {
  levels: { id: PreventionLevel; title: string; description: string; examples: string[] }[];
  riskFactors: { id: string; domain: FactorDomain; text: string }[];
  protectiveFactors: { id: string; domain: FactorDomain; text: string }[];
  strategies: {
    id: string;
    title: string;
    description: string;
    evidence: 'strong' | 'moderate' | 'limited' | 'harmful';
  }[];
  goodPractice: { id: string; kind: 'do' | 'avoid'; text: string; rationale: string; sources: Source[] }[];
  standards: { title: string; paragraphs: string[]; reviewStatus: ReviewStatus };
  /** Hint shown on each wizard step: needs, target, factors, goals, strategies, schedule, evaluation */
  wizardHints: Record<'needs' | 'target' | 'factors' | 'goals' | 'strategies' | 'schedule' | 'evaluation', string>;
  indicatorExamples: string[];
}

/* --------------------------------------------------------------- templates */

export type IngredientCategory =
  'opening' | 'mi' | 'cbt' | 'skills' | 'group' | 'family' | 'prevention' | 'relaxation' | 'closing';

export interface Ingredient {
  id: string;
  title: string;
  category: IngredientCategory;
  minutes: number;
  description: string;
  toolId?: ToolId;
}

export interface SessionTemplate {
  id:
    | 'firstMeeting'
    | 'motivationalInterview'
    | 'chainAnalysis'
    | 'sociotherapy'
    | 'socialSkills'
    | 'familySession'
    | 'classPrevention'
    | string;
  title: string;
  goal: string;
  audience: string;
  items: { ingredientId: string; minutes: number }[];
}

export interface TemplatesFile {
  ingredients: Ingredient[];
  sessionTemplates: SessionTemplate[];
  sociotherapy: {
    title: string;
    goals: string[];
    groupRules: string[];
    cycle: { no: number; title: string; aims: string; activities: string[] }[];
  };
  readaptationAreas: { id: string; title: string; items: string[] }[];
  familySupport: { goalExamples: string[]; supportExamples: string[] };
}

/* ------------------------------------------------------------------- tools */

export interface Aud {
  youth: string;
  adult: string;
}

export interface ToolsFile {
  intros: Record<ToolId, Aud>;
  urgeSurfing: { steps: Aud[] };
  readiness: { importance: Aud[]; confidence: Aud[]; readiness: Aud[] };
  decisionalBalance: { prompts: Record<'prosChange' | 'consChange' | 'prosStatus' | 'consStatus', Aud> };
  chainAnalysis: { prompts: Record<'trigger' | 'thoughts' | 'emotions' | 'behaviour' | 'consequences', Aud> };
  halt: { items: Record<'hungry' | 'angry' | 'lonely' | 'tired', { question: Aud; ideas: string[] }> };
  distortions: { id: string; name: string; description: string; example: string }[];
  scaling: { miracle: Aud; followUps: Aud[] };
  triggerSuggestions: string[];
  supportSuggestions: string[];
  grounding: { steps: { count: number; sense: string; prompt: Aud }[] };
  breathing: { patterns: { id: string; name: string; inhale: number; hold: number; exhale: number; holdAfter: number }[] };
  socialSkills: {
    id: string;
    skill: 'refusal' | 'peerPressure' | 'conflict' | 'jobInterview' | 'askingForHelp' | 'criticism';
    title: string;
    audience: 'youth' | 'adult' | 'both';
    situation: string;
    roles: string[];
    steps: string[];
    tips: string[];
  }[];
}

/* --------------------------------------------------------------- simulator */

export type MitiCategory =
  | 'simpleReflection'
  | 'complexReflection'
  | 'openQuestion'
  | 'closedQuestion'
  | 'affirmation'
  | 'summary'
  | 'adviseWithPermission'
  | 'confront'
  | 'moralize'
  | 'adviseWithoutPermission';

export interface ScenarioOption {
  id: string;
  text: string;
  category: MitiCategory;
  /** Short explanation shown in the summary. */
  feedback: string;
  /** −2 … +2 */
  alliance: number;
  next: string;
}

export interface ScenarioNode {
  id: string;
  /** What the virtual client says. */
  client: string;
  /** Type of the client's utterance for the change-talk bar. */
  talk: 'change' | 'sustain' | 'neutral';
  /** 'calm' | 'guarded' | 'angry' | 'sad' | 'hopeful' – drives the avatar. */
  mood: 'calm' | 'guarded' | 'angry' | 'sad' | 'hopeful';
  options: ScenarioOption[];
  /** Ending node: no options. */
  ending?: { title: string; text: string; quality: 'good' | 'mixed' | 'poor' };
}

export interface Scenario {
  id: string;
  /** Set in Switzerland ('CH'); absent = Poland. Shown with a badge; listed first for that country. */
  country?: 'CH';
  title: string;
  context: WorkContext;
  audience: 'youth' | 'adult';
  persona: { name: string; age: number; description: string };
  intro: string;
  start: string;
  nodes: ScenarioNode[];
  reviewStatus: ReviewStatus;
}

export interface ScenariosFile {
  scenarios: Scenario[];
}

/* ------------------------------------------------------------------- decks */

export interface DecksFile {
  decks: Deck[];
}

/* -------------------------------------------------------------------- demo */

/**
 * Demo cases. Every date field may be written as "@<offset>" (days relative to
 * today, e.g. "@-30") or "@<offset>T<HH:MM>" for timestamps – see src/lib/demo.ts.
 */
export interface DemoCase {
  id: string;
  /** Set in Switzerland ('CH'); absent = Poland. Only cases of the user's country of work are seeded. */
  country?: 'CH';
  client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>;
  diagnosis?: Omit<Diagnosis, 'id' | 'clientId'>;
  ipr?: Omit<Ipr, 'id' | 'clientId'>;
  relapsePlan?: Omit<RelapsePlan, 'id' | 'clientId' | 'updatedAt'>;
  meetings: Omit<Meeting, 'id' | 'clientId'>[];
  measurements: Omit<Measurement, 'id' | 'clientId'>[];
  events: Omit<TimelineEvent, 'id' | 'clientId'>[];
  genogram?: Omit<Genogram, 'id' | 'clientId' | 'updatedAt'>;
  readaptation?: Omit<ReadaptationPlan, 'id' | 'clientId' | 'updatedAt'>;
  familyPlan?: Omit<FamilyPlan, 'id' | 'clientId' | 'updatedAt'>;
  prevention?: Omit<PreventionProgram, 'id' | 'updatedAt'>;
  recipes?: Omit<Recipe, 'id' | 'updatedAt'>[];
}

export interface DemoFile {
  cases: DemoCase[];
}

export interface ContentBundle {
  knowledge: KnowledgeFile;
  resocialization: KnowledgeFile;
  family: KnowledgeFile;
  /** Polish help system (+ Polish crisis numbers). */
  helpsystem: HelpSystemFile;
  /** Swiss help system (canton of Bern) + Swiss crisis numbers. */
  helpsystemCH: HelpSystemFile;
  prevention: PreventionFile;
  templates: TemplatesFile;
  tools: ToolsFile;
  scenarios: ScenariosFile;
  decks: DecksFile;
  demo: DemoFile;
}

export type ContentKind = keyof ContentBundle;
export const CONTENT_KINDS: ContentKind[] = [
  'knowledge',
  'resocialization',
  'family',
  'helpsystem',
  'helpsystemCH',
  'prevention',
  'templates',
  'tools',
  'scenarios',
  'decks',
  'demo',
];

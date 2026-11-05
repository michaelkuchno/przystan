/**
 * Studies module (D-067…D-069): an official study programme (public syllabi) as the frame, the
 * student's own adjustments and materials as encrypted records, learning progress per topic.
 */

export type Assessment = 'E' | 'ZO' | 'Z';
export type CourseGroup = 'general' | 'specialization' | 'addiction' | 'seminar' | 'practice' | 'custom';

export interface ProgramCourse {
  id: string;
  name: string;
  semester: number;
  /** Courses running over several semesters (seminar, practice, language). */
  alsoIn?: number[];
  ects: number;
  /** W lecture, C classes, S seminar, P practice – hours. */
  hours: Partial<Record<'W' | 'C' | 'S' | 'P', number>>;
  assessment: Assessment;
  group: CourseGroup;
  topics: string[];
  literature: string[];
  /** Syllabus of the first-cycle programme used as the closest equivalent. */
  proxy?: boolean;
  /** Topics compiled by Przystań (WSHE published no syllabus topics for this course). */
  topicsBy?: 'przystan';
  source: 'I' | 'II' | 'own';
}

export interface Program {
  id: string;
  university: string;
  short: string;
  address: string;
  program: string;
  specialization: string;
  semesters: number;
  ects: number;
  checked: string;
  note: string;
  sources: { title: string; url: string }[];
  courses: ProgramCourse[];
}

/** 0 = not yet, 1 = needs review, 2 = I know it. */
export type TopicLevel = 0 | 1 | 2;

/** The student's adjustments of a programme course – or a course of her own (custom: true). */
export interface StudyCourse {
  id: string;
  /** Overrides (a custom course defines all of them). */
  name?: string;
  semester?: number;
  ects?: number;
  assessment?: Assessment;
  /** Extra topics (from the lecturer, the class plan). */
  extraTopics?: string[];
  hidden?: boolean;
  custom?: boolean;
  /** Exam / credit date (YYYY-MM-DD) and an optional time / room note. */
  examDate?: string;
  examNote?: string;
  /** Self-assessment per topic (key = topic text). */
  levels?: Record<string, TopicLevel>;
  updatedAt: string;
}

/** Notes / handouts / PDF text from classes – private, used by search, AI questions and exams. */
export interface StudyMaterial {
  id: string;
  courseId: string;
  title: string;
  text: string;
  kind: 'notes' | 'pdf' | 'text';
  createdAt: string;
  updatedAt: string;
}

export interface ExamQuestion {
  type: 'single' | 'open';
  question: string;
  options?: string[];
  correct?: number;
  /** Model answer (open) or explanation (single). */
  answer: string;
  topic?: string;
}

/** A mock exam taken in the app. */
export interface StudyAttempt {
  id: string;
  courseId: string;
  date: string;
  questions: ExamQuestion[];
  /** Index of the chosen option / the written answer. */
  answers: (number | string | null)[];
  /** Points per question (0–1). */
  points: number[];
  score: number;
  updatedAt: string;
}

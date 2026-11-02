import type { Measurement, ToolId } from '@/domain/types';
import type { Aud } from '@/content/types';
import {
  Waves,
  Ruler,
  Scale,
  Link2,
  Gauge,
  NotebookPen,
  Stars,
  Target,
  HeartHandshake,
  Hand,
  Wind,
  Theater,
  type LucideIcon,
} from 'lucide-react';

export type Audience = keyof Aud;

/** What a tool reports when the user saves its result. */
export type ToolResult = Pick<Measurement, 'score' | 'scoreBefore' | 'payload' | 'note'>;

export interface ToolProps {
  aud: Audience;
  /** Called whenever the result changes; ToolRunner saves the latest one. */
  onResult: (r: ToolResult) => void;
}

export const TOOL_META: { id: ToolId; icon: LucideIcon; group: 'motivation' | 'coping' | 'cognitive' | 'skills' }[] = [
  { id: 'urgeSurfing', icon: Waves, group: 'coping' },
  { id: 'readinessRuler', icon: Ruler, group: 'motivation' },
  { id: 'decisionalBalance', icon: Scale, group: 'motivation' },
  { id: 'chainAnalysis', icon: Link2, group: 'cognitive' },
  { id: 'halt', icon: Gauge, group: 'coping' },
  { id: 'thoughtRecord', icon: NotebookPen, group: 'cognitive' },
  { id: 'scaling', icon: Stars, group: 'motivation' },
  { id: 'triggerMap', icon: Target, group: 'cognitive' },
  { id: 'supportMap', icon: HeartHandshake, group: 'skills' },
  { id: 'grounding', icon: Hand, group: 'coping' },
  { id: 'breathing', icon: Wind, group: 'coping' },
  { id: 'socialSkills', icon: Theater, group: 'skills' },
];

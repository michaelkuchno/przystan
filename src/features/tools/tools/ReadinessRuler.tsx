import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircleQuestion } from 'lucide-react';
import { Slider } from '@/components/ui/form';
import { useContent } from '@/content/ContentProvider';
import type { ToolProps } from '../registry';

const KEYS = ['importance', 'confidence', 'readiness'] as const;

export default function ReadinessRuler({ aud, onResult }: ToolProps) {
  const { t } = useTranslation('tools');
  const q = useContent('tools').readiness;
  const [v, setV] = useState({ importance: 5, confidence: 5, readiness: 5 });
  useEffect(() => onResult({ score: v.readiness, payload: v }), [v, onResult]);
  return (
    <div className="space-y-6">
      {KEYS.map((k) => (
        <div key={k} className="rounded-2xl bg-surface-2/60 p-4">
          <Slider label={t(`ruler.${k}`)} value={v[k]} onChange={(n) => setV({ ...v, [k]: n })} minLabel="0" maxLabel="10" />
          <ul className="mt-3 space-y-1.5">
            {q[k].map((x, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>{x[aud].replace(/\{n\}|\{\{n\}\}/g, String(v[k]))}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { Plus, HeartHandshake, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Button, EmptyState } from '@/components/ui/core';
import { ListEditor, TextField } from '@/components/ui/form';
import { Notice } from '@/components/ui/page';
import { SaveStatus } from '@/components/SaveStatus';
import { useStore, forClient, save, uid } from '@/lib/store';
import { useEditable } from '@/lib/useEditable';
import { useContent } from '@/content/ContentProvider';
import type { Client, FamilyPlan } from '@/domain/types';

function Editor({ plan }: { plan: FamilyPlan }) {
  const { t } = useTranslation('clients');
  const fs = useContent('templates').familySupport;
  const { draft, update, status } = useEditable('familyPlan', plan);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">{t('familyPlan.intro')}</p>
        <SaveStatus status={status} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <ListEditor label={t('familyPlan.goals')} items={draft.familyGoals} onChange={(v) => update({ familyGoals: v })} suggestions={fs.goalExamples} />
        </Card>
        <Card>
          <ListEditor label={t('familyPlan.support')} items={draft.supportForFamily} onChange={(v) => update({ supportForFamily: v })} suggestions={fs.supportExamples} />
        </Card>
        <Card>
          <TextField multiline rows={4} label={t('familyPlan.strengths')} value={draft.familyStrengths} onChange={(v) => update({ familyStrengths: v })} />
        </Card>
        <Card>
          <TextField multiline rows={4} label={t('familyPlan.agreements')} value={draft.agreements} onChange={(v) => update({ agreements: v })} />
        </Card>
      </div>
      <Card className="space-y-3 border-accent/30">
        <TextField multiline rows={3} label={t('familyPlan.safety')} hint={t('familyPlan.safetyHint')} value={draft.safetyNotes} onChange={(v) => update({ safetyNotes: v })} />
        <Notice tone="accent" icon={<ShieldAlert aria-hidden />}>
          {t('familyPlan.violence')}{' '}
          <Link className="font-semibold underline" to="/family/violence">
            {t('familyPlan.violenceLink')}
          </Link>
        </Notice>
      </Card>
    </div>
  );
}

export default function FamilyPlanTab({ client }: { client: Client }) {
  const { t } = useTranslation('clients');
  const plan = useStore(() => forClient('familyPlan', client.id))[0];
  if (!plan)
    return (
      <EmptyState
        icon={<HeartHandshake />}
        title={t('familyPlan.emptyTitle')}
        text={t('familyPlan.emptyText')}
        action={
          <Button
            icon={<Plus className="size-4" />}
            onClick={() =>
              void save('familyPlan', {
                id: uid(),
                clientId: client.id,
                familyGoals: [],
                familyStrengths: '',
                supportForFamily: [],
                safetyNotes: '',
                agreements: '',
                updatedAt: new Date().toISOString(),
              })
            }
          >
            {t('familyPlan.create')}
          </Button>
        }
      />
    );
  return <Editor key={plan.id} plan={plan} />;
}

import { useTranslation } from 'react-i18next';
import { Plus, LifeBuoy, FileDown, Trash2 } from 'lucide-react';
import { Card, Button, EmptyState, IconButton } from '@/components/ui/core';
import { ListEditor, TextField, TextInput } from '@/components/ui/form';
import { SaveStatus } from '@/components/SaveStatus';
import { useToast } from '@/components/ui/toast';
import { useStore, forClient, save, uid } from '@/lib/store';
import { useEditable } from '@/lib/useEditable';
import { useContent } from '@/content/ContentProvider';
import { relapseCardPdf } from '@/lib/reports';
import type { Client, RelapsePlan } from '@/domain/types';

function Editor({ plan }: { plan: RelapsePlan }) {
  const { t } = useTranslation('clients');
  const tools = useContent('tools');
  const toast = useToast();
  const { draft, update, status, flush } = useEditable('relapsePlan', plan);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 text-sm text-muted">{t('relapse.intro')}</p>
        <SaveStatus status={status} history={{ kind: 'relapsePlan', id: draft.id }} />
        <Button
          variant="soft"
          size="sm"
          icon={<FileDown className="size-4" />}
          onClick={async () => {
            await flush();
            await relapseCardPdf(draft);
            toast({ text: t('common:pdfReady'), tone: 'ok' });
          }}
        >
          {t('relapse.export')}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <ListEditor
            label={t('relapse.highRisk')}
            hint={t('relapse.highRiskHint')}
            items={draft.highRiskSituations}
            onChange={(v) => update({ highRiskSituations: v })}
          />
        </Card>
        <Card>
          <ListEditor
            label={t('relapse.triggers')}
            items={draft.triggers}
            onChange={(v) => update({ triggers: v })}
            suggestions={tools.triggerSuggestions}
          />
        </Card>
        <Card>
          <ListEditor
            label={t('relapse.warning')}
            hint={t('relapse.warningHint')}
            items={draft.warningSigns}
            onChange={(v) => update({ warningSigns: v })}
          />
        </Card>
        <Card>
          <ListEditor
            label={t('relapse.coping')}
            items={draft.copingStrategies}
            onChange={(v) => update({ copingStrategies: v })}
            suggestions={Object.values(tools.halt.items).flatMap((h) => h.ideas)}
          />
        </Card>
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{t('relapse.people')}</h3>
            <Button
              size="sm"
              variant="soft"
              icon={<Plus className="size-4" />}
              onClick={() => update((d) => ({ ...d, supportPeople: [...d.supportPeople, { id: uid(), name: '', contact: '' }] }))}
            >
              {t('common:add')}
            </Button>
          </div>
          {draft.supportPeople.map((p) => (
            <div key={p.id} className="flex gap-2">
              <TextInput
                aria-label={t('relapse.personName')}
                placeholder={t('relapse.personName')}
                value={p.name}
                onChange={(e) =>
                  update((d) => ({
                    ...d,
                    supportPeople: d.supportPeople.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)),
                  }))
                }
              />
              <TextInput
                aria-label={t('relapse.personContact')}
                placeholder={t('relapse.personContact')}
                value={p.contact}
                onChange={(e) =>
                  update((d) => ({
                    ...d,
                    supportPeople: d.supportPeople.map((x) => (x.id === p.id ? { ...x, contact: e.target.value } : x)),
                  }))
                }
              />
              <IconButton
                label={t('common:delete')}
                onClick={() => update((d) => ({ ...d, supportPeople: d.supportPeople.filter((x) => x.id !== p.id) }))}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </div>
          ))}
        </Card>
        <Card>
          <ListEditor
            label={t('relapse.places')}
            items={draft.supportPlaces}
            onChange={(v) => update({ supportPlaces: v })}
            suggestions={tools.supportSuggestions}
          />
        </Card>
      </div>
      <Card className="border-accent/30">
        <TextField
          multiline
          rows={4}
          label={t('relapse.lapsePlan')}
          hint={t('relapse.lapsePlanHint')}
          value={draft.lapsePlan}
          onChange={(v) => update({ lapsePlan: v })}
        />
      </Card>
    </div>
  );
}

export default function RelapseTab({ client }: { client: Client }) {
  const { t } = useTranslation('clients');
  const plan = useStore(() => forClient('relapsePlan', client.id))[0];
  if (!plan)
    return (
      <EmptyState
        icon={<LifeBuoy />}
        title={t('relapse.emptyTitle')}
        text={t('relapse.emptyText')}
        action={
          <Button
            icon={<Plus className="size-4" />}
            onClick={() =>
              void save('relapsePlan', {
                id: uid(),
                clientId: client.id,
                highRiskSituations: [],
                triggers: [],
                warningSigns: [],
                copingStrategies: [],
                supportPeople: [],
                supportPlaces: [],
                lapsePlan: '',
                updatedAt: new Date().toISOString(),
              })
            }
          >
            {t('relapse.create')}
          </Button>
        }
      />
    );
  return <Editor key={plan.id} plan={plan} />;
}

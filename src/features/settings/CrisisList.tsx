import { useTranslation } from 'react-i18next';
import { Phone } from 'lucide-react';
import { ReviewBadge } from '@/components/ui/notice';
import { Card } from '@/components/ui/core';
import { useContent } from '@/content/ContentProvider';

export function CrisisList() {
  const { t } = useTranslation('help');
  const crisis = useContent('helpsystem').crisis;
  return (
    <div className="space-y-5">
      {(['PL', 'CH'] as const).map((country) => (
        <section key={country}>
          <h2 className="mb-2 font-sans text-sm font-semibold tracking-wider text-muted uppercase">{t(`country.${country}`)}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {crisis
              .filter((c) => c.country === country)
              .map((c) => (
                <Card key={c.id} className="flex items-center gap-3 p-3 sm:p-3">
                  <a
                    href={`tel:${c.number.replace(/\s/g, '')}`}
                    className="flex min-h-14 min-w-[7.5rem] items-center justify-center gap-2 rounded-2xl bg-accent px-3 font-serif text-xl font-semibold text-white dark:text-black"
                    aria-label={t('call', { number: c.number, name: c.name })}
                  >
                    <Phone className="size-4" aria-hidden />
                    {c.number}
                  </a>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-sm text-muted">{c.description}</div>
                    <div className="mt-1">
                      <ReviewBadge id={c.id} status={c.reviewStatus} />
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

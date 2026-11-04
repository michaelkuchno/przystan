import { useTranslation } from 'react-i18next';
import { Info, ShieldCheck, LifeBuoy, MessageCircleQuestion } from 'lucide-react';
import { usePrefs } from '@/lib/prefs';
import { Page, PageHeader } from '@/components/ui/page';
import { CardLink } from '@/components/ui/core';
import { SECONDARY_NAV } from '@/app/Shell';

export default function More() {
  const { t } = useTranslation();
  const aiOn = usePrefs().ai.mode !== 'off';
  const items = [
    ...SECONDARY_NAV,
    ...(aiOn ? [{ to: '/ask', key: 'ask', icon: MessageCircleQuestion }] : []),
    { to: '/crisis', key: 'crisis', icon: LifeBuoy },
    { to: '/info/privacy', key: 'privacy', icon: ShieldCheck },
    { to: '/info/about', key: 'about', icon: Info },
  ];
  return (
    <Page>
      <PageHeader title={t('nav.more')} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((n) => (
          <CardLink key={n.to} to={n.to} className={n.key === 'crisis' ? 'border-accent/40 bg-accent-soft/40' : undefined}>
            <n.icon className={n.key === 'crisis' ? 'size-7 text-accent' : 'size-7 text-primary'} aria-hidden />
            <div className="mt-2 font-semibold">{n.key === 'ask' ? t('ai:ask.title') : t(`nav.${n.key}`)}</div>
            <div className="mt-0.5 text-xs text-muted">{n.key === 'ask' ? t('ai:ask.navHint') : t(`navHint.${n.key}`)}</div>
          </CardLink>
        ))}
      </div>
    </Page>
  );
}

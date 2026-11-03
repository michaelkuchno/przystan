import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from './cn';
import { IconButton } from './core';

export function Page({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.main
      id="main"
      tabIndex={-1}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={cn(
        'mx-auto w-full px-4 pt-4 pb-[calc(2rem+var(--tabbar-h))] focus:outline-none sm:px-6 lg:pb-12',
        wide ? 'max-w-6xl' : 'max-w-4xl',
        className,
      )}
    >
      {children}
    </motion.main>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: string | true;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  const nav = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="mb-5 flex flex-wrap items-start gap-3">
      {back && (
        <IconButton label={t('back')} className="-ml-2" onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}>
          <ArrowLeft className="size-5" />
        </IconButton>
      )}
      {/* the title keeps at least ~16rem; actions wrap below it on narrow screens */}
      <div className="min-w-0 flex-1 basis-64">
        {eyebrow && <div className="mb-1 text-xs font-semibold tracking-wider text-accent uppercase">{eyebrow}</div>}
        <h1 className="text-2xl leading-tight font-semibold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export { ReviewBadge, Notice, SupportiveNote } from './notice';

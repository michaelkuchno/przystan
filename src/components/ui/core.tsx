import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'soft';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover shadow-sm',
  secondary: 'bg-surface text-fg border border-line hover:bg-surface-2',
  ghost: 'text-fg hover:bg-surface-2',
  danger: 'bg-danger text-white hover:opacity-90 dark:text-black',
  accent: 'bg-accent text-white hover:opacity-90 dark:text-black',
  soft: 'bg-primary-soft text-primary-soft-fg hover:brightness-95',
};
const sizes: Record<Size, string> = {
  sm: 'min-h-11 px-3 text-sm gap-1.5',
  md: 'min-h-11 px-4 text-[length:calc(0.95rem*var(--fs-body))] gap-2',
  lg: 'min-h-13 px-6 text-base gap-2',
};

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', extra?: string) =>
  cn(
    'inline-flex max-w-full min-w-0 items-center justify-center rounded-xl text-center font-medium [overflow-wrap:anywhere] transition-[background,transform,opacity] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none',
    variants[variant],
    sizes[size],
    extra,
  );

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
});

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
  ...rest
}: LinkProps & { variant?: Variant; size?: Size; icon?: ReactNode }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: Variant }
>(function IconButton({ label, variant = 'ghost', className, children, type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-xl transition active:scale-95',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardLink({ to, className, children, ...rest }: LinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        'group block rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-primary/40 sm:p-5',
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}

type Tone = 'neutral' | 'primary' | 'blue' | 'accent' | 'warn' | 'danger' | 'ok';
const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted',
  primary: 'bg-primary-soft text-primary-soft-fg',
  blue: 'bg-blue-soft text-blue',
  accent: 'bg-accent-soft text-accent-soft-fg',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  ok: 'bg-ok-soft text-ok',
};

export function Badge({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone], className)}>
      {children}
    </span>
  );
}

export function SectionTitle({ children, action, id }: { children: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="mt-6 mb-3 flex items-center justify-between gap-2">
      <h2 id={id} className="text-lg font-semibold">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon?: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line bg-surface/60 px-6 py-10 text-center">
      {icon && <div className="mb-3 text-primary [&_svg]:size-10">{icon}</div>}
      <p className="font-serif text-lg font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-xl', className)} aria-hidden="true" />;
}

export function ListRow({
  to,
  title,
  subtitle,
  leading,
  trailing,
  className,
}: {
  to?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  const inner = (
    <>
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{title}</div>
        {subtitle && <div className="mt-0.5 text-sm text-muted">{subtitle}</div>}
      </div>
      {trailing}
      {to && <ChevronRight className="size-5 shrink-0 text-muted transition group-hover:translate-x-0.5" aria-hidden />}
    </>
  );
  const cls = cn('group flex min-h-14 items-center gap-3 px-4 py-3', className);
  return to ? (
    <Link to={to} className={cn(cls, 'hover:bg-surface-2')}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export function List({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Stat({ label, value, hint, tone = 'primary' }: { label: string; value: ReactNode; hint?: string; tone?: Tone }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-xs font-medium tracking-wide text-muted uppercase">{label}</div>
      <div className={cn('mt-1 font-serif text-3xl font-semibold', tone === 'accent' ? 'text-accent' : 'text-primary')}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Avatar({ label, tone = 'primary' }: { label: string; tone?: 'primary' | 'accent' | 'blue' }) {
  const t = {
    primary: 'bg-primary-soft text-primary-soft-fg',
    accent: 'bg-accent-soft text-accent-soft-fg',
    blue: 'bg-blue-soft text-blue',
  }[tone];
  return (
    <span
      className={cn('pii inline-flex size-11 items-center justify-center rounded-2xl font-serif text-sm font-semibold', t)}
      aria-hidden
    >
      {label.slice(0, 3)}
    </span>
  );
}

export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('space-y-3 leading-relaxed text-fg/90', className)}>{children}</div>;
}

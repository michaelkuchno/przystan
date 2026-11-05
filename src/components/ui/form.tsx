import {
  forwardRef,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import * as RSlider from '@radix-ui/react-slider';
import * as RSwitch from '@radix-ui/react-switch';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from './cn';

const control =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[length:calc(0.95rem*var(--fs-body))] text-fg placeholder:text-muted/80 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 min-h-11';

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(control, className)} {...rest} />;
});

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Grows with its content (no inner scrolling) – for short-to-medium texts in lists and cards. */
  autoGrow?: boolean;
};

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { className, rows = 3, autoGrow = false, value, ...rest },
  ref,
) {
  const inner = useRef<HTMLTextAreaElement | null>(null);
  const setRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      inner.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );
  useLayoutEffect(() => {
    const el = inner.current;
    if (!autoGrow || !el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [autoGrow, value]);
  return (
    <textarea
      ref={setRef}
      rows={rows}
      value={value}
      className={cn(control, autoGrow ? 'resize-none overflow-hidden' : 'resize-y', 'leading-relaxed', className)}
      {...rest}
    />
  );
});

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(control, 'appearance-auto pr-8', className)} {...rest}>
      {children}
    </select>
  );
}

/** Labelled text input with automatic id. */
export function TextField({
  label,
  hint,
  value,
  onChange,
  multiline,
  rows,
  ...rest
}: {
  label: ReactNode;
  hint?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  rows?: number;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      {multiline ? (
        <TextArea
          autoGrow
          id={id}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={rest.placeholder}
        />
      ) : (
        <TextInput id={id} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
      )}
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: ReactNode;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

/** Toggle chips – single or multiple choice, keyboard accessible. */
export function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
  multiple,
  className,
  hint,
}: {
  label?: string;
  hint?: string;
  options: { value: T; label: string }[];
  value: T[] | T;
  onChange: (v: T[]) => void;
  multiple?: boolean;
  className?: string;
}) {
  const selected = Array.isArray(value) ? value : [value];
  return (
    <fieldset className={className}>
      {label && <legend className="mb-1.5 text-sm font-medium">{label}</legend>}
      {hint && <p className="-mt-1 mb-2 text-xs text-muted">{hint}</p>}
      <div className="flex flex-wrap gap-2" role={multiple ? 'group' : 'radiogroup'}>
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              role={multiple ? 'checkbox' : 'radio'}
              aria-checked={on}
              onClick={() =>
                onChange(multiple ? (on ? selected.filter((v) => v !== o.value) : [...selected, o.value]) : [o.value])
              }
              className={cn(
                'min-h-11 rounded-full border px-3.5 text-sm transition active:scale-95',
                on ? 'border-primary bg-primary text-primary-fg' : 'border-line bg-surface hover:bg-surface-2',
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Editable list of short strings (factors, triggers, goals…). */
export function ListEditor({
  label,
  items,
  onChange,
  placeholder,
  suggestions,
  hint,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  hint?: string;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const id = useId();
  const add = (text: string) => {
    const v = text.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setDraft('');
  };
  const unused = suggestions?.filter((s) => !items.includes(s)) ?? [];
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li key={`${it}-${i}`} className="flex items-start gap-2 rounded-xl bg-surface-2 py-1.5 pr-1 pl-3 text-sm">
              <span className="flex-1 py-1.5">{it}</span>
              <button
                type="button"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-3"
                aria-label={t('remove', { item: it })}
                onClick={() => onChange(items.filter((_, j) => j !== i))}
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <TextInput
          id={id}
          value={draft}
          placeholder={placeholder ?? t('addItem')}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            }
          }}
        />
        <button
          type="button"
          onClick={() => add(draft)}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-fg"
          aria-label={t('add')}
        >
          <Plus className="size-5" />
        </button>
      </div>
      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unused.slice(0, 12).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="min-h-9 rounded-full border border-dashed border-line px-3 text-xs text-muted hover:border-primary hover:text-fg"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  minLabel,
  maxLabel,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  minLabel?: string;
  maxLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium" id={`${label}-l`}>
          {label}
        </span>
        <span className="font-serif text-2xl font-semibold text-primary tabular-nums" aria-hidden>
          {value}
        </span>
      </div>
      <RSlider.Root
        className="relative flex h-11 touch-none items-center select-none"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0] ?? min)}
        aria-labelledby={`${label}-l`}
      >
        <RSlider.Track className="relative h-2 grow rounded-full bg-surface-3">
          <RSlider.Range className="absolute h-full rounded-full bg-primary" />
        </RSlider.Track>
        <RSlider.Thumb
          className="block size-7 rounded-full border-2 border-primary bg-surface shadow-md focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none"
          aria-label={label}
        />
      </RSlider.Root>
      {(minLabel || maxLabel) && (
        <div className="flex justify-between text-xs text-muted">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
}

export function Switch({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <label htmlFor={id} className="flex-1">
        <span className="block font-medium">{label}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </label>
      <RSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="relative h-7 w-12 shrink-0 rounded-full bg-surface-3 transition data-[state=checked]:bg-primary"
      >
        <RSwitch.Thumb className="block size-6 translate-x-0.5 rounded-full bg-white shadow transition data-[state=checked]:translate-x-[1.375rem]" />
      </RSwitch.Root>
    </div>
  );
}

export function DateField({
  label,
  value,
  onChange,
  type = 'date',
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  type?: 'date' | 'datetime-local' | 'time';
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <TextInput id={id} type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

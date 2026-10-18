// Componentes de interfaz compartidos. Los colores salen de los tokens de styles.css.
import { useState, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { Icon, type IconName } from './icons'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

// ---------- Formularios ----------
const field = 'w-full rounded-xl border border-line-strong bg-white px-3 py-2.5 text-base text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25'

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <label className={cx('flex flex-col gap-1.5 text-sm font-medium text-ink/80', className)}>{label}{children}</label>
}
export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(field, className)} />
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={2} {...p} className={cx(field, className)} />
export const Select = ({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(field, className)} />

// ---------- Botones ----------
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-strong',
  secondary: 'border border-line-strong bg-white text-brand-strong hover:bg-ground',
  ghost: 'text-brand-strong hover:bg-ground',
  danger: 'text-danger-ink hover:bg-danger-soft',
}
const buttonBase = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors disabled:opacity-50'

export function Button({ variant = 'primary', icon, className, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: IconName }) {
  return <button {...p} className={cx(buttonBase, VARIANTS[variant], className)}>{icon && <Icon name={icon} size={18} strokeWidth={2.1} />}{children}</button>
}
export function ButtonLink({ variant = 'primary', icon, className, children, ...p }: LinkProps & { variant?: Variant; icon?: IconName }) {
  return <Link {...p} className={cx(buttonBase, VARIANTS[variant], 'no-underline', className)}>{icon && <Icon name={icon} size={18} strokeWidth={2.1} />}{children}</Link>
}
export function ExternalButton({ variant = 'secondary', icon, className, children, ...p }: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; icon?: IconName }) {
  return <a target="_blank" rel="noreferrer" {...p} className={cx(buttonBase, VARIANTS[variant], 'no-underline', className)}>{icon && <Icon name={icon} size={18} strokeWidth={2.1} />}{children}</a>
}
export function IconButton({ icon, label, className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return <button aria-label={label} title={label} {...p} className={cx('inline-flex size-11 items-center justify-center rounded-xl text-muted hover:bg-ground hover:text-ink', className)}><Icon name={icon} /></button>
}

// ---------- Superficies ----------
export function Card({ children, className, as: Tag = 'div', ...rest }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'li' | 'article'; 'aria-labelledby'?: string; 'aria-label'?: string }) {
  return <Tag {...rest} className={cx('rounded-2xl border border-line bg-white p-4 sm:p-5', className)}>{children}</Tag>
}

/** Tarjeta con título y, opcionalmente, un enlace o acción a la derecha. */
export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  const id = `s-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <Card as="section" aria-labelledby={id} className={className}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="text-lg font-extrabold">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  )
}

export function PageHeader({ title, subtitle, actions, back }: { title: string; subtitle?: ReactNode; actions?: ReactNode; back?: { to: string; label: string } }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        {back && <Link to={back.to} className="inline-flex items-center gap-1 text-sm font-bold text-brand no-underline hover:text-brand-strong"><Icon name="chevronLeft" size={16} strokeWidth={2.2} />{back.label}</Link>}
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

/** Página estándar: ancho máximo, márgenes y separación entre bloques. */
export const Page = ({ children }: { children: ReactNode }) => <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-8 sm:py-7">{children}</div>

/** Formulario de alta que se abre con un botón, para no ocupar la pantalla cuando no se usa. */
export function CreatePanel({ label, title, defaultOpen = false, children }: { label: string; title?: string; defaultOpen?: boolean; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  if (!open) return <div><Button icon="plus" onClick={() => setOpen(true)}>{label}</Button></div>
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">{title ?? label}</h2>
        <IconButton icon="close" label="Cerrar" onClick={() => setOpen(false)} />
      </div>
      {children(() => setOpen(false))}
    </Card>
  )
}

// ---------- Datos ----------
export type Tone = 'brand' | 'warn' | 'neutral' | 'danger' | 'info'
const TONES: Record<Tone, string> = {
  brand: 'bg-brand-soft text-brand-ink',
  warn: 'bg-warn-soft text-warn-ink',
  neutral: 'bg-ground text-ink/75',
  danger: 'bg-danger-soft text-danger-ink',
  info: 'bg-[#e8eef6] text-[#2c4566]',
}
export const Badge = ({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) =>
  <span className={cx('inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-bold', TONES[tone])}>{children}</span>

const AVATAR_TONES: Tone[] = ['brand', 'warn', 'info', 'neutral']
export function Avatar({ name, size = 40, className }: { name: string; size?: number; className?: string }) {
  const initials = name.trim().slice(0, 2).toUpperCase() || '?'
  const tone = AVATAR_TONES[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_TONES.length]
  return <span aria-hidden="true" className={cx('flex shrink-0 items-center justify-center rounded-full font-extrabold', TONES[tone], className)} style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials}</span>
}

export function StatCard({ icon, label, value, detail, tone = 'brand' }: { icon: IconName; label: string; value: ReactNode; detail?: ReactNode; tone?: 'brand' | 'warn' }) {
  const warn = tone === 'warn'
  return (
    <div className={cx('flex flex-col gap-2 rounded-2xl border p-4', warn ? 'border-warn-line bg-[#fff8eb]' : 'border-line bg-white')}>
      <span className={cx('flex size-9 items-center justify-center rounded-xl', warn ? 'bg-warn-soft text-warn-ink' : 'bg-brand-soft text-brand')}><Icon name={icon} /></span>
      <span className={cx('text-sm font-semibold', warn ? 'text-warn-ink' : 'text-muted')}>{label}</span>
      <span className="text-2xl font-extrabold tracking-tight sm:text-3xl">{value}</span>
      {detail && <span className={cx('text-sm', warn ? 'text-warn-ink' : 'text-muted')}>{detail}</span>}
    </div>
  )
}

export const Empty = ({ children }: { children: ReactNode }) => <p className="py-8 text-center text-muted">{children}</p>

export function SearchInput({ label, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex min-h-12 items-center gap-2 rounded-xl border border-line-strong bg-white px-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/25">
      <Icon name="search" className="text-muted" />
      <input aria-label={label} placeholder={label} {...p} className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted/80" />
    </label>
  )
}

/** Filtros tipo píldora (uno activo a la vez). */
export function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}
          className={cx('min-h-9 rounded-full px-3.5 text-sm font-semibold', o.value === value ? 'bg-brand-strong text-white' : 'border border-line-strong bg-white text-ink/80 hover:bg-ground')}>{o.label}</button>
      ))}
    </div>
  )
}

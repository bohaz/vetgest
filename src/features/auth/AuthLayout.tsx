import type { ReactNode } from 'react'
import { Logo } from '@/shared/icons'

export const authInput = 'w-full rounded-xl border border-line-strong bg-white px-3 py-2.5 text-base text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25'
export const authLabel = 'flex flex-col gap-1.5 text-sm font-medium text-ink/80'
export const authPrimary = 'min-h-12 rounded-xl bg-brand px-4 font-bold text-white hover:bg-brand-strong disabled:opacity-50'
export const authLink = 'font-bold text-brand underline'

/** Marco común de las pantallas de acceso: logotipo y tarjeta centrada. */
export function AuthLayout({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ground px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-5">
        <div className="flex items-center gap-3"><Logo /><span className="text-2xl font-extrabold tracking-tight">VetGest</span></div>
        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-6 shadow-[0_8px_24px_rgba(11,74,69,0.06)]">
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          {children}
        </div>
        {footer && <div className="text-center text-sm text-muted">{footer}</div>}
      </div>
    </main>
  )
}

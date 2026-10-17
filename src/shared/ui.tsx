import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/30'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex flex-col gap-1 text-sm text-slate-700">{label}{children}</label>
}
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={field} />
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={2} {...p} className={field} />
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={field} />
export function Button({ variant = 'primary', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const styles = { primary: 'bg-teal-700 text-white hover:bg-teal-800', ghost: 'border border-slate-300 hover:bg-slate-50', danger: 'text-red-600 hover:bg-red-50' }
  return <button {...p} className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${styles[variant]}`} />
}
export const Empty = ({ children }: { children: ReactNode }) => <p className="py-6 text-center text-slate-500">{children}</p>

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCrud } from '@/shared/useCrud'
import { Button, Empty, Field, Input, Select, Textarea } from '@/shared/ui'
import { formatUsd } from '@/core/pricing'
import { SIZES, appointmentsOfDay, daySummary, findConflict, localDateStr, priceFor, reminderText, shiftDay, toStartsAt, whatsappLink } from '@/core/grooming'
import type { Client, GroomingAppointment, GroomingService, Patient, PetSize } from '@/core/entities'
import { AppointmentRow } from './AppointmentRow'

const blank = { patient_id: '', service_id: '', size: 'mediano' as PetSize, time: '09:00', notes: '' }

export function AgendaPage() {
  const appts = useCrud<GroomingAppointment>('grooming_appointments')
  const services = useCrud<GroomingService>('grooming_services')
  const patients = useCrud<Patient>('patients')
  const clients = useCrud<Client>('clients')
  const [date, setDate] = useState(localDateStr()); const [f, setF] = useState(blank)

  const svc = services.list.data ?? []; const pats = patients.list.data ?? []; const cls = clients.list.data ?? []
  const day = appointmentsOfDay(appts.list.data ?? [], date); const sum = daySummary(day)
  const service = svc.find(s => s.id === f.service_id)
  const conflict = service && f.time ? findConflict(day, svc, { starts_at: toStartsAt(date, f.time), duration_min: service.duration_min }) : undefined

  const pickPatient = (id: string) => setF({ ...f, patient_id: id, size: pats.find(p => p.id === id)?.size ?? f.size })
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    // El precio se calcula aquí para mostrarlo al instante (también sin conexión); la base de datos aplica la misma regla.
    appts.create({ patient_id: f.patient_id, service_id: f.service_id || undefined, starts_at: toStartsAt(date, f.time), status: 'pendiente', size: f.size,
      price_usd: service ? priceFor(service, f.size) : undefined, notes: f.notes.trim() || undefined })
    setF({ ...blank, time: f.time })
  }
  const changeStatus = (a: GroomingAppointment, status: 'en_proceso' | 'cancelada') => {
    if (status === 'cancelada' && !confirm('¿Cancelar esta cita?')) return
    appts.update(a.id, { status })
  }

  return (
    <section className="space-y-5 p-4">
      <h1 className="text-xl font-semibold">Agenda de peluquería</h1>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => setDate(shiftDay(date, -1))}>Día anterior</Button>
        <Input aria-label="Fecha" type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)} />
        <Button variant="ghost" onClick={() => setDate(shiftDay(date, 1))}>Día siguiente</Button>
        <Button variant="ghost" onClick={() => setDate(localDateStr())}>Hoy</Button>
      </div>
      <p className="text-sm text-slate-600">{sum.total} {sum.total === 1 ? 'cita' : 'citas'} · {sum.pending} por atender · Cobrado: {formatUsd(sum.incomeUsd)}</p>

      {pats.length === 0 || svc.length === 0 ? (
        <Empty>Para agendar necesitas al menos un paciente y un servicio. <Link className="text-teal-700 underline" to="/pacientes">Pacientes</Link> · <Link className="text-teal-700 underline" to="/peluqueria/servicios">Servicios</Link></Empty>
      ) : (
        <form className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2" onSubmit={submit}>
          <Field label="Paciente"><Select required value={f.patient_id} onChange={e => pickPatient(e.target.value)}>
            <option value="">Selecciona un paciente</option>{pats.map(p => <option key={p.id} value={p.id}>{p.name} ({cls.find(c => c.id === p.client_id)?.full_name ?? '—'})</option>)}</Select></Field>
          <Field label="Servicio"><Select required value={f.service_id} onChange={e => setF({ ...f, service_id: e.target.value })}>
            <option value="">Selecciona un servicio</option>{svc.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Tamaño"><Select value={f.size} onChange={e => setF({ ...f, size: e.target.value as PetSize })}>{SIZES.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}</Select></Field>
          <Field label="Hora"><Input required type="time" value={f.time} onChange={e => setF({ ...f, time: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Notas"><Textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></Field></div>
          {service && <p className="text-sm text-slate-600 sm:col-span-2">Precio: {formatUsd(priceFor(service, f.size))} · {service.duration_min} min</p>}
          {conflict && <p role="alert" className="text-sm text-amber-800 sm:col-span-2">Este horario se cruza con otra cita del día. Puedes agendar igualmente.</p>}
          <div className="sm:col-span-2"><Button disabled={!f.patient_id || !f.service_id || !f.time}>Agendar cita</Button></div>
        </form>)}

      {day.length === 0 && <Empty>No hay citas para este día.</Empty>}
      <ul className="divide-y">{day.map(a => {
        const p = pats.find(x => x.id === a.patient_id); const c = cls.find(x => x.id === p?.client_id); const s = svc.find(x => x.id === a.service_id)
        const href = a.status === 'pendiente' && p ? whatsappLink(c?.phone, reminderText(p.name, s?.name ?? 'peluquería', a.starts_at)) : null
        return <AppointmentRow key={a.id} appt={a} patient={p?.name ?? '—'} owner={c?.full_name ?? '—'} service={s?.name ?? 'Sin servicio'} reminderHref={href}
          onStatus={st => changeStatus(a, st)} onComplete={pay => appts.update(a.id, { status: 'completada', ...pay, completed_at: new Date().toISOString() })} />
      })}</ul>
    </section>
  )
}

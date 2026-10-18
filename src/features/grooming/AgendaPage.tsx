import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCrud } from '@/shared/useCrud'
import { Button, Card, Empty, Field, IconButton, Input, Section, Select, Textarea } from '@/shared/ui'
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
  // Desde la ficha del paciente se llega con ?paciente=<id> para agendarle directo.
  const [params] = useSearchParams()
  const [date, setDate] = useState(localDateStr()); const [f, setF] = useState(() => ({ ...blank, patient_id: params.get('paciente') ?? '' }))

  const svc = services.list.data ?? []; const pats = patients.list.data ?? []; const cls = clients.list.data ?? []
  const day = appointmentsOfDay(appts.list.data ?? [], date); const sum = daySummary(day)
  const service = svc.find(s => s.id === f.service_id)
  const conflict = service && f.time ? findConflict(day, svc, { starts_at: toStartsAt(date, f.time), duration_min: service.duration_min }) : undefined

  const pickPatient = (id: string) => setF({ ...f, patient_id: id, size: pats.find(p => p.id === id)?.size ?? f.size })
  // Al llegar con un paciente preseleccionado, toma su tamaño en cuanto carga la lista.
  const preselected = pats.find(p => p.id === f.patient_id)
  const size = f.size === blank.size && preselected?.size ? preselected.size : f.size
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    // El precio se calcula aquí para mostrarlo al instante (también sin conexión); la base de datos aplica la misma regla.
    appts.create({ patient_id: f.patient_id, service_id: f.service_id || undefined, starts_at: toStartsAt(date, f.time), status: 'pendiente', size,
      price_usd: service ? priceFor(service, size) : undefined, notes: f.notes.trim() || undefined })
    setF({ ...blank, time: f.time })
  }
  const changeStatus = (a: GroomingAppointment, status: 'en_proceso' | 'cancelada') => {
    if (status === 'cancelada' && !confirm('¿Cancelar esta cita?')) return
    appts.update(a.id, { status })
  }

  const dayLabel = date === localDateStr() ? 'Hoy' : new Date(`${date}T12:00:00`).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <IconButton icon="chevronLeft" label="Día anterior" onClick={() => setDate(shiftDay(date, -1))} />
          <Input aria-label="Fecha" type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)} className="w-auto" />
          <IconButton icon="chevronRight" label="Día siguiente" onClick={() => setDate(shiftDay(date, 1))} />
          {date !== localDateStr() && <Button variant="ghost" onClick={() => setDate(localDateStr())}>Hoy</Button>}
        </div>
        <p className="text-sm text-muted"><b className="text-ink first-letter:uppercase">{dayLabel}</b> · {sum.total} {sum.total === 1 ? 'cita' : 'citas'} · {sum.pending} por atender · Cobrado {formatUsd(sum.incomeUsd)}</p>
      </Card>

      {pats.length === 0 || svc.length === 0 ? (
        <Card><Empty>Para agendar necesitas al menos un paciente y un servicio. <Link to="/pacientes">Pacientes</Link> · <Link to="/peluqueria/servicios">Servicios</Link></Empty></Card>
      ) : (
        <Section title="Agendar cita">
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
            <Field label="Paciente"><Select required value={f.patient_id} onChange={e => pickPatient(e.target.value)}>
              <option value="">Selecciona un paciente</option>{pats.map(p => <option key={p.id} value={p.id}>{p.name} ({cls.find(c => c.id === p.client_id)?.full_name ?? '—'})</option>)}</Select></Field>
            <Field label="Servicio"><Select required value={f.service_id} onChange={e => setF({ ...f, service_id: e.target.value })}>
              <option value="">Selecciona un servicio</option>{svc.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
            <Field label="Tamaño"><Select value={size} onChange={e => setF({ ...f, size: e.target.value as PetSize })}>{SIZES.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}</Select></Field>
            <Field label="Hora"><Input required type="time" value={f.time} onChange={e => setF({ ...f, time: e.target.value })} /></Field>
            <Field label="Notas" className="sm:col-span-2"><Textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></Field>
            {service && <p className="text-sm text-muted sm:col-span-2">Precio: <b className="text-ink">{formatUsd(priceFor(service, size))}</b> · {service.duration_min} min</p>}
            {conflict && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn-ink sm:col-span-2">Este horario se cruza con otra cita del día. Puedes agendar igualmente.</p>}
            <div className="sm:col-span-2"><Button icon="plus" disabled={!f.patient_id || !f.service_id || !f.time}>Agendar cita</Button></div>
          </form>
        </Section>)}

      <Section title="Citas del día">
        {day.length === 0 && <Empty>No hay citas para este día.</Empty>}
        <ul className="divide-y divide-line">{day.map(a => {
          const p = pats.find(x => x.id === a.patient_id); const c = cls.find(x => x.id === p?.client_id); const s = svc.find(x => x.id === a.service_id)
          const href = a.status === 'pendiente' && p ? whatsappLink(c?.phone, reminderText(p.name, s?.name ?? 'peluquería', a.starts_at)) : null
          return <AppointmentRow key={a.id} appt={a} patient={p?.name ?? '—'} owner={c?.full_name ?? '—'} service={s?.name ?? 'Sin servicio'} reminderHref={href}
            onStatus={st => changeStatus(a, st)} onComplete={pay => appts.update(a.id, { status: 'completada', ...pay, completed_at: new Date().toISOString() })} />
        })}</ul>
      </Section>
    </div>
  )
}

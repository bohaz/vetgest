import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCrud } from '@/shared/useCrud'
import { Button, Card, Empty, Field, IconButton, Input, Section, Segmented, Select, Textarea } from '@/shared/ui'
import { formatUsd } from '@/core/pricing'
import { CONSULT_MINUTES, appointmentsOfDay, daySummary, findConflict } from '@/core/agenda'
import { dayLabel, dayOf, localDateStr, shiftDay, toStartsAt } from '@/core/dates'
import { SIZES, priceFor } from '@/core/grooming'
import type { Appointment, AppointmentKind, Client, GroomingService, Patient, PetSize } from '@/core/entities'
import { AppointmentRow, type RowStatus } from './AppointmentRow'
import { useReminderLink } from './useReminderLink'

type Filter = 'todas' | AppointmentKind
const FILTERS: { value: Filter; label: string }[] = [{ value: 'todas', label: 'Todas' }, { value: 'consulta', label: 'Consultas' }, { value: 'peluqueria', label: 'Peluquería' }]
const KINDS: { value: AppointmentKind; label: string }[] = [{ value: 'consulta', label: 'Consulta' }, { value: 'peluqueria', label: 'Peluquería' }]
const CONFIRM: Partial<Record<RowStatus, string>> = { cancelada: '¿Cancelar esta cita?', no_asistio: '¿Marcar que el paciente no vino?' }

interface Form { kind: AppointmentKind; patient_id: string; service_id: string; size: PetSize | ''; date: string; time: string; notes: string; follow_up_of: string | null }

/**
 * Agenda única de la clínica. Se puede abrir con datos ya elegidos desde otras pantallas:
 * ?paciente=<id>&tipo=consulta|peluqueria&motivo=<texto>&origen=<consulta>.
 */
export function AgendaPage() {
  const appts = useCrud<Appointment>('appointments')
  const services = useCrud<GroomingService>('grooming_services')
  const patients = useCrud<Patient>('patients')
  const clients = useCrud<Client>('clients')
  const reminderLink = useReminderLink()
  const [params] = useSearchParams()
  const formRef = useRef<HTMLFormElement>(null)
  const kindParam = params.get('tipo') === 'peluqueria' ? 'peluqueria' : 'consulta'

  const [date, setDate] = useState(localDateStr()); const [filter, setFilter] = useState<Filter>('todas')
  const blank = (d = date): Form => ({ kind: kindParam, patient_id: '', service_id: '', size: '', date: d, time: '09:00', notes: '', follow_up_of: null })
  const [f, setF] = useState<Form>(() => ({ ...blank(), patient_id: params.get('paciente') ?? '', notes: params.get('motivo') ?? '', follow_up_of: params.get('origen') }))

  // Hasta que carguen pacientes y clientes no se muestran avisos de «sin pacientes» ni filas sin nombre.
  const loading = patients.list.isPending || clients.list.isPending || appts.list.isPending
  const svc = services.list.data ?? []; const pats = patients.list.data ?? []; const cls = clients.list.data ?? []; const all = appts.list.data ?? []
  const day = appointmentsOfDay(all, date, filter === 'todas' ? undefined : filter); const sum = daySummary(appointmentsOfDay(all, date))
  const isGrooming = f.kind === 'peluqueria'
  const service = isGrooming ? svc.find(s => s.id === f.service_id) : undefined
  // Al llegar con un paciente preseleccionado, la peluquería toma su tamaño en cuanto carga la lista.
  const size: PetSize = (f.size || pats.find(p => p.id === f.patient_id)?.size) ?? 'mediano'
  const duration = isGrooming ? service?.duration_min : CONSULT_MINUTES
  const conflict = duration && f.time && f.date
    ? findConflict(appointmentsOfDay(all, f.date), svc, { kind: f.kind, starts_at: toStartsAt(f.date, f.time), duration_min: duration }) : undefined
  const ready = !!f.patient_id && !!f.date && !!f.time && (!isGrooming || !!f.service_id)

  const goTo = (d: string) => { setDate(d); setF(x => ({ ...x, date: d })) }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const base = { kind: f.kind, patient_id: f.patient_id, starts_at: toStartsAt(f.date, f.time), status: 'pendiente' as const, notes: f.notes.trim() || undefined }
    // El precio se calcula aquí para mostrarlo al instante (también sin conexión); la base de datos aplica la misma regla.
    appts.create(isGrooming
      ? { ...base, service_id: f.service_id, size, price_usd: service ? priceFor(service, size) : undefined }
      : { ...base, follow_up_of: f.follow_up_of })
    setDate(f.date); setF({ ...blank(f.date), kind: f.kind, time: f.time })
  }
  const changeStatus = (a: Appointment, status: RowStatus) => {
    const question = CONFIRM[status]
    if (question && !confirm(question)) return
    appts.update(a.id, { status })
  }
  const reschedule = (a: Appointment) => {
    setF({ ...blank(), kind: a.kind, patient_id: a.patient_id, service_id: a.service_id ?? '', size: a.size ?? '', notes: a.notes ?? '', follow_up_of: a.follow_up_of ?? null })
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <IconButton icon="chevronLeft" label="Día anterior" onClick={() => goTo(shiftDay(date, -1))} />
          <Input aria-label="Fecha" type="date" value={date} onChange={e => e.target.value && goTo(e.target.value)} className="w-auto" />
          <IconButton icon="chevronRight" label="Día siguiente" onClick={() => goTo(shiftDay(date, 1))} />
          {date !== localDateStr() && <Button variant="ghost" onClick={() => goTo(localDateStr())}>Hoy</Button>}
        </div>
        <p className="text-sm text-muted"><b className="text-ink first-letter:uppercase">{dayLabel(date)}</b> · {sum.total} {sum.total === 1 ? 'cita' : 'citas'} · {sum.pending} por atender · Peluquería cobrada {formatUsd(sum.incomeUsd)}</p>
      </Card>

      {loading ? null : pats.length === 0 ? (
        <Card><Empty>Para agendar necesitas al menos un paciente. <Link to="/pacientes?nuevo=1">Agregar paciente</Link></Empty></Card>
      ) : (
        <Section title="Agendar cita">
          <form ref={formRef} className="grid scroll-mt-4 gap-3 sm:grid-cols-2" onSubmit={submit}>
            <div className="sm:col-span-2"><Segmented label="Tipo de cita" options={KINDS} value={f.kind} onChange={kind => setF({ ...f, kind, follow_up_of: kind === 'consulta' ? f.follow_up_of : null })} /></div>
            <Field label="Paciente"><Select required value={f.patient_id} onChange={e => setF({ ...f, patient_id: e.target.value, size: '' })}>
              <option value="">Selecciona un paciente</option>{pats.map(p => <option key={p.id} value={p.id}>{p.name} ({cls.find(c => c.id === p.client_id)?.full_name ?? '—'})</option>)}</Select></Field>
            {isGrooming && (svc.length === 0
              ? <p className="self-end text-sm text-muted">Crea un servicio en <Link to="/agenda/servicios">Servicios de peluquería</Link> para agendar.</p>
              : <Field label="Servicio"><Select required value={f.service_id} onChange={e => setF({ ...f, service_id: e.target.value })}>
                <option value="">Selecciona un servicio</option>{svc.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>)}
            <Field label="Día"><Input required type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
            <Field label="Hora"><Input required type="time" value={f.time} onChange={e => setF({ ...f, time: e.target.value })} /></Field>
            {isGrooming && <Field label="Tamaño"><Select value={size} onChange={e => setF({ ...f, size: e.target.value as PetSize })}>{SIZES.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}</Select></Field>}
            {isGrooming
              ? <Field label="Notas" className="sm:col-span-2"><Textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></Field>
              : <Field label="Motivo" className="sm:col-span-2"><Input placeholder="Por ejemplo: control de otitis" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></Field>}
            {service && <p className="text-sm text-muted sm:col-span-2">Precio: <b className="text-ink">{formatUsd(priceFor(service, size))}</b> · {service.duration_min} min</p>}
            {conflict && <p role="alert" className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn-ink sm:col-span-2">Este horario se cruza con otra {isGrooming ? 'cita de peluquería' : 'consulta'}. Puedes agendar igualmente.</p>}
            <div className="sm:col-span-2"><Button icon="plus" disabled={!ready}>Agendar {isGrooming ? 'peluquería' : 'consulta'}</Button></div>
          </form>
        </Section>)}

      <Section title="Citas del día" action={<Segmented label="Filtrar citas" options={FILTERS} value={filter} onChange={setFilter} />}>
        {loading ? <Empty>Cargando…</Empty> : day.length === 0 && <Empty>{filter === 'todas' ? 'No hay citas para este día.' : 'No hay citas de este tipo para este día.'}</Empty>}
        <ul className="divide-y divide-line">{!loading && day.map(a => {
          const p = pats.find(x => x.id === a.patient_id); const c = cls.find(x => x.id === p?.client_id); const s = svc.find(x => x.id === a.service_id)
          return <AppointmentRow key={a.id} appt={a} patient={p?.name ?? '—'} owner={c?.full_name ?? '—'} service={s?.name}
            reminderHref={reminderLink(a, p, c, s?.name)} onReminded={() => appts.update(a.id, { reminded_at: new Date().toISOString() })}
            attendTo={`/pacientes/${a.patient_id}?atender=${a.id}`} onStatus={st => changeStatus(a, st)}
            onComplete={pay => appts.update(a.id, { status: 'completada', ...pay, completed_at: new Date().toISOString() })}
            onReschedule={a.status === 'no_asistio' && dayOf(a.starts_at) <= localDateStr() ? () => reschedule(a) : undefined} />
        })}</ul>
      </Section>
    </div>
  )
}

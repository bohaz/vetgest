import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useCrud } from '@/shared/useCrud'
import { Avatar, Badge, Button, ButtonLink, Card, Empty, ExternalButton, IconButton, Page, PageHeader, Section } from '@/shared/ui'
import { Icon, type IconName } from '@/shared/icons'
import { KIND_LABEL, dueControl } from '@/core/agenda'
import { dayOf, formatTime, localDateStr } from '@/core/dates'
import { sizeLabel } from '@/core/grooming'
import { whatsappLink } from '@/core/whatsapp'
import { clientPurchases, nextAppointment, patientTimeline } from '@/core/dashboard'
import { formatUsd } from '@/core/pricing'
import type { Client, Consultation, Appointment, GroomingService, Patient, Sale } from '@/core/entities'
import { ConsultationForm } from '@/features/consultations/ConsultationForm'
import { useRecordConsultation } from '@/features/consultations/useRecordConsultation'
import { PatientForm } from './PatientForm'
import { PatientTimeline } from './PatientTimeline'

function Summary({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Icon name={icon} /></span>
      <span className="flex min-w-0 flex-col"><span className="text-xs font-bold uppercase tracking-wider text-muted">{label}</span><span className="font-bold">{value}</span></span>
    </div>
  )
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })

export function PatientDetailPage() {
  const { id = '' } = useParams(); const nav = useNavigate()
  // Desde la agenda se llega con ?atender=<cita> para registrar la consulta de ese control.
  const [params, setParams] = useSearchParams()
  // Todo sale de listas en caché: la ficha abre también sin conexión, incluso con pacientes recién creados.
  const patients = useCrud<Patient>('patients')
  const clientsList = useCrud<Client>('clients').list
  const consultations = useCrud<Consultation>('consultations')
  const apptsList = useCrud<Appointment>('appointments').list
  const servicesList = useCrud<GroomingService>('grooming_services').list
  const salesList = useCrud<Sale>('sales').list
  const record = useRecordConsultation()
  // Mientras carga el historial no se muestran «sin consultas» ni «sin citas» que aún no son ciertos.
  const loading = [clientsList, consultations.list, apptsList, servicesList, salesList].some(l => l.isPending)
  const clients = clientsList.data ?? []; const appts = apptsList.data ?? []; const services = servicesList.data ?? []; const sales = salesList.data ?? []
  const [editing, setEditing] = useState(false)
  // Formulario abierto: consulta nueva o el id del control que se atiende.
  const [consulting, setConsulting] = useState<false | 'nueva' | string>(params.get('atender') ?? false)

  const p = patients.list.data?.find(x => x.id === id)
  if (patients.list.isLoading) return <Page><p>Cargando…</p></Page>
  if (!p) return <Page><PageHeader title="Paciente" back={{ to: '/pacientes', label: 'Pacientes' }} /><Empty>No encontramos este paciente.</Empty></Page>

  const owner = clients.find(c => c.id === p.client_id)
  const age = p.birth_date ? Math.max(0, Math.floor((Date.now() - new Date(p.birth_date).getTime()) / 31557600000)) : null
  const size = sizeLabel(p.size)
  const timeline = patientTimeline(p.id, consultations.list.data ?? [], appts, services)
  const next = nextAppointment(p.id, appts)
  const lastConsult = timeline.find(i => i.kind === 'consulta')
  const purchases = owner ? clientPurchases(owner.id, sales) : null
  const wa = owner ? whatsappLink(owner.phone, `Hola ${owner.full_name.split(' ')[0]}, te escribimos por ${p.name}. `) : null
  const nextText = next ? `${dayOf(next.starts_at) === localDateStr() ? 'Hoy' : shortDate(next.starts_at)} ${formatTime(next.starts_at)} · ${KIND_LABEL[next.kind]}` : 'Sin citas próximas'
  const due = dueControl(p.id, appts)
  const attending = consulting && consulting !== 'nueva' ? appts.find(a => a.id === consulting && a.patient_id === p.id && a.status === 'pendiente') : undefined
  const closeForm = () => { setConsulting(false); if (params.has('atender')) setParams({}, { replace: true }) }

  return (
    <Page>
      <PageHeader title="Ficha del paciente" back={{ to: '/pacientes', label: 'Pacientes' }} />
      <Card className="flex flex-col gap-3">
        <div className="flex items-start gap-3 sm:gap-4">
          <Avatar name={p.name} size={64} className="rounded-2xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="text-2xl font-extrabold tracking-tight">{p.name}</h2>
            <p className="text-ink/80">{[`${p.species}${p.breed ? `, ${p.breed}` : ''}`, age !== null ? `${age} ${age === 1 ? 'año' : 'años'}` : null, p.weight_kg ? `${p.weight_kg} kg` : null, size ? `Tamaño ${size.toLowerCase()}` : null].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="-mr-2 -mt-1 flex shrink-0">
            <IconButton icon={editing ? 'close' : 'edit'} label={editing ? 'Cerrar edición' : 'Editar datos'} onClick={() => setEditing(!editing)} />
            <IconButton icon="trash" label="Eliminar paciente" className="hover:text-danger-ink"
              onClick={() => { if (confirm(`¿Eliminar a ${p.name} y todo su historial?`)) { patients.remove(p.id, p.name); nav('/pacientes') } }} />
          </div>
        </div>
        {owner && (
          <div className="flex flex-wrap items-center gap-2 sm:pl-20">
            <span className="rounded-xl bg-ground px-3 py-1.5 text-sm">Dueño: <b>{owner.full_name}</b>{owner.phone ? ` · ${owner.phone}` : ''}</span>
            {wa && <ExternalButton href={wa} icon="chat" className="min-h-9 px-3">WhatsApp</ExternalButton>}
          </div>)}
      </Card>
      {editing && (
        <Card><PatientForm clients={clients} initial={p} submitLabel="Guardar cambios" onSubmit={d => { patients.update(p.id, d); setEditing(false) }} onCancel={() => setEditing(false)} /></Card>)}

      <section aria-label="Resumen" className="grid gap-3 sm:grid-cols-3">
        <Summary icon="calendar" label="Próxima cita" value={loading ? '—' : nextText} />
        <Summary icon="stethoscope" label="Última consulta" value={loading ? '—' : lastConsult ? `${shortDate(lastConsult.date)} · ${lastConsult.title}` : 'Sin consultas'} />
        <Summary icon="money" label="Compras del dueño" value={!loading && purchases ? `${formatUsd(purchases.usd)} · ${purchases.count} ${purchases.count === 1 ? 'venta' : 'ventas'}` : '—'} />
      </section>

      <div className="flex flex-wrap gap-2">
        {due && <Button icon="stethoscope" onClick={() => setConsulting(due.id)}>Atender control de las {formatTime(due.starts_at)}</Button>}
        <Button icon="plus" variant={due ? 'secondary' : 'primary'} onClick={() => setConsulting('nueva')}>Nueva consulta</Button>
        <ButtonLink variant="secondary" icon="calendar" to={`/agenda?paciente=${p.id}&tipo=consulta`}>Agendar control</ButtonLink>
        <ButtonLink variant="secondary" icon="scissors" to={`/agenda?paciente=${p.id}&tipo=peluqueria`}>Agendar peluquería</ButtonLink>
        {owner && <ButtonLink variant="secondary" icon="cart" to={`/ventas?cliente=${owner.id}`}>Vender a {owner.full_name.split(' ')[0]}</ButtonLink>}
      </div>
      {consulting && !loading && (
        <Section title={attending ? 'Atender control' : 'Nueva consulta'}>
          <ConsultationForm key={attending?.id ?? 'nueva'} patientId={p.id} attending={attending}
            onSubmit={(c, followUp) => { record(c, followUp); closeForm() }} onCancel={closeForm} />
        </Section>)}

      <Section title="Historial" action={!loading && timeline.length > 0 ? <Badge>{timeline.length} {timeline.length === 1 ? 'registro' : 'registros'}</Badge> : undefined}>
        {loading ? <Empty>Cargando…</Empty> : <PatientTimeline items={timeline} onRemoveConsultation={(cid, label) => consultations.remove(cid, label)} />}
      </Section>
    </Page>
  )
}

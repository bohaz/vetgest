import { Link } from 'react-router-dom'
import { useCrud } from '@/shared/useCrud'
import { Avatar, Badge, ButtonLink, Empty, Page, Section, StatCard } from '@/shared/ui'
import { Icon, type IconName } from '@/shared/icons'
import { appointmentsOfDay, daySummary, formatTime, localDateStr, SIZES, STATUS_LABEL } from '@/core/grooming'
import { collectedOn, greeting, latestConsultations, longDate, lowStockProducts } from '@/core/dashboard'
import { formatBs, formatUsd, toBs } from '@/core/pricing'
import type { Client, Consultation, GroomingAppointment, GroomingService, Patient, Product, Sale } from '@/core/entities'
import { useTenant } from '@/features/tenant/useTenant'
import { RateChip } from '@/features/sales/RateChip'
import { useRate } from '@/features/sales/useRate'
import { STATUS_TONE } from '@/features/grooming/status'

const QUICK: { to: string; label: string; icon: IconName }[] = [
  { to: '/ventas', label: 'Nueva venta', icon: 'cart' },
  { to: '/peluqueria', label: 'Agendar cita', icon: 'calendar' },
  { to: '/pacientes?nuevo=1', label: 'Nuevo paciente', icon: 'paw' },
  { to: '/clientes?nuevo=1', label: 'Nuevo cliente', icon: 'userPlus' },
]

export function HomePage() {
  const { tenant } = useTenant()
  const { rate } = useRate()
  const lists = {
    appts: useCrud<GroomingAppointment>('grooming_appointments').list, services: useCrud<GroomingService>('grooming_services').list,
    patients: useCrud<Patient>('patients').list, clients: useCrud<Client>('clients').list, sales: useCrud<Sale>('sales').list,
    products: useCrud<Product>('products').list, consultations: useCrud<Consultation>('consultations').list,
  }
  // Mientras cargan los datos se muestra «—» en vez de ceros que parecen reales.
  const loading = Object.values(lists).some(l => l.isPending)
  const appts = lists.appts.data ?? []; const services = lists.services.data ?? []; const patients = lists.patients.data ?? []
  const clients = lists.clients.data ?? []; const sales = lists.sales.data ?? []; const products = lists.products.data ?? []
  const consultations = lists.consultations.data ?? []

  const now = new Date(); const today = localDateStr(now)
  const todays = appointmentsOfDay(appts, today); const day = daySummary(todays)
  const collected = collectedOn(today, sales, appts); const collectedBs = toBs(collected.usd, rate)
  const low = lowStockProducts(products)
  const patient = (id: string) => patients.find(p => p.id === id)
  const owner = (p?: Patient) => clients.find(c => c.id === p?.client_id)?.full_name

  return (
    <Page>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted">{longDate(now)}</span>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{greeting(now)}{tenant ? `, ${tenant.name}` : ''}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RateChip />
          <ButtonLink to="/pacientes" icon="plus">Nueva consulta</ButtonLink>
        </div>
      </header>

      <section aria-label="Resumen del día" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon="calendar" label="Citas de hoy" value={loading ? '—' : day.total} detail={loading ? ' ' : `${day.pending} por atender`} />
        <StatCard icon="money" label="Cobrado hoy" value={loading ? '—' : formatUsd(collected.usd)} detail={loading ? ' ' : collectedBs !== null ? formatBs(collectedBs) : 'Define la tasa para ver Bs'} />
        <StatCard icon="paw" label="Pacientes" value={loading ? '—' : patients.length} detail={loading ? ' ' : `de ${clients.length} ${clients.length === 1 ? 'cliente' : 'clientes'}`} />
        <StatCard icon="alert" label="Stock bajo" value={loading ? '—' : low.length} tone={!loading && low.length ? 'warn' : 'brand'}
          detail={<Link to="/inventario" className="font-bold">Ver inventario</Link>} />
      </section>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Section title="Peluquería de hoy" action={<Link to="/peluqueria" className="text-sm font-bold">Ver agenda</Link>}>
          {loading ? <Empty>Cargando…</Empty> : todays.length === 0 ? <Empty>No hay citas para hoy.</Empty> : (
            <ul className="divide-y divide-line">{todays.map(a => {
              const p = patient(a.patient_id)
              return (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <span className="w-[4.5rem] shrink-0 whitespace-nowrap text-sm font-bold">{formatTime(a.starts_at)}</span>
                  <Avatar name={p?.name ?? '?'} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-bold">{p?.name ?? '—'} <span className="font-medium text-muted">· {owner(p) ?? '—'}</span></span>
                    <span className="truncate text-sm text-muted">{services.find(s => s.id === a.service_id)?.name ?? 'Peluquería'} · {SIZES.find(z => z.value === a.size)?.label}</span>
                  </div>
                  <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                </li>
              )
            })}</ul>
          )}
        </Section>

        <div className="flex flex-col gap-4">
          <Section title="Acciones rápidas">
            <div className="grid grid-cols-2 gap-2">
              {QUICK.map(q => (
                <Link key={q.to} to={q.to} className="flex min-h-20 flex-col justify-between gap-2 rounded-xl bg-ground p-3 text-sm font-bold text-ink no-underline hover:bg-brand-soft">
                  <Icon name={q.icon} className="text-brand" />{q.label}
                </Link>))}
            </div>
          </Section>
          {low.length > 0 && (
            <Section title="Por reponer">
              <ul className="flex flex-col gap-3">{low.slice(0, 4).map(p => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0"><span className="block truncate font-bold">{p.name}</span><span className="text-sm text-muted">mínimo {p.min_stock}</span></span>
                  <Badge tone="warn">{p.stock === 0 ? 'Agotado' : `Quedan ${p.stock}`}</Badge>
                </li>))}</ul>
            </Section>)}
          <Section title="Últimas consultas">
            {loading ? <Empty>Cargando…</Empty> : consultations.length === 0 ? <Empty>Aún no hay consultas.</Empty> : (
              <ul className="flex flex-col gap-3">{latestConsultations(consultations).map(c => (
                <li key={c.id}>
                  <Link to={`/pacientes/${c.patient_id}`} className="flex flex-col no-underline">
                    <span className="font-bold text-ink">{patient(c.patient_id)?.name ?? '—'} · {c.reason || 'Consulta'}</span>
                    <span className="text-sm text-muted">{new Date(c.visit_date).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}{c.price_usd ? ` · ${formatUsd(Number(c.price_usd))}` : ''}</span>
                  </Link>
                </li>))}</ul>
            )}
          </Section>
        </div>
      </div>
    </Page>
  )
}

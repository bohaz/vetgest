import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { LoginPage } from '@/features/auth/LoginPage'
import { OnboardingPage } from '@/features/auth/OnboardingPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { recoveryLinkFailed } from '@/features/auth/recovery'
import { AppShell } from '@/features/layout/AppShell'
import { ClientsPage } from '@/features/clients/ClientsPage'
import { PatientsPage } from '@/features/patients/PatientsPage'
import { ProductsPage } from '@/features/products/ProductsPage'
import { SalesPage } from '@/features/sales/SalesPage'
import { AgendaLayout } from '@/features/agenda/AgendaLayout'
import { AgendaPage } from '@/features/agenda/AgendaPage'
import { ServicesPage } from '@/features/grooming/ServicesPage'
import { PatientDetailPage } from '@/features/patients/PatientDetailPage'
import { HomePage } from '@/features/home/HomePage'
import { MorePage } from '@/features/layout/MorePage'

export default function App() {
  const { session, tenantId, loading, recovering } = useAuth()
  if (loading) return <p className="p-6">Cargando…</p>
  if (recovering && session) return <ResetPasswordPage />
  if (!session) {
    // Llegó desde el enlace de recuperación pero no hay sesión: el enlace venció o ya se usó.
    if (recovering || recoveryLinkFailed()) return <LoginPage initialMode="recover" notice="El enlace venció o ya se usó. Pide uno nuevo." />
    return <LoginPage />
  }
  if (!tenantId) return <OnboardingPage />
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="/mas" element={<MorePage />} />
          <Route path="/clientes" element={<ClientsPage />} />
          <Route path="/pacientes" element={<PatientsPage />} />
          <Route path="/pacientes/:id" element={<PatientDetailPage />} />
          <Route path="/inventario" element={<ProductsPage />} />
          <Route path="/ventas" element={<SalesPage />} />
          <Route path="/agenda" element={<AgendaLayout />}>
            <Route index element={<AgendaPage />} />
            <Route path="servicios" element={<ServicesPage />} />
          </Route>
          {/* Dirección anterior, por si alguien la guardó. */}
          <Route path="/peluqueria/*" element={<Navigate to="/agenda" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { LoginPage } from '@/features/auth/LoginPage'
import { OnboardingPage } from '@/features/auth/OnboardingPage'
import { AppShell } from '@/features/layout/AppShell'
import { ClientsPage } from '@/features/clients/ClientsPage'
import { PatientsPage } from '@/features/patients/PatientsPage'
import { ProductsPage } from '@/features/products/ProductsPage'
import { SalesPage } from '@/features/sales/SalesPage'
import { GroomingLayout } from '@/features/grooming/GroomingLayout'
import { AgendaPage } from '@/features/grooming/AgendaPage'
import { ServicesPage } from '@/features/grooming/ServicesPage'
import { PatientDetailPage } from '@/features/patients/PatientDetailPage'

export default function App() {
  const { session, tenantId, loading } = useAuth()
  if (loading) return <p className="p-6">Cargando…</p>
  if (!session) return <LoginPage />
  if (!tenantId) return <OnboardingPage />
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/clientes" element={<ClientsPage />} />
          <Route path="/pacientes" element={<PatientsPage />} />
          <Route path="/pacientes/:id" element={<PatientDetailPage />} />
          <Route path="/inventario" element={<ProductsPage />} />
          <Route path="/ventas" element={<SalesPage />} />
          <Route path="/peluqueria" element={<GroomingLayout />}>
            <Route index element={<AgendaPage />} />
            <Route path="servicios" element={<ServicesPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/clientes" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

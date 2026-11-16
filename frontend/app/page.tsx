"use client"

import { useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { AuthScreen } from "@/components/auth-screen"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/lib/auth-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"

const viewFallback = () => (
  <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
    Cargando…
  </div>
)

const DashboardView = dynamic(
  () => import("@/components/views/dashboard-view").then((m) => m.DashboardView),
  { ssr: false, loading: viewFallback },
)
const CalendarView = dynamic(
  () => import("@/components/views/calendar-view").then((m) => m.CalendarView),
  { ssr: false, loading: viewFallback },
)
const GuestsView = dynamic(
  () => import("@/components/views/guests-view").then((m) => m.GuestsView),
  { ssr: false, loading: viewFallback },
)
const PosView = dynamic(
  () => import("@/components/views/pos-view").then((m) => m.PosView),
  { ssr: false, loading: viewFallback },
)
const BillingView = dynamic(
  () => import("@/components/views/billing-view").then((m) => m.BillingView),
  { ssr: false, loading: viewFallback },
)
const RoomsView = dynamic(
  () => import("@/components/views/rooms-view").then((m) => m.RoomsView),
  { ssr: false, loading: viewFallback },
)
const SettingsView = dynamic(
  () => import("@/components/views/settings-view").then((m) => m.SettingsView),
  { ssr: false, loading: viewFallback },
)
const ReportsView = dynamic(
  () => import("@/components/views/reports-view").then((m) => m.ReportsView),
  { ssr: false, loading: viewFallback },
)
const AdminRequestsView = dynamic(
  () => import("@/components/views/admin-requests-view").then((m) => m.AdminRequestsView),
  { ssr: false, loading: viewFallback },
)
const TenantsView = dynamic(
  () => import("@/components/views/tenants-view").then((m) => m.TenantsView),
  { ssr: false, loading: viewFallback },
)
const RecepcionCreateView = dynamic(
  () => import("@/components/views/recepcion-create-view").then((m) => m.RecepcionCreateView),
  { ssr: false, loading: viewFallback },
)
const SystemReportsView = dynamic(
  () => import("@/components/views/system-reports-view").then((m) => m.SystemReportsView),
  { ssr: false, loading: viewFallback },
)

const viewTitles: Record<string, string> = {
  dashboard: "Panel de Control",
  calendar: "Calendario de Reservas",
  guests: "Huespedes y Reservas",
  pos: "TPV Catering",
  billing: "Facturacion",
  rooms: "Gestion de Habitaciones",
  settings: "Configuracion",
  reports: "Informes y KPIs",
  adminRequests: "Solicitudes de cuenta",
  tenants: "Gestión de Hoteles",
  recepcionCreate: "Crear Recepcionista",
  systemReports: "Informes del Sistema",
}

export default function Page() {
  const [activeView, setActiveView] = useState("dashboard")
  const { user, isLoading, isPending, logout } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <AuthScreen />
  }

  if (isPending) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <Alert className="w-full max-w-md">
          <AlertTitle>Cuenta pendiente de aprobación</AlertTitle>
          <AlertDescription>
            Su cuenta ({user.email}) ha sido creada pero aún no ha sido activada por el
            administrador del sistema. Espere a que se le asigne un hotel y un rol antes de
            poder iniciar sesión.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar
        activeView={activeView}
        onNavigate={setActiveView}
        userName={user.name}
        userEmail={user.email}
        userRole={user.role}
        onLogout={logout}
      />
      <SidebarInset>
        {/* Top Bar */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4">
          <SidebarTrigger />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-foreground font-medium">
                  {viewTitles[activeView] || "Panel de Control"}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <span className="text-xs text-muted-foreground hidden sm:block">
              {new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(new Date())}
            </span>
          </div>
        </header>

        {/* Main Content */}
        <main id="contenido-principal" tabIndex={-1} className="flex-1 overflow-auto p-4 lg:p-6">
          {activeView === "dashboard" && <DashboardView onNavigate={setActiveView} />}
          {activeView === "calendar" && <CalendarView />}
          {activeView === "guests" && <GuestsView />}
          {activeView === "pos" && <PosView />}
          {activeView === "billing" && <BillingView />}
          {activeView === "rooms" && <RoomsView />}
          {activeView === "settings" && <SettingsView />}
          {activeView === "reports" && <ReportsView />}
          {activeView === "adminRequests" && <AdminRequestsView />}
          {activeView === "tenants" && <TenantsView />}
          {activeView === "recepcionCreate" && <RecepcionCreateView />}
          {activeView === "systemReports" && <SystemReportsView onNavigate={setActiveView} />}

          <footer className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t pt-4 text-xs text-muted-foreground">
            <span>&copy; {new Date().getFullYear()} {user.tenantName?.trim() || "HotelManager"}</span>
            <Link href="/legal/privacidad" className="hover:text-foreground hover:underline">
              Privacidad
            </Link>
            <Link href="/legal/terminos" className="hover:text-foreground hover:underline">
              Terminos
            </Link>
            <Link href="/legal/reembolsos" className="hover:text-foreground hover:underline">
              Cancelacion y reembolsos
            </Link>
          </footer>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

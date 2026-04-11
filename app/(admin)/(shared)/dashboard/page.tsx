import { PlatformAdminDashboard } from "@/components/dashboard/platform-admin-dashboard";
import { listAdminPlatformDashboardData } from "./actions";

// Server Component principal del dashboard ejecutivo de admin cuponera.
export default async function DashboardPage() {
  // Resuelve todas las metricas en servidor para entregar un render estable.
  const data = await listAdminPlatformDashboardData();

  return (
    <div className="space-y-5">
      <PlatformAdminDashboard data={data} />
    </div>
  );
}

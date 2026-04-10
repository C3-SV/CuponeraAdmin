import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { SampleStatCard } from "@/components/dashboard/sample-stat-card";

export default function DashboardPage() {
  return (
    <div className="space-y-5">
      <ModulePlaceholder
        title="Dashboard"
        description="Base minima del tablero. Este espacio se deja liviano para que cada integrante conecte sus tablas, cards y graficas sin refactorizar el layout principal."
        ownerHint="Area compartida por todo el equipo"
      >
        <div className="max-w-sm">
          <SampleStatCard
            title="Metrica de Ejemplo"
            value="128"
            footer="Sustituir por widgets reales del modulo."
          />
        </div>
      </ModulePlaceholder>
    </div>
  );
}

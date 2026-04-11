import Link from "next/link";
import type {
  AdminPlatformDashboardData,
  DashboardLeaderboardItem,
  DashboardTrendPoint,
} from "@/lib/dashboard/types";

type PlatformAdminDashboardProps = {
  data: AdminPlatformDashboardData;
};

// Formatea montos a USD para consistencia con el resto del back-office.
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Traduce variaciones numericas a etiqueta + color visual.
function formatVariation(value: number | null): { label: string; tone: string } {
  if (value === null) {
    return {
      label: "Nuevo (sin base previa)",
      tone: "text-[var(--brand-blue)]",
    };
  }

  if (value > 0) {
    return { label: `+${value.toFixed(2)}%`, tone: "text-emerald-600" };
  }

  if (value < 0) {
    return { label: `${value.toFixed(2)}%`, tone: "text-red-600" };
  }

  return { label: "0.00%", tone: "text-[var(--text-muted)]" };
}

// Card visual reutilizable para indicadores KPI.
function KpiCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-linear-to-br from-[#f4f8ff] via-white to-[#fff4ec] p-5 shadow-[0_6px_16px_-14px_rgba(226,103,33,0.28)]">
      <p className="text-sm font-medium text-[var(--text-muted)]">{title}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
        {value}
      </p>
      {subtitle ? (
        <p className="mt-3 text-xs font-medium text-[var(--accent-strong)]">
          {subtitle}
        </p>
      ) : null}
    </article>
  );
}

// Mini grafico de barras sin librerias externas.
function TrendBars({ points }: { points: DashboardTrendPoint[] }) {
  if (points.length === 0) {
    return (
      <p className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-6 text-sm text-[var(--text-muted)]">
        Aun no hay datos para tendencia de los ultimos 30 dias.
      </p>
    );
  }

  const maxRevenue = Math.max(1, ...points.map((point) => point.revenue));
  const sample = points.filter((_, index) => index % 2 === 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-10 gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
        {sample.slice(-10).map((point) => {
          const height = Math.max(8, Math.round((point.revenue / maxRevenue) * 72));
          return (
            <div key={point.date} className="flex flex-col items-center gap-2">
              <div className="flex h-20 items-end">
                <div
                  className="w-4 rounded-sm bg-linear-to-t from-[var(--brand-blue)] to-[var(--brand-orange)]"
                  style={{ height: `${height}px` }}
                />
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">{point.date.slice(5)}</p>
            </div>
          );
        })}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--text-primary)]">
          Ultimos 30 dias vendidos:{" "}
          <span className="font-semibold">
            {points.reduce((acc, point) => acc + point.sold_coupons, 0)}
          </span>
        </p>
        <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--text-primary)]">
          Ultimos 30 dias ingresos:{" "}
          <span className="font-semibold">
            {formatCurrency(points.reduce((acc, point) => acc + point.revenue, 0))}
          </span>
        </p>
      </div>
    </div>
  );
}

// Tarjeta de ranking (empresas, categorias u ofertas).
function LeaderboardCard({
  title,
  items,
  showSoldCoupons = false,
}: {
  title: string;
  items: DashboardLeaderboardItem[];
  showSoldCoupons?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--text-muted)]">
            Sin datos disponibles.
          </p>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  {index + 1}. {item.label}
                </p>
                {showSoldCoupons ? (
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {item.sold_coupons ?? 0} cupones vendidos
                  </p>
                ) : null}
              </div>
              <p className="ml-3 text-xs font-semibold text-[var(--text-primary)]">
                {formatCurrency(item.revenue)}
              </p>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

export function PlatformAdminDashboard({ data }: PlatformAdminDashboardProps) {
  // Variaciones derivadas para lectura rapida en la vista.
  const revenueVariation = formatVariation(data.performance.revenue_variation_pct);
  const soldVariation = formatVariation(data.performance.sold_variation_pct);

  // Navegacion rapida a modulos operativos mas usados.
  const quickActions = [
    { label: "Revision de ofertas", href: "/offers-review", subtitle: "Aprobar y rechazar" },
    {
      label: "Estadisticas de ofertas",
      href: "/approved-offers-stats",
      subtitle: "Metricas comerciales",
    },
    { label: "Empresas", href: "/companies", subtitle: "Gestion de ofertantes" },
    {
      label: "Asignacion admin empresa",
      href: "/company-admin-assignment",
      subtitle: "1 admin por empresa",
    },
    {
      label: "Clientes y cupones",
      href: "/customers",
      subtitle: "Detalle y seguimiento",
    },
  ];

  return (
    <section className="space-y-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_6px_14px_-12px_rgba(15,23,42,0.24)] lg:p-7">
      {/* Encabezado contextual del dashboard ejecutivo */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          Dashboard General de Cuponera
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Resumen ejecutivo del negocio con enfoque en rendimiento comercial.
        </p>
      </div>

      {data.error ? (
        // Mensaje no bloqueante para errores de carga parcial.
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {data.error}
        </div>
      ) : null}

      {/* KPI globales de negocio y operacion interna */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          title="Ofertas aprobadas"
          value={String(data.kpis.approved_offers)}
          subtitle="Base principal de ingresos"
        />
        <KpiCard
          title="Ofertas pendientes"
          value={String(data.kpis.pending_offers)}
          subtitle="Pendientes por revision"
        />
        <KpiCard
          title="Empresas activas"
          value={String(data.kpis.active_companies)}
          subtitle="Empresas no eliminadas"
        />
        <KpiCard
          title="Ingresos totales"
          value={formatCurrency(data.kpis.total_revenue)}
          subtitle="Solo ofertas aprobadas"
        />
        <KpiCard
          title="Cargo por servicio"
          value={formatCurrency(data.kpis.total_service_fee)}
          subtitle="Comision total estimada"
        />
        <KpiCard
          title="Cuentas internas activas"
          value={String(data.kpis.active_internal_accounts)}
          subtitle="Admins plataforma y empresa"
        />
      </div>

      {/* Bloque central de performance comercial */}
      <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Rendimiento comercial
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
            <p className="text-xs text-[var(--text-muted)]">Empresa top</p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
              {data.performance.top_company_name}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {formatCurrency(data.performance.top_company_revenue)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
            <p className="text-xs text-[var(--text-muted)]">Categoria top</p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
              {data.performance.top_category_name}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {formatCurrency(data.performance.top_category_revenue)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
            <p className="text-xs text-[var(--text-muted)]">Oferta mas vendida</p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
              {data.performance.top_offer_title}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {data.performance.top_offer_sold} cupones
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
            <p className="text-xs text-[var(--text-muted)]">Ticket promedio por cupon</p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
              {formatCurrency(data.performance.avg_ticket_per_coupon)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
            <p className="text-xs text-[var(--text-muted)]">Ingreso promedio por oferta</p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
              {formatCurrency(data.performance.avg_revenue_per_approved_offer)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
            <p className="text-xs text-[var(--text-muted)]">Variacion ingresos (30d)</p>
            <p className={`mt-1 text-sm font-semibold ${revenueVariation.tone}`}>
              {revenueVariation.label}
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              Vs 30 dias anteriores
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
            <p className="text-xs text-[var(--text-muted)]">Variacion cupones (30d)</p>
            <p className={`mt-1 text-sm font-semibold ${soldVariation.tone}`}>
              {soldVariation.label}
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              Vs 30 dias anteriores
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs text-[var(--text-muted)]">
            Tendencia de ultimos 30 dias (cupones vendidos e ingresos)
          </p>
          <TrendBars points={data.performance.trend_last_30_days} />
        </div>
      </article>

      {/* Rankings de rendimiento para analisis comparativo */}
      <div className="grid gap-4 xl:grid-cols-3">
        <LeaderboardCard
          title="Top empresas por ingresos"
          items={data.performance.top_companies_by_revenue}
        />
        <LeaderboardCard
          title="Top categorias por ingresos"
          items={data.performance.top_categories_by_revenue}
        />
        <LeaderboardCard
          title="Top ofertas por ingresos"
          items={data.performance.top_offers_by_revenue}
          showSoldCoupons
        />
      </div>

      {/* Atajos de navegacion para flujos diarios del admin */}
      <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Accesos rapidos</h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Navegacion directa a modulos clave de operacion diaria.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 transition hover:border-[var(--brand-blue)] hover:bg-[var(--accent-soft)]"
            >
              <p className="text-sm font-semibold text-[var(--text-primary)]">{action.label}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{action.subtitle}</p>
            </Link>
          ))}
        </div>
      </article>
    </section>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listApprovedOfferStats } from "@/app/(admin)/(couponera-admin)/approved-offers-stats/actions";
import type {
  ApprovedOfferStatsFilters,
  ApprovedOfferStatsItem,
  ApprovedOfferStatsQueryParams,
  ApprovedOfferStatsResponse,
} from "@/lib/approved-offers-stats/types";

type ApprovedOffersStatsDashboardProps = {
  initialList: ApprovedOfferStatsResponse;
  filters: ApprovedOfferStatsFilters;
};

const DEFAULT_QUERY: ApprovedOfferStatsQueryParams = {
  search: "",
  companyId: "",
  categoryId: "",
  sortBy: "offer_title",
  sortDir: "asc",
  page: 1,
  pageSize: 10,
};

function getSortIndicator(
  field: ApprovedOfferStatsQueryParams["sortBy"],
  query: ApprovedOfferStatsQueryParams,
): string {
  if (query.sortBy !== field) {
    return "\u2195";
  }
  return query.sortDir === "asc" ? "\u2191" : "\u2193";
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function truncateLabel(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}…`;
}

function KpiCard({
  title,
  value,
  footer,
}: {
  title: string;
  value: string;
  footer?: string;
}) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-linear-to-br from-[#f4f8ff] via-white to-[#fff4ec] p-5 shadow-[0_6px_16px_-14px_rgba(226,103,33,0.28)]">
      <p className="text-sm font-medium text-[var(--text-muted)]">{title}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
        {value}
      </p>
      {footer ? (
        <p className="mt-3 text-xs font-medium text-[var(--accent-strong)]">
          {footer}
        </p>
      ) : null}
    </article>
  );
}

function BarsChart({
  items,
}: {
  items: ApprovedOfferStatsResponse["charts"]["top_revenue_offers"];
}) {
  const maxRevenue = useMemo(
    () => Math.max(1, ...items.map((item) => item.total_revenue)),
    [items],
  );

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-6 text-sm text-[var(--text-muted)]">
        No hay datos para mostrar top de ingresos.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-5">
      {items.map((item) => {
        const barHeight = Math.max(12, (item.total_revenue / maxRevenue) * 120);
        return (
          <div
            key={item.offer_id}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3"
          >
            <div className="flex h-36 items-end justify-center">
              <div
                className="w-10 rounded-t-md bg-linear-to-t from-[var(--brand-blue)] to-[var(--brand-orange)]"
                style={{ height: `${barHeight}px` }}
              />
            </div>
            <p className="mt-3 text-xs font-medium text-[var(--text-primary)]">
              {truncateLabel(item.offer_title, 18)}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {formatCurrency(item.total_revenue)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({
  sold,
  available,
  unlimitedOffersCount,
}: {
  sold: number;
  available: number;
  unlimitedOffersCount: number;
}) {
  const total = sold + available;
  const soldPercent = total > 0 ? (sold / total) * 100 : 0;
  const soldDeg = (soldPercent / 100) * 360;
  const gradient =
    total > 0
      ? `conic-gradient(var(--brand-blue) 0deg ${soldDeg}deg, var(--accent-soft) ${soldDeg}deg 360deg)`
      : "conic-gradient(#e5e7eb 0deg 360deg)";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div
          className="grid h-32 w-32 place-items-center rounded-full border border-[var(--border)] bg-white"
          style={{ background: gradient }}
        >
          <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center">
            <p className="text-[11px] font-semibold text-[var(--text-muted)]">Vendidos</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              {soldPercent.toFixed(0)}%
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-[var(--text-primary)]">
            <span className="font-semibold">Cupones vendidos:</span> {sold}
          </p>
          <p className="text-sm text-[var(--text-primary)]">
            <span className="font-semibold">Disponibles (finitos):</span> {available}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Ofertas ilimitadas: {unlimitedOffersCount}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ApprovedOffersStatsDashboard({
  initialList,
  filters,
}: ApprovedOffersStatsDashboardProps) {
  const [query, setQuery] = useState<ApprovedOfferStatsQueryParams>({
    ...DEFAULT_QUERY,
    page: initialList.page,
    pageSize: initialList.pageSize,
  });
  const [searchInput, setSearchInput] = useState("");
  const [listResult, setListResult] = useState(initialList);
  const [listError, setListError] = useState<string | null>(
    initialList.error ?? null,
  );
  const [isTableLoading, setIsTableLoading] = useState(false);

  const queryRef = useRef<ApprovedOfferStatsQueryParams>({
    ...DEFAULT_QUERY,
    page: initialList.page,
    pageSize: initialList.pageSize,
  });
  const searchInitializedRef = useRef(false);
  const latestRequestIdRef = useRef(0);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(listResult.total / query.pageSize)),
    [listResult.total, query.pageSize],
  );

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const loadStats = useCallback(async (nextQuery: ApprovedOfferStatsQueryParams) => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    setIsTableLoading(true);

    try {
      const response = await listApprovedOfferStats(nextQuery);
      if (requestId !== latestRequestIdRef.current) {
        return;
      }
      setListResult(response);
      setListError(response.error ?? null);
    } catch (error) {
      if (requestId !== latestRequestIdRef.current) {
        return;
      }
      setListError(
        error instanceof Error
          ? error.message
          : "No fue posible cargar estadisticas.",
      );
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsTableLoading(false);
      }
    }
  }, []);

  const applyQueryPatch = useCallback(
    async (patch: Partial<ApprovedOfferStatsQueryParams>) => {
      const nextQuery = { ...queryRef.current, ...patch };
      queryRef.current = nextQuery;
      setQuery(nextQuery);
      await loadStats(nextQuery);
    },
    [loadStats],
  );

  useEffect(() => {
    if (!searchInitializedRef.current) {
      searchInitializedRef.current = true;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void applyQueryPatch({ search: searchInput.trim(), page: 1 });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput, applyQueryPatch]);

  async function handleSort(sortBy: ApprovedOfferStatsQueryParams["sortBy"]) {
    const nextSortDir =
      query.sortBy === sortBy && query.sortDir === "asc" ? "desc" : "asc";
    await applyQueryPatch({ sortBy, sortDir: nextSortDir, page: 1 });
  }

  function renderAvailable(item: ApprovedOfferStatsItem) {
    if (item.available_coupons === null) {
      return (
        <span className="inline-flex rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--brand-blue)]">
          Ilimitado
        </span>
      );
    }
    return item.available_coupons;
  }

  return (
    <section className="space-y-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_6px_14px_-12px_rgba(15,23,42,0.24)] lg:p-7">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          Estadisticas de Ofertas Aprobadas
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Control de cupones vendidos, disponibles, ingresos y cargo por servicio.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Ofertas aprobadas"
          value={String(listResult.kpis.total_approved_offers)}
        />
        <KpiCard
          title="Cupones vendidos"
          value={String(listResult.kpis.total_sold_coupons)}
        />
        <KpiCard
          title="Ingresos totales"
          value={formatCurrency(listResult.kpis.total_revenue)}
        />
        <KpiCard
          title="Cargo por servicio"
          value={formatCurrency(listResult.kpis.total_service_fee)}
          footer={
            listResult.kpis.unlimited_offers_count > 0
              ? `${listResult.kpis.unlimited_offers_count} oferta(s) sin limite`
              : undefined
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Top 5 ofertas por ingresos
          </h2>
          <p className="mb-3 text-xs text-[var(--text-muted)]">
            Basado en el conjunto filtrado actual.
          </p>
          <BarsChart items={listResult.charts.top_revenue_offers} />
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Proporcion vendidos vs disponibles
          </h2>
          <p className="mb-3 text-xs text-[var(--text-muted)]">
            Disponible considera solo ofertas con limite definido.
          </p>
          <DonutChart
            sold={listResult.charts.sold_vs_available.sold}
            available={listResult.charts.sold_vs_available.available_finite}
            unlimitedOffersCount={
              listResult.charts.sold_vs_available.unlimited_offers_count
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
        <input
          type="text"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Buscar por oferta o empresa..."
          className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none sm:w-[280px]"
        />

        <select
          value={query.companyId}
          onChange={(event) =>
            void applyQueryPatch({ companyId: event.target.value, page: 1 })
          }
          className="h-10 rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)]"
        >
          <option value="">Todas las empresas</option>
          {filters.companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>

        <select
          value={query.categoryId}
          onChange={(event) =>
            void applyQueryPatch({ categoryId: event.target.value, page: 1 })
          }
          className="h-10 rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)]"
        >
          <option value="">Todas las categorias</option>
          {filters.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <label className="ml-auto inline-flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
          Mostrar
          <select
            value={query.pageSize}
            onChange={(event) =>
              void applyQueryPatch({ pageSize: Number(event.target.value), page: 1 })
            }
            className="h-9 rounded-lg border border-[var(--border)] bg-white px-2 text-sm text-[var(--text-primary)]"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          por pagina
        </label>
      </div>

      {listError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {listError}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
        <table className="min-w-full divide-y divide-[var(--border)] bg-white">
          <thead className="bg-[var(--surface-soft)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                <div className="inline-flex items-center gap-1 whitespace-nowrap">
                  <span>Oferta</span>
                  <button
                    type="button"
                    onClick={() => void handleSort("offer_title")}
                    className="inline-flex h-5 w-5 items-center justify-center rounded text-xs text-[var(--text-muted)] hover:bg-[var(--surface)]"
                  >
                    {getSortIndicator("offer_title", query)}
                  </button>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                <div className="inline-flex items-center gap-1 whitespace-nowrap">
                  <span>Empresa</span>
                  <button
                    type="button"
                    onClick={() => void handleSort("company_name")}
                    className="inline-flex h-5 w-5 items-center justify-center rounded text-xs text-[var(--text-muted)] hover:bg-[var(--surface)]"
                  >
                    {getSortIndicator("company_name", query)}
                  </button>
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                <div className="inline-flex items-center gap-1 whitespace-nowrap">
                  <span>Precio</span>
                  <button
                    type="button"
                    onClick={() => void handleSort("offer_price")}
                    className="inline-flex h-5 w-5 items-center justify-center rounded text-xs text-[var(--text-muted)] hover:bg-[var(--surface)]"
                  >
                    {getSortIndicator("offer_price", query)}
                  </button>
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                <div className="inline-flex items-center gap-1 whitespace-nowrap">
                  <span>Vendidos</span>
                  <button
                    type="button"
                    onClick={() => void handleSort("sold_coupons")}
                    className="inline-flex h-5 w-5 items-center justify-center rounded text-xs text-[var(--text-muted)] hover:bg-[var(--surface)]"
                  >
                    {getSortIndicator("sold_coupons", query)}
                  </button>
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                <div className="inline-flex items-center gap-1 whitespace-nowrap">
                  <span>Disponibles</span>
                  <button
                    type="button"
                    onClick={() => void handleSort("available_coupons")}
                    className="inline-flex h-5 w-5 items-center justify-center rounded text-xs text-[var(--text-muted)] hover:bg-[var(--surface)]"
                  >
                    {getSortIndicator("available_coupons", query)}
                  </button>
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                <div className="inline-flex items-center gap-1 whitespace-nowrap">
                  <span>Ingresos</span>
                  <button
                    type="button"
                    onClick={() => void handleSort("total_revenue")}
                    className="inline-flex h-5 w-5 items-center justify-center rounded text-xs text-[var(--text-muted)] hover:bg-[var(--surface)]"
                  >
                    {getSortIndicator("total_revenue", query)}
                  </button>
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                <div className="inline-flex items-center gap-1 whitespace-nowrap">
                  <span>Cargo servicio</span>
                  <button
                    type="button"
                    onClick={() => void handleSort("service_fee")}
                    className="inline-flex h-5 w-5 items-center justify-center rounded text-xs text-[var(--text-muted)] hover:bg-[var(--surface)]"
                  >
                    {getSortIndicator("service_fee", query)}
                  </button>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Fechas
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {isTableLoading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-sm text-[var(--text-muted)]"
                >
                  Cargando estadisticas...
                </td>
              </tr>
            ) : null}

            {!isTableLoading && listResult.data.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-sm text-[var(--text-muted)]"
                >
                  No hay ofertas aprobadas para mostrar.
                </td>
              </tr>
            ) : null}

            {!isTableLoading
              ? listResult.data.map((item) => (
                  <tr key={item.offer_id} className="hover:bg-[var(--surface-soft)]/60">
                    <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                      <p className="font-medium">{item.offer_title}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                      <p>{item.company_name}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {item.category_name ?? "Sin categoria"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-[var(--text-primary)]">
                      {formatCurrency(item.offer_price)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-[var(--text-primary)]">
                      {item.sold_coupons}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-[var(--text-primary)]">
                      {renderAvailable(item)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-[var(--text-primary)]">
                      {formatCurrency(item.total_revenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-[var(--text-primary)]">
                      {formatCurrency(item.service_fee)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      <p>
                        Estado:{" "}
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                          Aprobada
                        </span>
                      </p>
                      <p>Inicio: {formatDate(item.offer_start_date)}</p>
                      <p>Fin: {formatDate(item.offer_end_date)}</p>
                      <p>Canje: {formatDate(item.coupon_usage_deadline)}</p>
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--text-muted)]">
          Mostrando {listResult.data.length} de {listResult.total} registros.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void applyQueryPatch({ page: Math.max(1, query.page - 1) })}
            disabled={query.page <= 1 || isTableLoading}
            className="h-9 rounded-lg border border-[var(--border)] px-3 text-sm text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-sm text-[var(--text-muted)]">
            Pagina {query.page} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              void applyQueryPatch({ page: Math.min(totalPages, query.page + 1) })
            }
            disabled={query.page >= totalPages || isTableLoading}
            className="h-9 rounded-lg border border-[var(--border)] px-3 text-sm text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    </section>
  );
}

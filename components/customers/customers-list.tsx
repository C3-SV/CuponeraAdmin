"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getCustomerCoupons,
  listCustomers,
} from "@/app/(admin)/(couponera-admin)/customers/actions";
import type {
  CustomerCoupon,
  CustomerListItem,
  CustomerQueryParams,
  CustomersListResponse,
} from "@/lib/customers/types";

type CustomersListProps = {
  initialList: CustomersListResponse;
};

const DEFAULT_QUERY: CustomerQueryParams = {
  search: "",
  sortBy: "first_names",
  sortDir: "asc",
  page: 1,
  pageSize: 10,
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getSortIndicator(
  field: CustomerQueryParams["sortBy"],
  query: CustomerQueryParams,
): string {
  if (query.sortBy !== field) return "\u2195";
  return query.sortDir === "asc" ? "\u2191" : "\u2193";
}

function getCouponStatusLabel(status: CustomerCoupon["coupon_status"]): string {
  if (status === "AVAILABLE") return "Disponible";
  if (status === "REDEEMED") return "Canjeado";
  return "Vencido";
}

function getCouponStatusStyles(status: CustomerCoupon["coupon_status"]): string {
  if (status === "AVAILABLE") return "bg-[var(--accent-soft)] text-[var(--brand-blue)]";
  if (status === "REDEEMED") return "bg-green-100 text-green-700";
  return "bg-amber-100 text-amber-700";
}

function DetailIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
      <circle cx="10" cy="10" r="7" />
      <line x1="10" y1="8.3" x2="10" y2="13.4" />
      <circle cx="10" cy="5.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
      <path d="M3.333 5.833a1.667 1.667 0 0 1 1.667-1.666h10a1.667 1.667 0 0 1 1.667 1.666v2.084a1.667 1.667 0 0 0 0 3.166v2.084A1.667 1.667 0 0 1 15 14.833H5a1.667 1.667 0 0 1-1.667-1.666v-2.084a1.667 1.667 0 0 0 0-3.166V5.833Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 6.667v6.666" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M5.5 5.5 14.5 14.5M14.5 5.5 5.5 14.5" strokeLinecap="round" />
    </svg>
  );
}

export function CustomersList({ initialList }: CustomersListProps) {
  const [list, setList] = useState<CustomersListResponse>(initialList);
  const [query, setQuery] = useState<CustomerQueryParams>(DEFAULT_QUERY);
  const queryRef = useRef<CustomerQueryParams>(DEFAULT_QUERY);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListItem | null>(null);

  const [coupons, setCoupons] = useState<CustomerCoupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);

  useEffect(() => { queryRef.current = query; }, [query]);

  const fetchList = useCallback(async (params: CustomerQueryParams) => {
    setLoading(true);
    const result = await listCustomers(params);
    setList(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = { ...queryRef.current, search: searchInput, page: 1 };
      setQuery(next);
      void fetchList(next);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, fetchList]);

  useEffect(() => {
    function onEscape(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (detailModalOpen) setDetailModalOpen(false);
      if (couponModalOpen) setCouponModalOpen(false);
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [detailModalOpen, couponModalOpen]);

  function handleSort(field: CustomerQueryParams["sortBy"]) {
    const next = {
      ...queryRef.current,
      sortBy: field,
      sortDir: queryRef.current.sortBy === field && queryRef.current.sortDir === "asc" ? ("desc" as const) : ("asc" as const),
      page: 1,
    };
    setQuery(next);
    void fetchList(next);
  }

  function handlePage(page: number) {
    const next = { ...queryRef.current, page };
    setQuery(next);
    void fetchList(next);
  }

  function openDetail(customer: CustomerListItem) {
    setSelectedCustomer(customer);
    setDetailModalOpen(true);
  }

  async function openCoupons(customer: CustomerListItem) {
    setSelectedCustomer(customer);
    setCouponModalOpen(true);
    setCouponsLoading(true);
    const result = await getCustomerCoupons(customer.user_id);
    setCoupons(result.data);
    setCouponsLoading(false);
  }

  const availableCoupons = useMemo(() => coupons.filter((c) => c.coupon_status === "AVAILABLE"), [coupons]);
  const redeemedCoupons = useMemo(() => coupons.filter((c) => c.coupon_status === "REDEEMED"), [coupons]);
  const expiredCoupons = useMemo(() => coupons.filter((c) => c.coupon_status === "EXPIRED"), [coupons]);

  const totalPages = Math.max(1, Math.ceil(list.total / query.pageSize));

  return (
    <>
      <section className="space-y-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_6px_14px_-12px_rgba(15,23,42,0.24)] lg:p-7">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Clientes
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Listado de clientes registrados en La Cuponera.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre o apellido..."
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none sm:w-[260px]"
          />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="min-w-full divide-y divide-[var(--border)] bg-white">
            <thead className="bg-[var(--surface-soft)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  <div className="inline-flex items-center gap-1 whitespace-nowrap">
                    <span>Nombre</span>
                    <button type="button" onClick={() => handleSort("first_names")} className="inline-flex h-5 w-5 items-center justify-center rounded text-xs text-[var(--text-muted)] hover:bg-[var(--surface)]" aria-label="Ordenar por nombre">
                      {getSortIndicator("first_names", query)}
                    </button>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Contacto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">DUI</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  <div className="inline-flex items-center gap-1 whitespace-nowrap">
                    <span>Registro</span>
                    <button type="button" onClick={() => handleSort("created_at")} className="inline-flex h-5 w-5 items-center justify-center rounded text-xs text-[var(--text-muted)] hover:bg-[var(--surface)]" aria-label="Ordenar por fecha">
                      {getSortIndicator("created_at", query)}
                    </button>
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">Cargando clientes...</td>
                </tr>
              ) : null}
              {!loading && list.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">No hay clientes para mostrar.</td>
                </tr>
              ) : null}
              {!loading ? list.data.map((customer) => (
                <tr key={customer.user_id} className="hover:bg-[var(--surface-soft)]/60">
                  <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{customer.full_name}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-[var(--text-primary)]">{customer.email || "—"}</p>
                    {customer.phone && <p className="text-xs text-[var(--text-muted)]">{customer.phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{customer.dui ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${customer.user_is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {customer.user_is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{formatDate(customer.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => openDetail(customer)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-soft)]"
                      >
                        <DetailIcon />
                        Detalle
                      </button>
                      <button
                        type="button"
                        onClick={() => void openCoupons(customer)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand-blue)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-strong)]"
                      >
                        <TicketIcon />
                        Ver cupones
                      </button>
                    </div>
                  </td>
                </tr>
              )) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-muted)]">
            Mostrando {list.data.length} de {list.total} registros.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePage(Math.max(1, query.page - 1))}
              disabled={query.page <= 1 || loading}
              className="h-9 rounded-lg border border-[var(--border)] px-3 text-sm text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-sm text-[var(--text-muted)]">
              Pagina {query.page} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => handlePage(Math.min(totalPages, query.page + 1))}
              disabled={query.page >= totalPages || loading}
              className="h-9 rounded-lg border border-[var(--border)] px-3 text-sm text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>

      {/* Modal detalle cliente */}
      {detailModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-40 grid place-items-center p-4">
          <button type="button" aria-label="Cerrar modal detalle" onClick={() => setDetailModalOpen(false)} className="absolute inset-0 bg-[#0f2749]/45" />
          <section className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_18px_36px_-22px_rgba(15,23,42,0.35)] lg:p-6">
            <header className="mb-4 flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Detalle de cliente</h2>
                <p className="text-sm text-[var(--text-muted)]">{selectedCustomer.full_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
                aria-label="Cerrar"
              >
                <CloseIcon />
              </button>
            </header>

            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Datos personales</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <p className="text-sm text-[var(--text-primary)]"><span className="font-medium">Nombre:</span> {selectedCustomer.full_name}</p>
                  <p className="text-sm text-[var(--text-primary)]"><span className="font-medium">DUI:</span> {selectedCustomer.dui ?? "—"}</p>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Contacto</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <p className="text-sm text-[var(--text-primary)]"><span className="font-medium">Correo:</span> {selectedCustomer.email || "—"}</p>
                  <p className="text-sm text-[var(--text-primary)]"><span className="font-medium">Telefono:</span> {selectedCustomer.phone ?? "—"}</p>
                  <p className="text-sm text-[var(--text-primary)] sm:col-span-2"><span className="font-medium">Direccion:</span> {selectedCustomer.address ?? "—"}</p>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Cuenta</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <p className="text-sm text-[var(--text-primary)]"><span className="font-medium">Registro:</span> {formatDate(selectedCustomer.created_at)}</p>
                  <p className="text-sm text-[var(--text-primary)]">
                    <span className="font-medium">Estado:</span>{" "}
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${selectedCustomer.user_is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {selectedCustomer.user_is_active ? "Activo" : "Inactivo"}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Modal cupones del cliente */}
      {couponModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-40 grid place-items-center p-4">
          <button type="button" aria-label="Cerrar modal cupones" onClick={() => setCouponModalOpen(false)} className="absolute inset-0 bg-[#0f2749]/45" />
          <section className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_18px_36px_-22px_rgba(15,23,42,0.35)] lg:p-6">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Cupones por estado</h2>
                <p className="text-sm text-[var(--text-muted)]">{selectedCustomer.full_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setCouponModalOpen(false)}
                className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
                aria-label="Cerrar"
              >
                <CloseIcon />
              </button>
            </header>

            {couponsLoading ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">Cargando cupones...</p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                {(
                  [
                    { label: "Disponibles", data: availableCoupons, status: "AVAILABLE" as const },
                    { label: "Canjeados", data: redeemedCoupons, status: "REDEEMED" as const },
                    { label: "Vencidos", data: expiredCoupons, status: "EXPIRED" as const },
                  ] as const
                ).map(({ label, data, status }) => (
                  <section key={status} className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                    <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                      {label} ({data.length})
                    </h3>
                    <div className="space-y-3">
                      {data.length === 0 ? (
                        <p className="text-xs text-[var(--text-muted)]">Sin cupones.</p>
                      ) : (
                        data.map((coupon) => (
                          <article key={coupon.coupon_id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                            <p className="text-sm font-medium text-[var(--text-primary)]">{coupon.offer_title}</p>
                            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{coupon.company_name}</p>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">Codigo: {coupon.coupon_code}</p>
                            {coupon.coupon_expires_at && (
                              <p className="mt-0.5 text-xs text-[var(--text-muted)]">Expira: {formatDate(coupon.coupon_expires_at)}</p>
                            )}
                            {coupon.coupon_redeemed_at && (
                              <p className="mt-0.5 text-xs text-[var(--text-muted)]">Canjeado: {formatDate(coupon.coupon_redeemed_at)}</p>
                            )}
                            <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getCouponStatusStyles(coupon.coupon_status)}`}>
                              {getCouponStatusLabel(coupon.coupon_status)}
                            </span>
                          </article>
                        ))
                      )}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}

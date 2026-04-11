"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  if (status === "AVAILABLE") return "bg-(--accent-soft) text-(--brand-blue)";
  if (status === "REDEEMED") return "bg-green-100 text-green-700";
  return "bg-amber-100 text-amber-700";
}

export function CustomersList({ initialList }: CustomersListProps) {
  const [list, setList] = useState<CustomersListResponse>(initialList);
  const [query, setQuery] = useState<CustomerQueryParams>(DEFAULT_QUERY);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListItem | null>(null);

  const [coupons, setCoupons] = useState<CustomerCoupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);

  const fetchList = useCallback(async (params: CustomerQueryParams) => {
    setLoading(true);
    const result = await listCustomers(params);
    setList(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = { ...query, search: searchInput, page: 1 };
      setQuery(next);
      fetchList(next);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (detailModalOpen) setDetailModalOpen(false);
      if (couponModalOpen) setCouponModalOpen(false);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [detailModalOpen, couponModalOpen]);

  function handleSort(field: CustomerQueryParams["sortBy"]) {
    const next = {
      ...query,
      sortBy: field,
      sortDir:
        query.sortBy === field && query.sortDir === "asc"
          ? ("desc" as const)
          : ("asc" as const),
      page: 1,
    };
    setQuery(next);
    fetchList(next);
  }

  function handlePage(page: number) {
    const next = { ...query, page };
    setQuery(next);
    fetchList(next);
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

  const availableCoupons = useMemo(
    () => coupons.filter((c) => c.coupon_status === "AVAILABLE"),
    [coupons],
  );
  const redeemedCoupons = useMemo(
    () => coupons.filter((c) => c.coupon_status === "REDEEMED"),
    [coupons],
  );
  const expiredCoupons = useMemo(
    () => coupons.filter((c) => c.coupon_status === "EXPIRED"),
    [coupons],
  );

  const totalPages = Math.max(1, Math.ceil(list.total / query.pageSize));

  return (
    <>
      <section className="space-y-4 rounded-3xl border border-(--border) bg-(--surface) p-5 shadow-[0_6px_14px_-12px_rgba(15,23,42,0.24)] lg:p-7">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Clientes
          </h1>
          <p className="text-sm text-(--text-muted)">
            Listado de clientes registrados en La Cuponera.
          </p>
        </div>

        <input
          type="search"
          placeholder="Buscar por nombre o apellido…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full max-w-xs rounded-xl border border-(--border) bg-(--surface-soft) px-3 py-2 text-sm outline-none focus:border-(--accent) focus:ring-1 focus:ring-(--accent)"
        />

        <div className="overflow-x-auto rounded-2xl border border-(--border)">
          <table className="min-w-full divide-y divide-(--border)">
            <thead className="bg-(--surface-soft)">
              <tr>
                <th
                  onClick={() => handleSort("first_names")}
                  className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted) hover:text-foreground"
                >
                  Nombre {getSortIndicator("first_names", query)}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
                  Contacto
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
                  DUI
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
                  Estado
                </th>
                <th
                  onClick={() => handleSort("created_at")}
                  className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted) hover:text-foreground"
                >
                  Registro {getSortIndicator("created_at", query)}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border) bg-(--surface)">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-(--text-muted)">
                    Cargando…
                  </td>
                </tr>
              ) : list.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-(--text-muted)">
                    No se encontraron clientes.
                  </td>
                </tr>
              ) : (
                list.data.map((customer) => (
                  <tr key={customer.user_id} className="hover:bg-(--surface-soft)/70">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{customer.full_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-foreground">{customer.email || "—"}</p>
                      {customer.phone && (
                        <p className="text-xs text-(--text-muted)">{customer.phone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {customer.dui ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          customer.user_is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {customer.user_is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-(--text-muted)">
                      {formatDate(customer.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openDetail(customer)}
                          className="rounded-lg border border-(--border) px-3 py-1.5 text-xs font-medium text-foreground hover:bg-(--surface-soft)"
                        >
                          Ver detalle
                        </button>
                        <button
                          type="button"
                          onClick={() => openCoupons(customer)}
                          className="rounded-lg bg-(--brand-blue) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--accent-strong)"
                        >
                          Ver cupones
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-(--text-muted)">
          <span>
            {list.total === 0
              ? "Sin resultados"
              : `${(query.page - 1) * query.pageSize + 1}–${Math.min(query.page * query.pageSize, list.total)} de ${list.total}`}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => handlePage(query.page - 1)}
              disabled={query.page <= 1}
              className="rounded-lg border border-(--border) px-3 py-1.5 disabled:opacity-40 hover:bg-(--surface-soft)"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - query.page) <= 2)
              .map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePage(p)}
                  className={`rounded-lg border px-3 py-1.5 ${
                    p === query.page
                      ? "border-(--accent) bg-(--accent) text-white"
                      : "border-(--border) hover:bg-(--surface-soft)"
                  }`}
                >
                  {p}
                </button>
              ))}
            <button
              type="button"
              onClick={() => handlePage(query.page + 1)}
              disabled={query.page >= totalPages}
              className="rounded-lg border border-(--border) px-3 py-1.5 disabled:opacity-40 hover:bg-(--surface-soft)"
            >
              ›
            </button>
          </div>
        </div>
      </section>

      {/* Modal detalle cliente */}
      {detailModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-40 grid place-items-center p-4">
          <button
            type="button"
            aria-label="Cerrar modal detalle"
            onClick={() => setDetailModalOpen(false)}
            className="absolute inset-0 bg-[#0f2749]/45"
          />
          <section className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-(--border) bg-(--surface) p-5 shadow-2xl lg:p-6">
            <header className="mb-4 flex items-start justify-between gap-4 border-b border-(--border) pb-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Detalle de cliente</h2>
                <p className="text-sm text-(--text-muted)">{selectedCustomer.full_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="rounded-lg border border-(--border) px-2.5 py-1.5 text-sm text-(--text-muted) hover:bg-(--surface-soft)"
              >
                Cerrar
              </button>
            </header>

            <div className="space-y-4">
              <div className="rounded-xl border border-(--border) bg-(--surface-soft) p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
                  Datos personales
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Nombre:</span> {selectedCustomer.full_name}
                  </p>
                  <p className="text-sm text-foreground">
                    <span className="font-medium">DUI:</span> {selectedCustomer.dui ?? "—"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-(--border) bg-(--surface-soft) p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
                  Contacto
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Correo:</span> {selectedCustomer.email || "—"}
                  </p>
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Teléfono:</span> {selectedCustomer.phone ?? "—"}
                  </p>
                  <p className="text-sm text-foreground sm:col-span-2">
                    <span className="font-medium">Dirección:</span> {selectedCustomer.address ?? "—"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-(--border) bg-(--surface-soft) p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
                  Cuenta
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Registro:</span>{" "}
                    {formatDate(selectedCustomer.created_at)}
                  </p>
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Estado:</span>{" "}
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        selectedCustomer.user_is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
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
          <button
            type="button"
            aria-label="Cerrar modal cupones"
            onClick={() => setCouponModalOpen(false)}
            className="absolute inset-0 bg-[#0f2749]/45"
          />
          <section className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-(--border) bg-(--surface) p-5 shadow-2xl lg:p-6">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-(--border) pb-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Cupones por estado</h2>
                <p className="text-sm text-(--text-muted)">{selectedCustomer.full_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setCouponModalOpen(false)}
                className="rounded-lg border border-(--border) px-2.5 py-1.5 text-sm text-(--text-muted) hover:bg-(--surface-soft)"
              >
                Cerrar
              </button>
            </header>

            {couponsLoading ? (
              <p className="py-8 text-center text-sm text-(--text-muted)">Cargando cupones…</p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                {(
                  [
                    { label: "Disponibles", data: availableCoupons, status: "AVAILABLE" as const },
                    { label: "Canjeados", data: redeemedCoupons, status: "REDEEMED" as const },
                    { label: "Vencidos", data: expiredCoupons, status: "EXPIRED" as const },
                  ] as const
                ).map(({ label, data, status }) => (
                  <section
                    key={status}
                    className="rounded-xl border border-(--border) bg-(--surface-soft) p-4"
                  >
                    <h3 className="mb-3 text-sm font-semibold text-foreground">
                      {label} ({data.length})
                    </h3>
                    <div className="space-y-3">
                      {data.length === 0 ? (
                        <p className="text-xs text-(--text-muted)">Sin cupones.</p>
                      ) : (
                        data.map((coupon) => (
                          <article
                            key={coupon.coupon_id}
                            className="rounded-lg border border-(--border) bg-(--surface) p-3"
                          >
                            <p className="text-sm font-medium text-foreground">
                              {coupon.offer_title}
                            </p>
                            <p className="mt-0.5 text-xs text-(--text-muted)">
                              {coupon.company_name}
                            </p>
                            <p className="mt-1 text-xs text-(--text-muted)">
                              Código: {coupon.coupon_code}
                            </p>
                            {coupon.coupon_expires_at && (
                              <p className="mt-0.5 text-xs text-(--text-muted)">
                                Expira: {formatDate(coupon.coupon_expires_at)}
                              </p>
                            )}
                            {coupon.coupon_redeemed_at && (
                              <p className="mt-0.5 text-xs text-(--text-muted)">
                                Canjeado: {formatDate(coupon.coupon_redeemed_at)}
                              </p>
                            )}
                            <span
                              className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getCouponStatusStyles(coupon.coupon_status)}`}
                            >
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

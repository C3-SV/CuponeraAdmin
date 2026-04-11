"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CustomerStatus = "activa" | "inactiva";
type CouponStatus = "disponible" | "canjeado" | "vencido";

type Customer = {
  id: string;
  nombreCompleto: string;
  telefono: string;
  dui: string;
  direccion: string;
  fechaRegistro: string;
  estadoCuenta: CustomerStatus;
};

type CustomerCoupon = {
  id: string;
  tituloOferta: string;
  codigo: string;
  fechaCompra: string;
  fechaExpiracion: string;
  estado: CouponStatus;
};

type CustomerProfileRow = {
  user_id: string;
  dui: string | null;
  address: string | null;
  phone: string | null;
  created_at: string;
  deleted_at: string | null;
};

type ProfileRow = {
  user_id: string;
  first_names: string | null;
  last_names: string | null;
  user_is_active: boolean | null;
  created_at?: string | null;
};

type OrderRow = {
  order_id: string;
  customer_id: string;
  order_status: string;
  deleted_at: string | null;
};

type OrderItemRow = {
  order_item_id: string;
  order_id: string;
  offer_id: string;
  created_at: string;
  deleted_at: string | null;
};

type OfferRow = {
  offer_id: string;
  offer_title: string;
};

type CouponRow = {
  coupon_id: string;
  order_item_id: string;
  coupon_code: string;
  coupon_issued_at: string;
  coupon_expires_at: string;
  coupon_redeemed_at: string | null;
  coupon_status: string;
  deleted_at: string | null;
};

function getStatusStyles(status: CustomerStatus): string {
  if (status === "activa") {
    return "bg-green-100 text-green-700";
  }

  return "bg-red-100 text-red-700";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getCouponStatusStyles(status: CouponStatus): string {
  if (status === "disponible") {
    return "bg-(--accent-soft) text-(--brand-blue)";
  }

  if (status === "canjeado") {
    return "bg-green-100 text-green-700";
  }

  return "bg-amber-100 text-amber-700";
}

function getCouponsByState(
  coupons: CustomerCoupon[],
  status: CouponStatus,
): CustomerCoupon[] {
  return coupons.filter((coupon) => coupon.estado === status);
}

function normalizeCouponStatus(coupon: CouponRow): CouponStatus {
  if (coupon.coupon_status === "REDEEMED" || coupon.coupon_redeemed_at) {
    return "canjeado";
  }

  const expirationTime = new Date(coupon.coupon_expires_at).getTime();
  if (!Number.isNaN(expirationTime) && expirationTime < Date.now()) {
    return "vencido";
  }

  return "disponible";
}

function buildCustomerName(profile?: ProfileRow): string {
  if (!profile) {
    return "Cliente";
  }

  const first = profile.first_names?.trim() ?? "";
  const last = profile.last_names?.trim() ?? "";
  const full = `${first} ${last}`.trim();

  return full || "Cliente";
}

export default function CustomersPage() {
  const PAGE_SIZE = 10;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [couponsByCustomer, setCouponsByCustomer] = useState<
    Record<string, CustomerCoupon[]>
  >({});
  const [loadingData, setLoadingData] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [couponModalOpen, setCouponModalOpen] = useState(false);

  async function loadCustomersAndCoupons() {
    setLoadingData(true);
    setLoadingError(null);

    try {
      const supabase = createClient();

      const [
        customerProfileResult,
        ordersResult,
        orderItemsResult,
        offersResult,
        couponsResult,
        profilesResult,
      ] = await Promise.all([
        supabase
          .from("customer_profile")
          .select("user_id, dui, address, phone, created_at, deleted_at")
          .is("deleted_at", null),
        supabase
          .from("orders")
          .select("order_id, customer_id, order_status, deleted_at")
          .is("deleted_at", null)
          .eq("order_status", "COMPLETED"),
        supabase
          .from("order_items")
          .select("order_item_id, order_id, offer_id, created_at, deleted_at")
          .is("deleted_at", null),
        supabase.from("offers").select("offer_id, offer_title"),
        supabase
          .from("coupons")
          .select(
            "coupon_id, order_item_id, coupon_code, coupon_issued_at, coupon_expires_at, coupon_redeemed_at, coupon_status, deleted_at",
          )
          .is("deleted_at", null),
        supabase
          .from("profiles")
          .select("user_id, first_names, last_names, user_is_active, created_at"),
      ]);

      if (
        customerProfileResult.error ||
        ordersResult.error ||
        orderItemsResult.error ||
        offersResult.error ||
        couponsResult.error ||
        profilesResult.error
      ) {
        throw new Error(
          customerProfileResult.error?.message ||
            ordersResult.error?.message ||
            orderItemsResult.error?.message ||
            offersResult.error?.message ||
            couponsResult.error?.message ||
            profilesResult.error?.message ||
            "No se pudo cargar datos de clientes y cupones.",
        );
      }

      const customerProfiles = (customerProfileResult.data ?? []) as CustomerProfileRow[];
      const orders = (ordersResult.data ?? []) as OrderRow[];
      const orderItems = (orderItemsResult.data ?? []) as OrderItemRow[];
      const offers = (offersResult.data ?? []) as OfferRow[];
      const coupons = (couponsResult.data ?? []) as CouponRow[];
      const profiles = (profilesResult.data ?? []) as ProfileRow[];

      const customerProfileMap = new Map(
        customerProfiles.map((row) => [row.user_id, row]),
      );
      const orderMap = new Map(orders.map((row) => [row.order_id, row]));
      const orderItemMap = new Map(orderItems.map((row) => [row.order_item_id, row]));
      const offerMap = new Map(offers.map((row) => [row.offer_id, row]));
      const profileMap = new Map(profiles.map((row) => [row.user_id, row]));

      const nextCouponsByCustomer: Record<string, CustomerCoupon[]> = {};

      for (const coupon of coupons) {
        const orderItem = orderItemMap.get(coupon.order_item_id);
        if (!orderItem) {
          continue;
        }

        const order = orderMap.get(orderItem.order_id);
        if (!order) {
          continue;
        }

        const customerId = order.customer_id;
        const offerTitle = offerMap.get(orderItem.offer_id)?.offer_title ?? coupon.coupon_code;

        if (!nextCouponsByCustomer[customerId]) {
          nextCouponsByCustomer[customerId] = [];
        }

        nextCouponsByCustomer[customerId].push({
          id: coupon.coupon_id,
          tituloOferta: offerTitle,
          codigo: coupon.coupon_code,
          fechaCompra: coupon.coupon_issued_at || orderItem.created_at,
          fechaExpiracion: coupon.coupon_expires_at,
          estado: normalizeCouponStatus(coupon),
        });
      }

      const userIds = new Set<string>([
        ...customerProfiles.map((row) => row.user_id),
        ...Object.keys(nextCouponsByCustomer),
      ]);

      const nextCustomers: Customer[] = Array.from(userIds).map((userId) => {
        const profile = profileMap.get(userId);
        const customerProfile = customerProfileMap.get(userId);

        return {
          id: userId,
          nombreCompleto: buildCustomerName(profile),
          telefono: customerProfile?.phone?.trim() || "-",
          dui: customerProfile?.dui?.trim() || "-",
          direccion: customerProfile?.address?.trim() || "-",
          fechaRegistro:
            customerProfile?.created_at ||
            profile?.created_at ||
            new Date().toISOString(),
          estadoCuenta: profile?.user_is_active === false ? "inactiva" : "activa",
        };
      });

      nextCustomers.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));

      setCustomers(nextCustomers);
      setCouponsByCustomer(nextCouponsByCustomer);
    } catch (error) {
      setLoadingError(
        error instanceof Error ? error.message : "No fue posible cargar datos.",
      );
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    loadCustomersAndCoupons();
  }, []);

  useEffect(() => {
    if (!couponModalOpen) {
      return;
    }

    void loadCustomersAndCoupons();
  }, [couponModalOpen]);

  const selectedCustomerCoupons = useMemo(() => {
    if (!selectedCustomer) {
      return [];
    }

    return couponsByCustomer[selectedCustomer.id] ?? [];
  }, [couponsByCustomer, selectedCustomer]);

  const availableCoupons = useMemo(
    () => getCouponsByState(selectedCustomerCoupons, "disponible"),
    [selectedCustomerCoupons],
  );

  const redeemedCoupons = useMemo(
    () => getCouponsByState(selectedCustomerCoupons, "canjeado"),
    [selectedCustomerCoupons],
  );

  const expiredCoupons = useMemo(
    () => getCouponsByState(selectedCustomerCoupons, "vencido"),
    [selectedCustomerCoupons],
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(customers.length / PAGE_SIZE)),
    [customers.length],
  );

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return customers.slice(start, start + PAGE_SIZE);
  }, [customers, currentPage]);

  useEffect(() => {
    setCurrentPage((previousPage) => Math.min(previousPage, totalPages));
  }, [totalPages]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (detailModalOpen) {
        setDetailModalOpen(false);
      }

      if (couponModalOpen) {
        setCouponModalOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [couponModalOpen, detailModalOpen]);

  function openCustomerDetail(customer: Customer) {
    setSelectedCustomer(customer);
    setDetailModalOpen(true);
  }

  function openCustomerCoupons(customer: Customer) {
    setSelectedCustomer(customer);
    setCouponModalOpen(true);
  }

  function refreshCustomers() {
    void loadCustomersAndCoupons();
  }

  function closeDetailModal() {
    setDetailModalOpen(false);
  }

  function closeCouponModal() {
    setCouponModalOpen(false);
  }

  return (
    <>
      <section className="space-y-4 rounded-3xl border border-(--border) bg-(--surface) p-5 shadow-[0_6px_14px_-12px_rgba(15,23,42,0.24)] lg:p-7">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Clientes y Cupones
          </h1>
          <p className="text-sm text-(--text-muted)">
            Gestiona detalle de cliente y consulta cupones por estado.
          </p>
          {loadingError ? (
            <p className="text-sm text-red-600">Error de carga: {loadingError}</p>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-(--border)">
          <table className="min-w-full divide-y divide-(--border)">
            <thead className="bg-(--surface-soft)">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
                  Contacto
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
                  Registro
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
                  Estado
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border) bg-(--surface)">
              {loadingData ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-sm text-(--text-muted)"
                  >
                    Cargando clientes desde la base de datos...
                  </td>
                </tr>
              ) : null}

              {!loadingData && customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-sm text-(--text-muted)"
                  >
                    No hay clientes para mostrar.
                  </td>
                </tr>
              ) : null}

              {paginatedCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-(--surface-soft)/70">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground">
                      {customer.nombreCompleto}
                    </p>
                    <p className="text-xs text-(--text-muted)">{customer.id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-(--text-muted)">{customer.telefono}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {formatDate(customer.fechaRegistro)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusStyles(
                        customer.estadoCuenta,
                      )}`}
                    >
                      {customer.estadoCuenta}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openCustomerDetail(customer)}
                        className="rounded-lg border border-(--border) px-3 py-1.5 text-xs font-medium text-foreground hover:bg-(--surface-soft)"
                      >
                        Ver detalle
                      </button>
                      <button
                        type="button"
                        onClick={() => openCustomerCoupons(customer)}
                        className="rounded-lg bg-(--brand-blue) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--accent-strong)"
                      >
                        Ver cupones
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loadingData && customers.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--border) bg-(--surface-soft) px-4 py-3">
            <p className="text-xs text-(--text-muted)">
              Mostrando {paginatedCustomers.length} de {customers.length} clientes
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-(--border) px-3 py-1.5 text-xs font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>

              <span className="text-xs font-medium text-(--text-muted)">
                Pagina {currentPage} de {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-(--border) px-3 py-1.5 text-xs font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {detailModalOpen && selectedCustomer ? (
        <div className="fixed inset-0 z-40 grid place-items-center p-4">
          <button
            type="button"
            aria-label="Cerrar modal detalle"
            onClick={closeDetailModal}
            className="absolute inset-0 bg-[#0f2749]/45"
          />
          <section className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-(--border) bg-(--surface) p-5 shadow-2xl lg:p-6">
            <header className="mb-4 flex items-start justify-between gap-4 border-b border-(--border) pb-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Detalle de cliente
                </h2>
                <p className="text-sm text-(--text-muted)">
                  {selectedCustomer.nombreCompleto} · {selectedCustomer.id}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDetailModal}
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
                    <span className="font-medium">Nombre:</span>{" "}
                    {selectedCustomer.nombreCompleto}
                  </p>
                  <p className="text-sm text-foreground">
                    <span className="font-medium">DUI:</span> {selectedCustomer.dui}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-(--border) bg-(--surface-soft) p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
                  Contacto
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Telefono:</span>{" "}
                    {selectedCustomer.telefono}
                  </p>
                  <p className="text-sm text-foreground sm:col-span-2">
                    <span className="font-medium">Direccion:</span>{" "}
                    {selectedCustomer.direccion}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-(--border) bg-(--surface-soft) p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
                  Registro y cuenta
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Fecha de registro:</span>{" "}
                    {formatDate(selectedCustomer.fechaRegistro)}
                  </p>
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Estado:</span>{" "}
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${getStatusStyles(
                        selectedCustomer.estadoCuenta,
                      )}`}
                    >
                      {selectedCustomer.estadoCuenta}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {couponModalOpen && selectedCustomer ? (
        <div className="fixed inset-0 z-40 grid place-items-center p-4">
          <button
            type="button"
            aria-label="Cerrar modal cupones"
            onClick={closeCouponModal}
            className="absolute inset-0 bg-[#0f2749]/45"
          />
          <section className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-(--border) bg-(--surface) p-5 shadow-2xl lg:p-6">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-(--border) pb-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Cupones por estado
                </h2>
                <p className="text-sm text-(--text-muted)">
                  {selectedCustomer.nombreCompleto} · {selectedCustomer.id}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={refreshCustomers}
                  className="rounded-lg border border-(--border) px-2.5 py-1.5 text-sm text-(--text-muted) hover:bg-(--surface-soft)"
                >
                  Actualizar
                </button>
                <button
                  type="button"
                  onClick={closeCouponModal}
                  className="rounded-lg border border-(--border) px-2.5 py-1.5 text-sm text-(--text-muted) hover:bg-(--surface-soft)"
                >
                  Cerrar
                </button>
              </div>
            </header>

            <div className="grid gap-4 lg:grid-cols-3">
              <section className="rounded-xl border border-(--border) bg-(--surface-soft) p-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Disponibles ({availableCoupons.length})
                </h3>
                <div className="space-y-3">
                  {availableCoupons.length === 0 ? (
                    <p className="text-xs text-(--text-muted)">
                      No hay cupones disponibles.
                    </p>
                  ) : (
                    availableCoupons.map((coupon) => (
                      <article
                        key={coupon.id}
                        className="rounded-lg border border-(--border) bg-(--surface) p-3"
                      >
                        <p className="text-sm font-medium text-foreground">
                          {coupon.tituloOferta}
                        </p>
                        <p className="mt-1 text-xs text-(--text-muted)">
                          Codigo: {coupon.codigo}
                        </p>
                        <p className="mt-1 text-xs text-(--text-muted)">
                          Expira: {formatDate(coupon.fechaExpiracion)}
                        </p>
                        <span
                          className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${getCouponStatusStyles(
                            coupon.estado,
                          )}`}
                        >
                          {coupon.estado}
                        </span>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-(--border) bg-(--surface-soft) p-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Canjeados ({redeemedCoupons.length})
                </h3>
                <div className="space-y-3">
                  {redeemedCoupons.length === 0 ? (
                    <p className="text-xs text-(--text-muted)">
                      No hay cupones canjeados.
                    </p>
                  ) : (
                    redeemedCoupons.map((coupon) => (
                      <article
                        key={coupon.id}
                        className="rounded-lg border border-(--border) bg-(--surface) p-3"
                      >
                        <p className="text-sm font-medium text-foreground">
                          {coupon.tituloOferta}
                        </p>
                        <p className="mt-1 text-xs text-(--text-muted)">
                          Codigo: {coupon.codigo}
                        </p>
                        <p className="mt-1 text-xs text-(--text-muted)">
                          Compra: {formatDate(coupon.fechaCompra)}
                        </p>
                        <span
                          className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${getCouponStatusStyles(
                            coupon.estado,
                          )}`}
                        >
                          {coupon.estado}
                        </span>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-(--border) bg-(--surface-soft) p-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Vencidos ({expiredCoupons.length})
                </h3>
                <div className="space-y-3">
                  {expiredCoupons.length === 0 ? (
                    <p className="text-xs text-(--text-muted)">
                      No hay cupones vencidos.
                    </p>
                  ) : (
                    expiredCoupons.map((coupon) => (
                      <article
                        key={coupon.id}
                        className="rounded-lg border border-(--border) bg-(--surface) p-3"
                      >
                        <p className="text-sm font-medium text-foreground">
                          {coupon.tituloOferta}
                        </p>
                        <p className="mt-1 text-xs text-(--text-muted)">
                          Codigo: {coupon.codigo}
                        </p>
                        <p className="mt-1 text-xs text-(--text-muted)">
                          Expirado: {formatDate(coupon.fechaExpiracion)}
                        </p>
                        <span
                          className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${getCouponStatusStyles(
                            coupon.estado,
                          )}`}
                        >
                          {coupon.estado}
                        </span>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

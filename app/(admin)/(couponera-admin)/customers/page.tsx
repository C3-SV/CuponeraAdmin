"use client";

import { useEffect, useMemo, useState } from "react";

type CustomerStatus = "activa" | "inactiva";
type CouponStatus = "disponible" | "canjeado" | "vencido";

type Customer = {
  id: string;
  nombreCompleto: string;
  correo: string;
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

const mockCustomers: Customer[] = [
  {
    id: "CLI-001",
    nombreCompleto: "Andrea Perez",
    correo: "andrea.perez@mail.com",
    telefono: "+503 7012-3301",
    dui: "04561234-8",
    direccion: "Colonia Escalon, San Salvador",
    fechaRegistro: "2026-02-10",
    estadoCuenta: "activa",
  },
  {
    id: "CLI-002",
    nombreCompleto: "Carlos Rodriguez",
    correo: "carlos.rodriguez@mail.com",
    telefono: "+503 7820-4418",
    dui: "03894567-2",
    direccion: "Santa Tecla, La Libertad",
    fechaRegistro: "2026-01-18",
    estadoCuenta: "inactiva",
  },
  {
    id: "CLI-003",
    nombreCompleto: "Daniela Molina",
    correo: "daniela.molina@mail.com",
    telefono: "+503 7953-1820",
    dui: "05127893-4",
    direccion: "Soyapango, San Salvador",
    fechaRegistro: "2026-03-02",
    estadoCuenta: "activa",
  },
  {
    id: "CLI-004",
    nombreCompleto: "Fernando Rivera",
    correo: "fernando.rivera@mail.com",
    telefono: "+503 7114-9055",
    dui: "06348952-1",
    direccion: "San Miguel, San Miguel",
    fechaRegistro: "2025-12-22",
    estadoCuenta: "activa",
  },
];

const mockCouponsByCustomer: Record<string, CustomerCoupon[]> = {
  "CLI-001": [
    {
      id: "CP-9001",
      tituloOferta: "2x1 en Pizza Familiar",
      codigo: "PZZA-22A1",
      fechaCompra: "2026-03-20",
      fechaExpiracion: "2026-04-20",
      estado: "disponible",
    },
    {
      id: "CP-9002",
      tituloOferta: "Descuento Spa 40%",
      codigo: "SPA-19K0",
      fechaCompra: "2026-02-15",
      fechaExpiracion: "2026-03-15",
      estado: "canjeado",
    },
    {
      id: "CP-9003",
      tituloOferta: "Combo Sushi Premium",
      codigo: "SSHI-73B4",
      fechaCompra: "2026-01-10",
      fechaExpiracion: "2026-02-10",
      estado: "vencido",
    },
  ],
  "CLI-002": [
    {
      id: "CP-9010",
      tituloOferta: "Lavado Full de Vehiculo",
      codigo: "AUTO-10Q1",
      fechaCompra: "2026-03-01",
      fechaExpiracion: "2026-04-01",
      estado: "disponible",
    },
    {
      id: "CP-9011",
      tituloOferta: "Hamburguesa Artesanal",
      codigo: "BURG-67L2",
      fechaCompra: "2026-01-08",
      fechaExpiracion: "2026-02-08",
      estado: "vencido",
    },
  ],
  "CLI-003": [
    {
      id: "CP-9020",
      tituloOferta: "Entrada Cine + Palomitas",
      codigo: "CINE-80R4",
      fechaCompra: "2026-03-12",
      fechaExpiracion: "2026-04-12",
      estado: "disponible",
    },
    {
      id: "CP-9021",
      tituloOferta: "Menu Ejecutivo",
      codigo: "MNU-55X8",
      fechaCompra: "2026-03-05",
      fechaExpiracion: "2026-04-05",
      estado: "canjeado",
    },
  ],
  "CLI-004": [
    {
      id: "CP-9030",
      tituloOferta: "Pase de Gimnasio Mensual",
      codigo: "GYM-11P9",
      fechaCompra: "2026-02-03",
      fechaExpiracion: "2026-03-03",
      estado: "vencido",
    },
    {
      id: "CP-9031",
      tituloOferta: "Mantenimiento Preventivo",
      codigo: "CAR-88T3",
      fechaCompra: "2026-03-21",
      fechaExpiracion: "2026-04-21",
      estado: "disponible",
    },
  ],
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

export default function CustomersPage() {
  const [customers] = useState<Customer[]>(mockCustomers);
  const [couponsByCustomer] = useState<Record<string, CustomerCoupon[]>>(
    mockCouponsByCustomer,
  );
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [couponModalOpen, setCouponModalOpen] = useState(false);

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
              {customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-sm text-(--text-muted)"
                  >
                    No hay clientes para mostrar.
                  </td>
                </tr>
              ) : null}

              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-(--surface-soft)/70">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground">
                      {customer.nombreCompleto}
                    </p>
                    <p className="text-xs text-(--text-muted)">{customer.id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-foreground">{customer.correo}</p>
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
                    <span className="font-medium">Correo:</span> {selectedCustomer.correo}
                  </p>
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
              <button
                type="button"
                onClick={closeCouponModal}
                className="rounded-lg border border-(--border) px-2.5 py-1.5 text-sm text-(--text-muted) hover:bg-(--surface-soft)"
              >
                Cerrar
              </button>
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

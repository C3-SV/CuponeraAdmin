"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  approveOffer,
  discardOffer,
  listOffers,
  rejectOffer,
} from "@/app/(admin)/(couponera-admin)/offers-review/actions";
import type {
  OfferCompanyOption,
  OfferListItem,
  OfferQueryParams,
  OfferSortBy,
  OfferStateFilter,
  OffersListResponse,
} from "@/lib/offers/types";

type OffersReviewProps = {
  initialList: OffersListResponse;
  companies: OfferCompanyOption[];
};

const DEFAULT_QUERY: OfferQueryParams = {
  search: "",
  companyId: "",
  state: "PENDING",
  sortBy: "created_at",
  sortDir: "desc",
  page: 1,
  pageSize: 10,
};

const STATE_OPTIONS: { value: OfferStateFilter; label: string }[] = [
  { value: "ALL", label: "Todas no descartadas" },
  { value: "PENDING", label: "En espera de aprobacion" },
  { value: "APPROVED_FUTURE", label: "Aprobadas futuras" },
  { value: "ACTIVE", label: "Activas" },
  { value: "PAST", label: "Pasadas" },
  { value: "REJECTED", label: "Rechazadas" },
  { value: "DISCARDED", label: "Descartadas" },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStateLabel(offer: OfferListItem): string {
  if (offer.offer_status === "DISCARDED") {
    return "Descartada";
  }

  if (offer.offer_status === "PENDING") {
    return "En espera";
  }

  if (offer.offer_status === "REJECTED") {
    return "Rechazada";
  }

  const today = new Date().toISOString().slice(0, 10);

  if (offer.offer_start_date > today) {
    return "Aprobada futura";
  }

  if (offer.offer_end_date < today) {
    return "Pasada";
  }

  return "Activa";
}

function getStateStyles(offer: OfferListItem): string {
  if (offer.offer_status === "DISCARDED") {
    return "bg-slate-100 text-slate-700";
  }

  if (offer.offer_status === "PENDING") {
    return "bg-amber-100 text-amber-700";
  }

  if (offer.offer_status === "REJECTED") {
    return "bg-red-100 text-red-700";
  }

  const today = new Date().toISOString().slice(0, 10);

  if (offer.offer_start_date > today) {
    return "bg-sky-100 text-sky-700";
  }

  if (offer.offer_end_date < today) {
    return "bg-zinc-100 text-zinc-700";
  }

  return "bg-green-100 text-green-700";
}

function getSortIndicator(field: OfferSortBy, query: OfferQueryParams): string {
  if (query.sortBy !== field) {
    return "\u2195";
  }

  return query.sortDir === "asc" ? "\u2191" : "\u2193";
}

export function OffersReview({ initialList, companies }: OffersReviewProps) {
  const [query, setQuery] = useState<OfferQueryParams>({
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
  const [selectedOffer, setSelectedOffer] = useState<OfferListItem | null>(null);

  const queryRef = useRef<OfferQueryParams>({
    ...DEFAULT_QUERY,
    page: initialList.page,
    pageSize: initialList.pageSize,
  });
  const searchInitializedRef = useRef(false);
  const latestRequestIdRef = useRef(0);

  const selectedCompany = useMemo(
    () =>
      companies.find((company) => company.company_id === query.companyId) ?? null,
    [companies, query.companyId],
  );
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(listResult.total / query.pageSize)),
    [listResult.total, query.pageSize],
  );

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const loadOfferList = useCallback(async (nextQuery: OfferQueryParams) => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    setIsTableLoading(true);

    try {
      const response = await listOffers(nextQuery);

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
          : "No fue posible cargar ofertas.",
      );
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsTableLoading(false);
      }
    }
  }, []);

  const applyQueryPatch = useCallback(
    async (patch: Partial<OfferQueryParams>): Promise<void> => {
      const nextQuery = { ...queryRef.current, ...patch };
      queryRef.current = nextQuery;
      setQuery(nextQuery);
      await loadOfferList(nextQuery);
    },
    [loadOfferList],
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
  }, [applyQueryPatch, searchInput]);

  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedOffer(null);
      }
    }

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  async function refreshCurrentList() {
    await loadOfferList(queryRef.current);
  }

  async function handleSort(sortBy: OfferSortBy) {
    const nextSortDir =
      query.sortBy === sortBy && query.sortDir === "asc" ? "desc" : "asc";
    await applyQueryPatch({ sortBy, sortDir: nextSortDir, page: 1 });
  }

  async function handleApproveOffer(offer: OfferListItem) {
    const confirmation = await Swal.fire({
      icon: "question",
      title: "Aprobar oferta",
      text: `Se aprobara "${offer.offer_title}". Puedes dejar un comentario opcional.`,
      input: "textarea",
      inputPlaceholder: "Comentario opcional para la empresa",
      showCancelButton: true,
      confirmButtonText: "Aprobar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#0f3d78",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    const result = await approveOffer(
      offer.offer_id,
      String(confirmation.value ?? ""),
    );

    if (!result.ok) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo aprobar",
        text: result.message,
        confirmButtonColor: "#0f3d78",
      });
      return;
    }

    await refreshCurrentList();
    await Swal.fire({
      icon: "success",
      title: "Oferta aprobada",
      text: result.message,
      confirmButtonColor: "#0f3d78",
    });
  }

  async function handleRejectOffer(offer: OfferListItem) {
    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Rechazar oferta",
      text: `Agrega el comentario de rechazo para "${offer.offer_title}".`,
      input: "textarea",
      inputValue: offer.offer_rejection_reason ?? "",
      inputPlaceholder: "Ej: Falta especificar restricciones de uso.",
      inputValidator: (value) =>
        value.trim().length >= 5
          ? null
          : "El comentario debe tener al menos 5 caracteres.",
      showCancelButton: true,
      confirmButtonText: "Rechazar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#0f3d78",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    const result = await rejectOffer(
      offer.offer_id,
      String(confirmation.value ?? ""),
    );

    if (!result.ok) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo rechazar",
        text: result.message,
        confirmButtonColor: "#0f3d78",
      });
      return;
    }

    await refreshCurrentList();
    await Swal.fire({
      icon: "success",
      title: "Oferta rechazada",
      text: result.message,
      confirmButtonColor: "#0f3d78",
    });
  }

  async function handleDiscardOffer(offer: OfferListItem) {
    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Descartar oferta",
      text: `Esta accion quitara "${offer.offer_title}" de los listados activos.`,
      showCancelButton: true,
      confirmButtonText: "Si, descartar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#e26721",
      cancelButtonColor: "#0f3d78",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    const result = await discardOffer(offer.offer_id);

    if (!result.ok) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo descartar",
        text: result.message,
        confirmButtonColor: "#0f3d78",
      });
      return;
    }

    const nextPage =
      listResult.data.length === 1 && query.page > 1 ? query.page - 1 : query.page;
    const nextQuery = { ...queryRef.current, page: nextPage };
    queryRef.current = nextQuery;
    setQuery(nextQuery);
    await loadOfferList(nextQuery);

    await Swal.fire({
      icon: "success",
      title: "Oferta descartada",
      text: result.message,
      confirmButtonColor: "#0f3d78",
    });
  }

  return (
    <>
      <section className="space-y-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_6px_14px_-12px_rgba(15,23,42,0.24)] lg:p-7">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Revision de ofertas
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Gestiona promociones por empresa y estado: pendientes, futuras,
            activas, pasadas, rechazadas y descartadas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Buscar oferta..."
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none sm:w-[260px]"
          />

          <select
            value={query.companyId}
            onChange={(event) =>
              void applyQueryPatch({ companyId: event.target.value, page: 1 })
            }
            className="h-10 rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none"
          >
            <option value="">Todas las empresas</option>
            {companies.map((company) => (
              <option key={company.company_id} value={company.company_id}>
                {company.company_name}
              </option>
            ))}
          </select>

          <select
            value={query.state}
            onChange={(event) =>
              void applyQueryPatch({
                state: event.target.value as OfferStateFilter,
                page: 1,
              })
            }
            className="h-10 rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none"
          >
            {STATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="ml-auto inline-flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
            Mostrar
            <select
              value={query.pageSize}
              onChange={(event) =>
                void applyQueryPatch({
                  pageSize: Number(event.target.value),
                  page: 1,
                })
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

        {selectedCompany ? (
          <p className="text-xs text-[var(--text-muted)]">
            Empresa seleccionada:{" "}
            <span className="font-medium text-[var(--text-primary)]">
              {selectedCompany.company_name}
            </span>
          </p>
        ) : null}

        {listError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {listError}
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="min-w-full divide-y divide-[var(--border)] bg-white">
            <thead className="bg-[var(--surface-soft)]">
              <tr>
                {[
                  ["offer_title", "Oferta"],
                  ["company_name", "Empresa"],
                  ["offer_price", "Precio"],
                  ["offer_start_date", "Inicio"],
                  ["offer_end_date", "Fin"],
                  ["created_at", "Creada"],
                ].map(([field, label]) => (
                  <th
                    key={field}
                    className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]"
                  >
                    <div className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
                      <span>{label}</span>
                      <button
                        type="button"
                        onClick={() => void handleSort(field as OfferSortBy)}
                        className="inline-flex h-5 w-5 items-center justify-center rounded text-xs text-[var(--text-muted)] hover:bg-[var(--surface)]"
                        aria-label={`Ordenar por ${label}`}
                      >
                        {getSortIndicator(field as OfferSortBy, query)}
                      </button>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Estado
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Acciones
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
                    Cargando ofertas...
                  </td>
                </tr>
              ) : null}

              {!isTableLoading && listResult.data.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-sm text-[var(--text-muted)]"
                  >
                    No hay ofertas para mostrar.
                  </td>
                </tr>
              ) : null}

              {!isTableLoading
                ? listResult.data.map((offer) => (
                    <tr
                      key={offer.offer_id}
                      className="hover:bg-[var(--surface-soft)]/60"
                    >
                      <td className="max-w-[260px] px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                        <span className="line-clamp-2">{offer.offer_title}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-[var(--text-primary)]">
                        {offer.company_name}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-[var(--text-primary)]">
                        <div>{formatCurrency(offer.offer_price)}</div>
                        <div className="text-xs text-[var(--text-muted)] line-through">
                          {formatCurrency(offer.offer_regular_price)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-[var(--text-muted)]">
                        {formatDate(offer.offer_start_date)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-[var(--text-muted)]">
                        {formatDate(offer.offer_end_date)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-[var(--text-muted)]">
                        {formatDateTime(offer.created_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-lg px-2 py-1 text-xs font-medium ${getStateStyles(
                            offer,
                          )}`}
                        >
                          {getStateLabel(offer)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const isApproved = offer.offer_status === "APPROVED";
                          const isRejected = offer.offer_status === "REJECTED";
                          const isDiscarded = offer.offer_status === "DISCARDED";

                          const showApprove = !isApproved && !isDiscarded;
                          const showReject = !isRejected && !isDiscarded;
                          const showDiscard = !isDiscarded;

                          const buttonBaseClass =
                            "w-full rounded-lg px-2 py-1.5 text-[11px] font-medium leading-none whitespace-nowrap";

                          return (
                            <div className="mx-auto flex w-[110px] flex-col gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedOffer(offer)}
                                className={`${buttonBaseClass} border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-soft)]`}
                              >
                                Detalle
                              </button>

                              {showApprove ? (
                                <button
                                  type="button"
                                  onClick={() => void handleApproveOffer(offer)}
                                  className={`${buttonBaseClass} bg-green-600 text-white hover:bg-green-700`}
                                >
                                  Aprobar
                                </button>
                              ) : null}

                              {showReject ? (
                                <button
                                  type="button"
                                  onClick={() => void handleRejectOffer(offer)}
                                  className={`${buttonBaseClass} bg-red-600 text-white hover:bg-red-700`}
                                >
                                  Rechazar
                                </button>
                              ) : null}

                              {showDiscard ? (
                                <button
                                  type="button"
                                  onClick={() => void handleDiscardOffer(offer)}
                                  className={`${buttonBaseClass} bg-[var(--brand-orange)] text-white hover:bg-[var(--brand-orange-strong)]`}
                                >
                                  Descartar
                                </button>
                              ) : null}
                            </div>
                          );
                        })()}
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
              onClick={() =>
                void applyQueryPatch({ page: Math.max(1, query.page - 1) })
              }
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

      {selectedOffer ? (
        <div className="fixed inset-0 z-40 grid place-items-center p-4">
          <button
            type="button"
            onClick={() => setSelectedOffer(null)}
            aria-label="Cerrar detalle de oferta"
            className="absolute inset-0 bg-[#0f2749]/45"
          />
          <section className="relative z-10 w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_18px_36px_-22px_rgba(15,23,42,0.35)] lg:p-6">
            <header className="mb-4 flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  {selectedOffer.offer_title}
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  {selectedOffer.company_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOffer(null)}
                className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
              >
                Cerrar
              </button>
            </header>

            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                <p className="text-sm text-[var(--text-primary)]">
                  {selectedOffer.offer_description}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--border)] p-3 text-sm">
                  <p className="text-[var(--text-muted)]">Precio regular</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {formatCurrency(selectedOffer.offer_regular_price)}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] p-3 text-sm">
                  <p className="text-[var(--text-muted)]">Precio oferta</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {formatCurrency(selectedOffer.offer_price)}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] p-3 text-sm">
                  <p className="text-[var(--text-muted)]">Vigencia de oferta</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {formatDate(selectedOffer.offer_start_date)} -{" "}
                    {formatDate(selectedOffer.offer_end_date)}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] p-3 text-sm">
                  <p className="text-[var(--text-muted)]">Uso del cupon hasta</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {formatDate(selectedOffer.coupon_usage_deadline)}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] p-3 text-sm">
                  <p className="text-[var(--text-muted)]">Cantidad limite</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {selectedOffer.coupon_quantity_limit ?? "Sin limite definido"}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] p-3 text-sm">
                  <p className="text-[var(--text-muted)]">Estado</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {getStateLabel(selectedOffer)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Comentario de revision
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {selectedOffer.offer_rejection_reason ||
                    "Sin comentario registrado."}
                </p>
                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  Revisada:{" "}
                  {selectedOffer.reviewed_at
                    ? formatDateTime(selectedOffer.reviewed_at)
                    : "Pendiente de revision"}
                </p>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
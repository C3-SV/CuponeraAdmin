"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  createCompanyAdmin,
  getCompanyAdminDetail,
  listCompanyAdminAssignments,
  removeCompanyAdmin,
  updateCompanyAdmin,
} from "@/app/(admin)/(couponera-admin)/company-admin-assignment/actions";
import type {
  CompanyAdminAssignmentListItem,
  CompanyAdminAssignmentListResponse,
  CompanyAdminAssignmentQueryParams,
  CompanyAdminDetail,
  CompanyAdminUpdateInput,
} from "@/lib/company-admin-assignment/types";
import {
  normalizeCompanyAdminCreateInput,
  normalizeCompanyAdminUpdateInput,
  validateCompanyAdminCreateInput,
  validateCompanyAdminUpdateInput,
} from "@/lib/company-admin-assignment/validation";

type CompanyAdminAssignmentCrudProps = {
  initialList: CompanyAdminAssignmentListResponse;
};

type FormMode = "create" | "edit";
type AdminFormValues = {
  first_names: string;
  last_names: string;
  email: string;
  phone: string;
  password: string;
  user_is_active: boolean;
};
type AdminFormErrors = Partial<
  Record<"first_names" | "last_names" | "email" | "phone" | "password", string>
>;

const DEFAULT_QUERY: CompanyAdminAssignmentQueryParams = {
  search: "",
  sortBy: "company_name",
  sortDir: "asc",
  page: 1,
  pageSize: 10,
};

const EMPTY_FORM: AdminFormValues = {
  first_names: "",
  last_names: "",
  email: "",
  phone: "",
  password: "",
  user_is_active: true,
};

// Devuelve el indicador visual de orden para cada columna sortable.
function getSortIndicator(
  field: CompanyAdminAssignmentQueryParams["sortBy"],
  query: CompanyAdminAssignmentQueryParams,
): string {
  if (query.sortBy !== field) {
    return "\u2195";
  }
  return query.sortDir === "asc" ? "\u2191" : "\u2193";
}

// Icono para accion de detalle.
function DetailIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-3.5 w-3.5"
    >
      <circle cx="10" cy="10" r="7" />
      <line x1="10" y1="8.3" x2="10" y2="13.4" />
      <circle cx="10" cy="5.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Icono para accion de asignar administrador.
function UserIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-3.5 w-3.5"
    >
      <circle cx="10" cy="6.6" r="3" />
      <path d="M4.6 15.6a5.4 5.4 0 0 1 10.8 0" />
    </svg>
  );
}

// Icono para accion de editar.
function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-3.5 w-3.5"
    >
      <path d="M13.9 3.6a2 2 0 0 1 2.8 2.8l-8.4 8.4-3.4.6.6-3.4 8.4-8.4Z" />
      <path d="m12.5 5 2.5 2.5" />
    </svg>
  );
}

// Icono para accion de eliminar/desasignar.
function DeleteIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-3.5 w-3.5"
    >
      <path d="M3.8 5.8h12.4" />
      <path d="M7.2 5.8V4.5a1 1 0 0 1 1-1h3.6a1 1 0 0 1 1 1v1.3" />
      <path d="M5.9 5.8v9.2a1 1 0 0 0 1 1h6.2a1 1 0 0 0 1-1V5.8" />
      <path d="M8.5 8.4v5.1M11.5 8.4v5.1" />
    </svg>
  );
}

// Icono estandar de cierre para modales.
function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className="h-4 w-4"
    >
      <path d="m5.5 5.5 9 9M14.5 5.5l-9 9" />
    </svg>
  );
}

// Toggle reutilizable de estado activo/inactivo.
function StatusToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <span
        className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
          checked ? "bg-[var(--brand-blue)]" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </span>
      <span className="text-sm font-medium text-[var(--text-primary)]">
        {checked ? "Activo" : "Inactivo"}
      </span>
    </label>
  );
}

// Formatea timestamps para presentacion local.
function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function CompanyAdminAssignmentCrud({
  initialList,
}: CompanyAdminAssignmentCrudProps) {
  // Estado de query y tabla principal.
  const [query, setQuery] = useState<CompanyAdminAssignmentQueryParams>({
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

  // Estado del modal crear/editar admin.
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [selectedCompany, setSelectedCompany] =
    useState<CompanyAdminAssignmentListItem | null>(null);
  const [formValues, setFormValues] = useState<AdminFormValues>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<AdminFormErrors>({});
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // Estado del modal de detalle.
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<CompanyAdminDetail | null>(null);

  // Refs para debounce y control de concurrencia entre requests.
  const searchInitializedRef = useRef(false);
  const queryRef = useRef<CompanyAdminAssignmentQueryParams>({
    ...DEFAULT_QUERY,
    page: initialList.page,
    pageSize: initialList.pageSize,
  });
  const latestRequestIdRef = useRef(0);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(listResult.total / query.pageSize)),
    [listResult.total, query.pageSize],
  );

  // Mantiene queryRef sincronizado para usarlo dentro de callbacks async.
  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  // Carga de datos con guard de request-id para evitar race conditions.
  const loadAssignments = useCallback(
    async (nextQuery: CompanyAdminAssignmentQueryParams) => {
      const requestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = requestId;
      setIsTableLoading(true);

      try {
        const response = await listCompanyAdminAssignments(nextQuery);
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
            : "No fue posible cargar asignaciones.",
        );
      } finally {
        if (requestId === latestRequestIdRef.current) {
          setIsTableLoading(false);
        }
      }
    },
    [],
  );

  // Aplica cambios parciales en query y refresca tabla.
  const applyQueryPatch = useCallback(
    async (patch: Partial<CompanyAdminAssignmentQueryParams>) => {
      const nextQuery = { ...queryRef.current, ...patch };
      queryRef.current = nextQuery;
      setQuery(nextQuery);
      await loadAssignments(nextQuery);
    },
    [loadAssignments],
  );

  // Debounce de busqueda para evitar request por cada tecla.
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

  // Resetea formulario/modal a estado limpio.
  function resetFormState() {
    setFormValues(EMPTY_FORM);
    setFormErrors({});
    setSelectedCompany(null);
  }

  // Abre modal para asignar admin en empresa sin asignacion.
  function openCreateModal(company: CompanyAdminAssignmentListItem) {
    setFormMode("create");
    setSelectedCompany(company);
    setFormValues({
      ...EMPTY_FORM,
      user_is_active: true,
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  }

  // Abre modal de edicion con datos actuales del admin.
  async function openEditModal(company: CompanyAdminAssignmentListItem) {
    if (!company.assigned_admin) {
      return;
    }

    const detailResult = await getCompanyAdminDetail(company.company_id);
    if (!detailResult.ok || !detailResult.data?.assigned_admin) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo cargar el contacto",
        text: detailResult.message,
        confirmButtonColor: "#0f3d78",
      });
      return;
    }

    setFormMode("edit");
    setSelectedCompany(company);
    setFormValues({
      first_names: detailResult.data.assigned_admin.first_names,
      last_names: detailResult.data.assigned_admin.last_names,
      email: detailResult.data.assigned_admin.email ?? "",
      phone: detailResult.data.assigned_admin.phone ?? "",
      password: "",
      user_is_active: detailResult.data.assigned_admin.user_is_active,
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  }

  // Cierra modal de formulario.
  function closeFormModal() {
    setIsFormModalOpen(false);
  }

  // Cierra modal de detalle.
  function closeDetailModal() {
    setIsDetailModalOpen(false);
  }

  // Carga detalle de empresa/admin para mostrar en modal.
  async function openDetailModal(companyId: string) {
    setIsDetailModalOpen(true);
    setIsDetailLoading(true);
    setDetailData(null);

    const result = await getCompanyAdminDetail(companyId);
    setIsDetailLoading(false);

    if (!result.ok || !result.data) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: result.message,
        confirmButtonColor: "#0f3d78",
      });
      setIsDetailModalOpen(false);
      return;
    }

    setDetailData(result.data);
  }

  // Actualiza valores del form y limpia errores del campo editado.
  function handleFormValueChange<K extends keyof AdminFormValues>(
    key: K,
    value: AdminFormValues[K],
  ) {
    setFormValues((previous) => ({ ...previous, [key]: value }));
    if (formErrors[key as keyof AdminFormErrors]) {
      setFormErrors((previous) => ({ ...previous, [key]: undefined }));
    }
  }

  // Alterna orden asc/desc para la columna seleccionada.
  async function handleSort(sortBy: CompanyAdminAssignmentQueryParams["sortBy"]) {
    const nextSortDir =
      query.sortBy === sortBy && query.sortDir === "asc" ? "desc" : "asc";
    await applyQueryPatch({ sortBy, sortDir: nextSortDir, page: 1 });
  }

  // Orquesta submit de crear o editar admin con validaciones.
  async function handleSubmitForm(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedCompany) {
      return;
    }

    setIsFormSubmitting(true);

    if (formMode === "create") {
      const normalized = normalizeCompanyAdminCreateInput({
        first_names: formValues.first_names,
        last_names: formValues.last_names,
        email: formValues.email,
        phone: formValues.phone,
        password: formValues.password,
        user_is_active: formValues.user_is_active,
      });

      const validation = validateCompanyAdminCreateInput(normalized);
      if (!validation.isValid) {
        setFormErrors(validation.errors);
        setIsFormSubmitting(false);
        await Swal.fire({
          icon: "warning",
          title: "Formulario incompleto",
          text: "Revisa los campos marcados y vuelve a intentar.",
          confirmButtonColor: "#0f3d78",
        });
        return;
      }

      const result = await createCompanyAdmin(selectedCompany.company_id, normalized);
      setIsFormSubmitting(false);

      if (!result.ok) {
        await Swal.fire({
          icon: "error",
          title: "Operación fallida",
          text: result.message,
          confirmButtonColor: "#0f3d78",
        });
        return;
      }

      setIsFormModalOpen(false);
      resetFormState();
      await loadAssignments(queryRef.current);

      await Swal.fire({
        icon: "success",
        title: "Contacto asignado",
        text: result.message,
        confirmButtonColor: "#0f3d78",
      });
      return;
    }

    const normalized: CompanyAdminUpdateInput = normalizeCompanyAdminUpdateInput({
      first_names: formValues.first_names,
      last_names: formValues.last_names,
      email: formValues.email,
      phone: formValues.phone,
      user_is_active: formValues.user_is_active,
    });
    const validation = validateCompanyAdminUpdateInput(normalized);

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      setIsFormSubmitting(false);
      await Swal.fire({
        icon: "warning",
        title: "Formulario incompleto",
        text: "Revisa los campos marcados y vuelve a intentar.",
        confirmButtonColor: "#0f3d78",
      });
      return;
    }

    const adminUserId = selectedCompany.assigned_admin?.user_id;
    if (!adminUserId) {
      setIsFormSubmitting(false);
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se encontró contacto para editar.",
        confirmButtonColor: "#0f3d78",
      });
      return;
    }

    const result = await updateCompanyAdmin(
      selectedCompany.company_id,
      adminUserId,
      normalized,
    );
    setIsFormSubmitting(false);

    if (!result.ok) {
      await Swal.fire({
        icon: "error",
        title: "Operación fallida",
        text: result.message,
        confirmButtonColor: "#0f3d78",
      });
      return;
    }

    setIsFormModalOpen(false);
    resetFormState();
    await loadAssignments(queryRef.current);

    await Swal.fire({
      icon: "success",
      title: "Contacto actualizado",
      text: result.message,
      confirmButtonColor: "#0f3d78",
    });
  }

  // Desasigna e inactiva un admin existente para habilitar reemplazo.
  async function handleRemoveAdmin(company: CompanyAdminAssignmentListItem) {
    const adminUserId = company.assigned_admin?.user_id;
    if (!adminUserId) {
      return;
    }

    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Quitar contacto",
      text: `Se desasignará al contacto de ${company.company_name} y su cuenta quedará inactiva.`,
      showCancelButton: true,
      confirmButtonText: "Sí, desasignar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#0f3d78",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    const result = await removeCompanyAdmin(company.company_id, adminUserId);
    if (!result.ok) {
      await Swal.fire({
        icon: "error",
        title: "Operación fallida",
        text: result.message,
        confirmButtonColor: "#0f3d78",
      });
      return;
    }

    await loadAssignments(queryRef.current);
    await Swal.fire({
      icon: "success",
      title: "Contacto desasignado",
      text: result.message,
      confirmButtonColor: "#0f3d78",
    });
  }

  return (
    <>
      {/** Panel principal de asignacion de administradores por empresa. */}
      <section className="space-y-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_6px_14px_-12px_rgba(15,23,42,0.24)] lg:p-7">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Asignación de Contactos de Empresa
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Vincula y administra los contactos responsables por empresa.
          </p>
        </div>

        {/** Toolbar: busqueda y control de tamano de pagina. */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Buscar por empresa o codigo..."
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none sm:w-[300px]"
          />

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

        {listError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {listError}
          </div>
        ) : null}

        {/** Tabla de empresas con su estado de asignacion de admin. */}
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="min-w-full divide-y divide-[var(--border)] bg-white">
            <thead className="bg-[var(--surface-soft)]">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  <div className="inline-flex items-center gap-1 whitespace-nowrap">
                    <span>Codigo</span>
                    <button
                      type="button"
                      onClick={() => void handleSort("company_code")}
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-xs text-[var(--text-muted)] hover:bg-[var(--surface)]"
                    >
                      {getSortIndicator("company_code", query)}
                    </button>
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
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
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  <div className="inline-flex items-center gap-1 whitespace-nowrap">
                    <span>Contacto asignado</span>
                    <button
                      type="button"
                      onClick={() => void handleSort("assigned_admin")}
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-xs text-[var(--text-muted)] hover:bg-[var(--surface)]"
                    >
                      {getSortIndicator("assigned_admin", query)}
                    </button>
                  </div>
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
                    colSpan={4}
                    className="px-4 py-6 text-center text-sm text-[var(--text-muted)]"
                  >
                    Cargando asignaciones...
                  </td>
                </tr>
              ) : null}

              {!isTableLoading && listResult.data.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-sm text-[var(--text-muted)]"
                  >
                    No hay empresas para mostrar.
                  </td>
                </tr>
              ) : null}

              {!isTableLoading
                ? listResult.data.map((row) => (
                    <tr key={row.company_id} className="hover:bg-[var(--surface-soft)]/60">
                      <td className="px-4 py-3 text-center text-sm font-medium text-[var(--text-primary)]">
                        {row.company_code}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-[var(--text-primary)]">
                        {row.company_name}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-[var(--text-primary)]">
                        {row.assigned_admin ? (
                          <span>
                            {row.assigned_admin.full_name}{" "}
                            {!row.assigned_admin.user_is_active ? "(Inactivo)" : ""}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">Sin contacto</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          {row.assigned_admin ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void openDetailModal(row.company_id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-soft)]"
                              >
                                <DetailIcon />
                                Detalle
                              </button>
                              <button
                                type="button"
                                onClick={() => void openEditModal(row)}
                                className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand-blue)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-strong)]"
                              >
                                <EditIcon />
                                Editar contacto
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleRemoveAdmin(row)}
                                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                              >
                                <DeleteIcon />
                                Eliminar
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openCreateModal(row)}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                            >
                              <UserIcon />
                              Asignar contacto
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>

        {/** Footer de paginacion y total de registros mostrados. */}
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

      {/** Modal de crear/editar contacto de empresa. */}
      {isFormModalOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center p-4">
          <button
            type="button"
            onClick={closeFormModal}
            aria-label="Cerrar modal de formulario"
            className="absolute inset-0 bg-[#0f2749]/45"
          />
          <section className="relative z-10 w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_18px_36px_-22px_rgba(15,23,42,0.35)] lg:p-6">
            <header className="mb-4 flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  {formMode === "create"
                    ? "Asignar contacto de empresa"
                    : "Editar contacto de empresa"}
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Empresa: {selectedCompany?.company_name}
                </p>
              </div>
              <button
                type="button"
                onClick={closeFormModal}
                aria-label="Cerrar modal de formulario"
                className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
              >
                <CloseIcon />
              </button>
            </header>

            <form className="space-y-4" onSubmit={handleSubmitForm}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    Nombres
                  </span>
                  <input
                    type="text"
                    value={formValues.first_names}
                    onChange={(event) =>
                      handleFormValueChange("first_names", event.target.value)
                    }
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none"
                  />
                  {formErrors.first_names ? (
                    <p className="text-xs text-red-600">{formErrors.first_names}</p>
                  ) : null}
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    Apellidos
                  </span>
                  <input
                    type="text"
                    value={formValues.last_names}
                    onChange={(event) =>
                      handleFormValueChange("last_names", event.target.value)
                    }
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none"
                  />
                  {formErrors.last_names ? (
                    <p className="text-xs text-red-600">{formErrors.last_names}</p>
                  ) : null}
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    Correo
                  </span>
                  <input
                    type="email"
                    value={formValues.email}
                    onChange={(event) =>
                      handleFormValueChange("email", event.target.value)
                    }
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none"
                  />
                  {formErrors.email ? (
                    <p className="text-xs text-red-600">{formErrors.email}</p>
                  ) : null}
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    Teléfono
                  </span>
                  <input
                    type="tel"
                    value={formValues.phone}
                    onChange={(event) =>
                      handleFormValueChange("phone", event.target.value)
                    }
                    placeholder="+50370000000"
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none"
                  />
                  {formErrors.phone ? (
                    <p className="text-xs text-red-600">{formErrors.phone}</p>
                  ) : null}
                </label>

                {formMode === "create" ? (
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                      Contraseña
                    </span>
                    <input
                      type="password"
                      value={formValues.password}
                      onChange={(event) =>
                        handleFormValueChange("password", event.target.value)
                      }
                      className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none"
                    />
                    {formErrors.password ? (
                      <p className="text-xs text-red-600">{formErrors.password}</p>
                    ) : null}
                  </label>
                ) : null}
              </div>

              <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
                <p className="text-xs font-medium text-[var(--text-muted)]">
                  Estado
                </p>
                <StatusToggle
                  checked={formValues.user_is_active}
                  onChange={(checked) =>
                    handleFormValueChange("user_is_active", checked)
                  }
                />
              </div>

              <footer className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="h-10 rounded-xl border border-[var(--border)] px-4 text-sm text-[var(--text-primary)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isFormSubmitting}
                  className="h-10 rounded-xl bg-[var(--brand-blue)] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isFormSubmitting
                    ? "Guardando..."
                    : formMode === "create"
                      ? "Asignar"
                      : "Guardar cambios"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}

      {/** Modal de detalle para empresa y contacto asignado. */}
      {isDetailModalOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center p-4">
          <button
            type="button"
            onClick={closeDetailModal}
            aria-label="Cerrar modal de detalle"
            className="absolute inset-0 bg-[#0f2749]/45"
          />
          <section className="relative z-10 w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_18px_36px_-22px_rgba(15,23,42,0.35)] lg:p-6">
            <header className="mb-4 flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  Detalle de asignación
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Información de empresa y contacto asignado.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDetailModal}
                aria-label="Cerrar modal de detalle"
                className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
              >
                <CloseIcon />
              </button>
            </header>

            {isDetailLoading ? (
              <p className="text-sm text-[var(--text-muted)]">Cargando detalle...</p>
            ) : null}

            {!isDetailLoading && detailData ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <p className="text-sm text-[var(--text-primary)]">
                    <span className="font-medium">Código:</span> {detailData.company_code}
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-primary)]">
                    <span className="font-medium">Empresa:</span> {detailData.company_name}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  {detailData.assigned_admin ? (
                    <>
                      <p className="text-sm text-[var(--text-primary)]">
                        <span className="font-medium">Contacto:</span>{" "}
                        {detailData.assigned_admin.full_name}
                      </p>
                      <p className="mt-2 text-sm text-[var(--text-primary)]">
                        <span className="font-medium">Estado:</span>{" "}
                        {detailData.assigned_admin.user_is_active
                          ? "Activo"
                          : "Inactivo"}
                      </p>
                      <p className="mt-2 text-sm text-[var(--text-primary)]">
                        <span className="font-medium">Correo:</span>{" "}
                        {detailData.assigned_admin.email ?? "No disponible"}
                      </p>
                      <p className="mt-2 text-sm text-[var(--text-primary)]">
                        <span className="font-medium">Teléfono:</span>{" "}
                        {detailData.assigned_admin.phone ?? "No disponible"}
                      </p>
                      <p className="mt-2 text-sm text-[var(--text-primary)]">
                        <span className="font-medium">Creado:</span>{" "}
                        {formatDate(detailData.assigned_admin.created_at)}
                      </p>
                      <p className="mt-2 text-sm text-[var(--text-primary)]">
                        <span className="font-medium">Última actualización:</span>{" "}
                        {formatDate(detailData.assigned_admin.updated_at)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">
                      Esta empresa aún no tiene contacto asignado.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}

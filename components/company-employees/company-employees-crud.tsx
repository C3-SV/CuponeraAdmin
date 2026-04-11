"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  createCompanyEmployee,
  getCompanyEmployeeDetail,
  listCompanyEmployees,
  setCompanyEmployeeActiveStatus,
  softDeleteCompanyEmployee,
  updateCompanyEmployee,
} from "@/app/(admin)/(company-admin)/company-employees/actions";
import type {
  EmployeeDetail,
  EmployeeFormInput,
  EmployeeListItem,
  EmployeeQueryParams,
  EmployeesListResponse,
} from "@/lib/company-employees/types";
import {
  normalizeEmployeeInput,
  validateEmployeeInput,
  type EmployeeFormErrors,
} from "@/lib/company-employees/validation";
import { formatUserRole } from "@/lib/roles";

type CompanyEmployeesCrudProps = {
  initialList: EmployeesListResponse;
};

type FormMode = "create" | "edit";

const DEFAULT_QUERY: EmployeeQueryParams = {
  search: "",
  status: "all",
  sortBy: "first_names",
  sortDir: "asc",
  page: 1,
  pageSize: 10,
};

const EMPTY_FORM: EmployeeFormInput = {
  email: "",
  password: "",
  first_names: "",
  last_names: "",
  user_is_active: true,
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        active
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

function PlusIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="h-3.5 w-3.5"
    >
      <path d="M10 4v12" />
      <path d="M4 10h12" />
    </svg>
  );
}

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

function DeactivateIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
    >
      <circle cx="10" cy="10" r="7" />
      <path d="m5.2 5.2 9.6 9.6" />
    </svg>
  );
}

function ActivateIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
    >
      <circle cx="10" cy="10" r="7" />
      <path d="m6.7 10.2 2.1 2.1 4.8-5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="h-4 w-4"
    >
      <path d="m5 5 10 10" />
      <path d="M15 5 5 15" />
    </svg>
  );
}

function EmployeesTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <tr key={index} className="animate-pulse">
          <td className="px-4 py-3">
            <div className="h-4 w-36 rounded bg-[var(--surface-soft)]" />
            <div className="mt-2 h-3 w-20 rounded bg-[var(--surface-soft)]" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-36 rounded bg-[var(--surface-soft)]" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-48 rounded bg-[var(--surface-soft)]" />
          </td>
          <td className="px-4 py-3">
            <div className="mx-auto h-6 w-20 rounded-full bg-[var(--surface-soft)]" />
          </td>
          <td className="px-4 py-3">
            <div className="mx-auto flex justify-center gap-2">
              <div className="h-7 w-16 rounded-lg bg-[var(--surface-soft)]" />
              <div className="h-7 w-14 rounded-lg bg-[var(--surface-soft)]" />
              <div className="h-7 w-20 rounded-lg bg-[var(--surface-soft)]" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

function EmployeeDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <div className="h-4 w-52 rounded bg-white" />
      <div className="h-4 w-64 rounded bg-white" />
      <div className="h-4 w-48 rounded bg-white" />
      <div className="h-6 w-24 rounded-full bg-white" />
      <div className="h-4 w-44 rounded bg-white" />
      <div className="h-4 w-44 rounded bg-white" />
    </div>
  );
}

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

export function CompanyEmployeesCrud({ initialList }: CompanyEmployeesCrudProps) {
  const [query, setQuery] = useState<EmployeeQueryParams>({
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
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingEmployee, setEditingEmployee] = useState<EmployeeDetail | null>(
    null,
  );
  const [formValues, setFormValues] = useState<EmployeeFormInput>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<EmployeeFormErrors>({});
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailData, setDetailData] = useState<EmployeeDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const queryRef = useRef<EmployeeQueryParams>({
    ...DEFAULT_QUERY,
    page: initialList.page,
    pageSize: initialList.pageSize,
  });
  const latestRequestIdRef = useRef(0);
  const searchInitializedRef = useRef(false);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(listResult.total / query.pageSize)),
    [listResult.total, query.pageSize],
  );

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const loadEmployees = useCallback(async (nextQuery: EmployeeQueryParams) => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    setIsTableLoading(true);

    try {
      const response = await listCompanyEmployees(nextQuery);
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
          : "No fue posible cargar empleados.",
      );
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsTableLoading(false);
      }
    }
  }, []);

  const applyQueryPatch = useCallback(
    async (patch: Partial<EmployeeQueryParams>): Promise<void> => {
      const nextQuery = { ...queryRef.current, ...patch };
      queryRef.current = nextQuery;
      setQuery(nextQuery);
      await loadEmployees(nextQuery);
    },
    [loadEmployees],
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

  function resetFormState() {
    setFormValues(EMPTY_FORM);
    setFormErrors({});
    setEditingEmployee(null);
  }

  function openCreateModal() {
    resetFormState();
    setFormMode("create");
    setIsFormModalOpen(true);
  }

  function openEditModal(employee: EmployeeListItem) {
    setFormMode("edit");
    setEditingEmployee(employee);
    setFormErrors({});
    setFormValues({
      email: employee.email,
      password: "",
      first_names: employee.first_names,
      last_names: employee.last_names,
      user_is_active: employee.user_is_active,
    });
    setIsFormModalOpen(true);
  }

  function closeFormModal() {
    setIsFormModalOpen(false);
  }

  function closeDetailModal() {
    setIsDetailModalOpen(false);
  }

  function handleFormValueChange<K extends keyof EmployeeFormInput>(
    key: K,
    value: EmployeeFormInput[K],
  ) {
    setFormValues((previous) => ({ ...previous, [key]: value }));
    if (formErrors[key]) {
      setFormErrors((previous) => ({ ...previous, [key]: undefined }));
    }
  }

  async function openDetailModal(userId: string) {
    setIsDetailModalOpen(true);
    setIsDetailLoading(true);
    setDetailData(null);

    const result = await getCompanyEmployeeDetail(userId);
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

  async function handleDeleteEmployee(employee: EmployeeListItem) {
    const nextStatus = !employee.user_is_active;
    const confirmation = await Swal.fire({
      icon: "warning",
      title: nextStatus ? "Activar empleado" : "Desactivar empleado",
      text: `Esta acción ${nextStatus ? "activará" : "desactivará"} a ${employee.first_names} ${employee.last_names}.`,
      showCancelButton: true,
      confirmButtonText: nextStatus ? "Sí, activar" : "Sí, desactivar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: nextStatus ? "#16a34a" : "#e26721",
      cancelButtonColor: "#0f3d78",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    const result = employee.user_is_active
      ? await softDeleteCompanyEmployee(employee.user_id)
      : await setCompanyEmployeeActiveStatus(employee.user_id, true);

    if (!result.ok) {
      await Swal.fire({
        icon: "error",
        title: nextStatus ? "No se pudo activar" : "No se pudo desactivar",
        text: result.message,
        confirmButtonColor: "#0f3d78",
      });
      return;
    }

    const nextPage =
      listResult.data.length === 1 && query.page > 1 ? query.page - 1 : query.page;
    const nextQuery = { ...query, page: nextPage };
    setQuery(nextQuery);
    await loadEmployees(nextQuery);

    await Swal.fire({
      icon: "success",
      title: nextStatus ? "Empleado activado" : "Empleado desactivado",
      text: result.message,
      confirmButtonColor: "#0f3d78",
    });
  }

  async function handleSubmitEmployee(event: React.FormEvent) {
    event.preventDefault();
    const normalized = normalizeEmployeeInput(formValues);
    const validation = validateEmployeeInput(normalized, { mode: formMode });

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      await Swal.fire({
        icon: "warning",
        title: "Formulario incompleto",
        text: "Revisa los campos marcados y vuelve a intentar.",
        confirmButtonColor: "#0f3d78",
      });
      return;
    }

    setIsFormSubmitting(true);
    const result =
      formMode === "create"
        ? await createCompanyEmployee(normalized)
        : await updateCompanyEmployee(editingEmployee?.user_id ?? "", normalized);
    setIsFormSubmitting(false);

    if (!result.ok) {
      await Swal.fire({
        icon: "error",
        title: "Operacion fallida",
        text: result.message,
        confirmButtonColor: "#0f3d78",
      });
      return;
    }

    setIsFormModalOpen(false);
    resetFormState();
    await loadEmployees(queryRef.current);

    await Swal.fire({
      icon: "success",
      title: formMode === "create" ? "Empleado creado" : "Empleado actualizado",
      text: result.message,
      confirmButtonColor: "#0f3d78",
    });
  }

  return (
    <>
      <section className="space-y-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_6px_14px_-12px_rgba(15,23,42,0.24)] lg:p-7">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Empleados de Empresa
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Gestiona los usuarios empleados asociados a tu empresa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--brand-blue)] px-4 text-sm font-medium text-white hover:bg-[var(--accent-strong)]"
          >
            <PlusIcon />
            Crear empleado
          </button>

          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Buscar por nombre o apellido..."
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none sm:w-[260px]"
          />

          <select
            value={query.status}
            onChange={(event) =>
              void applyQueryPatch({
                status: event.target.value as EmployeeQueryParams["status"],
                page: 1,
              })
            }
            className="h-10 rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">No activos</option>
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
                  Nombres
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Apellidos
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Correo
                </th>
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
                <EmployeesTableSkeleton />
              ) : null}

              {!isTableLoading && listResult.data.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-sm text-[var(--text-muted)]"
                  >
                    No hay empleados para mostrar.
                  </td>
                </tr>
              ) : null}

              {!isTableLoading
                ? listResult.data.map((employee) => (
                    <tr
                      key={employee.user_id}
                      className="hover:bg-[var(--surface-soft)]/60"
                    >
                      <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                        <p className="font-medium">
                          {employee.first_names}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                        {employee.last_names}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                        {employee.email || "Sin correo disponible"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ActiveBadge active={employee.user_is_active} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => void openDetailModal(employee.user_id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-soft)]"
                          >
                            <DetailIcon />
                            Detalle
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(employee)}
                            className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand-blue)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-strong)]"
                          >
                            <EditIcon />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteEmployee(employee)}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white ${
                              employee.user_is_active
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-green-600 hover:bg-green-700"
                            }`}
                          >
                            {employee.user_is_active ? (
                              <DeactivateIcon />
                            ) : (
                              <ActivateIcon />
                            )}
                            {employee.user_is_active ? "Desactivar" : "Activar"}
                          </button>
                        </div>
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

      {isFormModalOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center p-4">
          <button
            type="button"
            onClick={closeFormModal}
            aria-label="Cerrar modal de formulario"
            className="absolute inset-0 bg-[#0f2749]/45"
          />
          <section className="relative z-10 w-full max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_18px_36px_-22px_rgba(15,23,42,0.35)] lg:p-6">
            <header className="mb-4 flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  {formMode === "create" ? "Crear empleado" : "Editar empleado"}
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  El rol y la empresa se asignan automaticamente.
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

            <form className="space-y-4" onSubmit={handleSubmitEmployee}>
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
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none"
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
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none"
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
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none"
                  />
                  {formErrors.email ? (
                    <p className="text-xs text-red-600">{formErrors.email}</p>
                  ) : null}
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    {formMode === "create"
                      ? "Contraseña"
                      : "Nueva contraseña (opcional)"}
                  </span>
                  <input
                    type="password"
                    value={formValues.password}
                    onChange={(event) =>
                      handleFormValueChange("password", event.target.value)
                    }
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none"
                  />
                  {formErrors.password ? (
                    <p className="text-xs text-red-600">{formErrors.password}</p>
                  ) : null}
                </label>
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
                      ? "Crear"
                      : "Guardar cambios"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}

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
                  Detalle de empleado
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Datos principales del usuario.
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
              <EmployeeDetailSkeleton />
            ) : null}

            {!isDetailLoading && detailData ? (
              <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                <p className="text-sm text-[var(--text-primary)]">
                  <span className="font-medium">Nombre:</span>{" "}
                  {detailData.first_names} {detailData.last_names}
                </p>
                <p className="text-sm text-[var(--text-primary)]">
                  <span className="font-medium">Correo:</span>{" "}
                  {detailData.email || "Sin correo disponible"}
                </p>
                <p className="text-sm text-[var(--text-primary)]">
                  <span className="font-medium">Rol:</span>{" "}
                  {formatUserRole(detailData.user_role)}
                </p>
                <p className="text-sm text-[var(--text-primary)]">
                  <span className="font-medium">Estado:</span>{" "}
                  <ActiveBadge active={detailData.user_is_active} />
                </p>
                <p className="text-sm text-[var(--text-primary)]">
                  <span className="font-medium">Creado:</span>{" "}
                  {formatDateTime(detailData.created_at)}
                </p>
                <p className="text-sm text-[var(--text-primary)]">
                  <span className="font-medium">Actualizado:</span>{" "}
                  {formatDateTime(detailData.updated_at)}
                </p>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}

"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  createCompany,
  getCompanyDetail,
  listCompanies,
  softDeleteCompany,
  updateCompany,
} from "@/app/(admin)/(couponera-admin)/companies/actions";
import type {
  CompanyCategoryOption,
  CompanyDetail,
  CompanyFormInput,
  CompanyImagePayload,
  CompanyListItem,
  CompanyQueryParams,
  CompaniesListResponse,
} from "@/lib/companies/types";
import {
  normalizeCompanyInput,
  validateCompanyInput,
} from "@/lib/companies/validation";

type CompaniesCrudProps = {
  initialList: CompaniesListResponse;
  initialCategories: CompanyCategoryOption[];
};

type FormMode = "create" | "edit";
type FormErrors = Partial<Record<keyof CompanyFormInput, string>>;

const DEFAULT_QUERY: CompanyQueryParams = {
  search: "",
  categoryId: "",
  sortBy: "company_name",
  sortDir: "asc",
  page: 1,
  pageSize: 10,
};

const EMPTY_FORM: CompanyFormInput = {
  company_code: "",
  company_name: "",
  company_address: "",
  company_commission_rate: "",
  category_id: "",
};

// Formatea timestamps para mostrar fecha/hora legible en modales.
function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

// Convierte tasa decimal (0.15) al formato visual de porcentaje (15.00%).
function formatCommission(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

// Devuelve el indicador visual de orden para cada columna sortable.
function getSortIndicator(
  field: CompanyQueryParams["sortBy"],
  query: CompanyQueryParams,
): string {
  if (query.sortBy !== field) {
    return "\u2195";
  }

  return query.sortDir === "asc" ? "\u2191" : "\u2193";
}

// Icono de acción "Detalle".
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

// Icono de acción "Editar".
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

// Icono de acción "Eliminar".
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

// Icono de cierre de modales con estilo consistente con ofertas.
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

// Convierte un archivo local a dataURL para enviarlo a Server Actions.
function toImagePayload(file: File): Promise<CompanyImagePayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("No fue posible leer la imagen seleccionada."));
        return;
      }
      resolve({ name: file.name, type: file.type, dataUrl: reader.result });
    };
    reader.onerror = () => {
      reject(new Error("No fue posible procesar el archivo seleccionado."));
    };
    reader.readAsDataURL(file);
  });
}

// Orquesta el estado completo del CRUD de empresas en la interfaz.
export function CompaniesCrud({
  initialList,
  initialCategories,
}: CompaniesCrudProps) {
  const [query, setQuery] = useState<CompanyQueryParams>({
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
  const [editingCompany, setEditingCompany] = useState<CompanyListItem | null>(
    null,
  );
  const [formValues, setFormValues] = useState<CompanyFormInput>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailData, setDetailData] = useState<CompanyDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const searchInitializedRef = useRef(false);
  const queryRef = useRef<CompanyQueryParams>({
    ...DEFAULT_QUERY,
    page: initialList.page,
    pageSize: initialList.pageSize,
  });
  const latestRequestIdRef = useRef(0);
  const selectedFilterCategory = useMemo(
    () =>
      initialCategories.find((category) => category.category_id === query.categoryId) ??
      null,
    [initialCategories, query.categoryId],
  );
  const selectedFormCategory = useMemo(
    () =>
      initialCategories.find(
        (category) => category.category_id === formValues.category_id,
      ) ?? null,
    [formValues.category_id, initialCategories],
  );
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(listResult.total / query.pageSize)),
    [listResult.total, query.pageSize],
  );

  // Mantiene una copia sincronizada de query para evitar cierres obsoletos.
  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  // Ejecuta carga de tabla con control de concurrencia para ignorar respuestas viejas.
  const loadCompanies = useCallback(async (nextQuery: CompanyQueryParams) => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    setIsTableLoading(true);

    try {
      const response = await listCompanies(nextQuery);

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
          : "No fue posible cargar empresas.",
      );
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsTableLoading(false);
      }
    }
  }, []);

  // Aplica cambios parciales de query y recarga la tabla con el nuevo estado.
  const applyQueryPatch = useCallback(
    async (patch: Partial<CompanyQueryParams>): Promise<void> => {
      const nextQuery = { ...queryRef.current, ...patch };
      queryRef.current = nextQuery;
      setQuery(nextQuery);
      await loadCompanies(nextQuery);
    },
    [loadCompanies],
  );

  // Debounce de búsqueda para evitar una llamada por cada pulsación de tecla.
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

  // Libera URLs blob creadas en previews para evitar fugas de memoria.
  useEffect(() => {
    return () => {
      if (imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Permite cerrar modales con tecla Escape.
  useEffect(() => {
    // Handler de teclado para cierre rápido de overlays.
    function onEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      setIsFormModalOpen(false);
      setIsDetailModalOpen(false);
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  // Reinicia el formulario a estado limpio al cambiar de modo o cerrar.
  function resetFormState() {
    setFormValues(EMPTY_FORM);
    setFormErrors({});
    setSelectedImageFile(null);
    setImagePreview("");
    setEditingCompany(null);
  }

  // Abre modal en modo creación.
  function openCreateModal() {
    resetFormState();
    setFormMode("create");
    setIsFormModalOpen(true);
  }

  // Abre modal en modo edición y precarga valores actuales.
  function openEditModal(company: CompanyListItem) {
    setFormMode("edit");
    setEditingCompany(company);
    setFormErrors({});
    setSelectedImageFile(null);
    setImagePreview(company.company_photo ?? "");
    setFormValues({
      company_code: company.company_code,
      company_name: company.company_name,
      company_address: company.company_address ?? "",
      company_commission_rate: String(company.company_commission_rate),
      category_id: company.category_id,
    });
    setIsFormModalOpen(true);
  }

  // Cierra el modal de formulario.
  function closeFormModal() {
    setIsFormModalOpen(false);
  }

  // Cierra el modal de detalle.
  function closeDetailModal() {
    setIsDetailModalOpen(false);
  }

  // Carga y muestra el detalle de una empresa seleccionada.
  async function openDetailModal(companyId: string) {
    setIsDetailModalOpen(true);
    setIsDetailLoading(true);
    setDetailData(null);

    const result = await getCompanyDetail(companyId);
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

  // Actualiza un campo del formulario y limpia su error local al editar.
  function handleFormValueChange<K extends keyof CompanyFormInput>(
    key: K,
    value: CompanyFormInput[K],
  ) {
    setFormValues((previous) => ({ ...previous, [key]: value }));
    if (formErrors[key]) {
      setFormErrors((previous) => ({ ...previous, [key]: undefined }));
    }
  }

  // Toma archivo de input y genera preview local para crear/editar.
  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedImageFile(file);

    if (!file) {
      setImagePreview(editingCompany?.company_photo ?? "");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  }

  // Cambia la columna/dirección de orden y vuelve a la primera página.
  async function handleSort(sortBy: CompanyQueryParams["sortBy"]) {
    const nextSortDir =
      query.sortBy === sortBy && query.sortDir === "asc" ? "desc" : "asc";
    await applyQueryPatch({ sortBy, sortDir: nextSortDir, page: 1 });
  }

  // Confirma eliminación lógica y recarga la tabla respetando paginación.
  async function handleDeleteCompany(company: CompanyListItem) {
    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Eliminar empresa",
      text: `Esta accion marcara "${company.company_name}" como eliminada.`,
      showCancelButton: true,
      confirmButtonText: "Si, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#e26721",
      cancelButtonColor: "#0f3d78",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    const result = await softDeleteCompany(company.company_id);
    if (!result.ok) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo eliminar",
        text: result.message,
        confirmButtonColor: "#0f3d78",
      });
      return;
    }

    const nextPage =
      listResult.data.length === 1 && query.page > 1 ? query.page - 1 : query.page;
    const nextQuery = { ...query, page: nextPage };
    setQuery(nextQuery);
    await loadCompanies(nextQuery);

    await Swal.fire({
      icon: "success",
      title: "Empresa eliminada",
      text: result.message,
      confirmButtonColor: "#0f3d78",
    });
  }

  // Valida, envía y persiste crear/editar; luego refresca listado.
  async function handleSubmitCompanyForm(event: React.FormEvent) {
    event.preventDefault();
    const normalizedInput = normalizeCompanyInput(formValues);
    const validation = validateCompanyInput(normalizedInput);

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

    let imagePayload: CompanyImagePayload | null = null;
    if (selectedImageFile) {
      try {
        imagePayload = await toImagePayload(selectedImageFile);
      } catch (error) {
        await Swal.fire({
          icon: "error",
          title: "Error de imagen",
          text:
            error instanceof Error
              ? error.message
              : "No fue posible procesar la imagen seleccionada.",
          confirmButtonColor: "#0f3d78",
        });
        return;
      }
    }

    setIsFormSubmitting(true);
    const result =
      formMode === "create"
        ? await createCompany(normalizedInput, imagePayload)
        : await updateCompany(
            editingCompany?.company_id ?? "",
            normalizedInput,
            imagePayload,
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
    await loadCompanies(queryRef.current);

    await Swal.fire({
      icon: "success",
      title: formMode === "create" ? "Empresa creada" : "Empresa actualizada",
      text: result.message,
      confirmButtonColor: "#0f3d78",
    });
  }

  return (
    <>
      {/** Contenedor principal del módulo companies. */}
      <section className="space-y-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_6px_14px_-12px_rgba(15,23,42,0.24)] lg:p-7">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Empresas
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Gestiona empresas ofertantes con busqueda, filtros, orden y
            paginacion.
          </p>
        </div>

        {/** Barra de herramientas: crear, buscar, filtrar y tamaño de página. */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
          <button
            type="button"
            onClick={openCreateModal}
            className="h-10 rounded-xl bg-[var(--brand-blue)] px-4 text-sm font-medium text-white hover:bg-[var(--accent-strong)]"
          >
            Crear empresa
          </button>

          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Buscar por nombre o codigo..."
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none sm:w-[260px]"
          />

          <select
            value={query.categoryId}
            onChange={(event) =>
              void applyQueryPatch({ categoryId: event.target.value, page: 1 })
            }
            className="h-10 rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none"
          >
            <option value="">Todos los rubros</option>
            {initialCategories.map((category) => (
              <option key={category.category_id} value={category.category_id}>
                {category.category_name}
              </option>
            ))}
          </select>

          {selectedFilterCategory?.category_icon_url ? (
            <Image
              src={selectedFilterCategory.category_icon_url}
              alt={`Icono de ${selectedFilterCategory.category_name}`}
              width={36}
              height={36}
              unoptimized
              className="h-9 w-9 rounded-lg border border-[var(--border)] bg-white object-contain p-0.5"
            />
          ) : null}

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

        {/** Tabla principal con estados de carga, vacío y resultados. */}
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="min-w-full divide-y divide-[var(--border)] bg-white">
            <thead className="bg-[var(--surface-soft)]">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  <div className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
                    <span>Codigo</span>
                    <button
                      type="button"
                      onClick={() => void handleSort("company_code")}
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-xs text-[var(--text-muted)] hover:bg-[var(--surface)]"
                      aria-label="Ordenar por codigo"
                    >
                      {getSortIndicator("company_code", query)}
                    </button>
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  <div className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
                    <span>Empresa</span>
                    <button
                      type="button"
                      onClick={() => void handleSort("company_name")}
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-xs text-[var(--text-muted)] hover:bg-[var(--surface)]"
                      aria-label="Ordenar por empresa"
                    >
                      {getSortIndicator("company_name", query)}
                    </button>
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Imagen
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Direccion
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  <div className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
                    <span>Comision</span>
                    <button
                      type="button"
                      onClick={() => void handleSort("company_commission_rate")}
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-xs text-[var(--text-muted)] hover:bg-[var(--surface)]"
                      aria-label="Ordenar por comision"
                    >
                      {getSortIndicator("company_commission_rate", query)}
                    </button>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  <div className="inline-flex items-center gap-1 whitespace-nowrap">
                    <span>Categoria</span>
                    <button
                      type="button"
                      onClick={() => void handleSort("category_name")}
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-xs text-[var(--text-muted)] hover:bg-[var(--surface)]"
                      aria-label="Ordenar por categoria"
                    >
                      {getSortIndicator("category_name", query)}
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
                    colSpan={7}
                    className="px-4 py-6 text-center text-sm text-[var(--text-muted)]"
                  >
                    Cargando empresas...
                  </td>
                </tr>
              ) : null}

              {!isTableLoading && listResult.data.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-sm text-[var(--text-muted)]"
                  >
                    No hay empresas para mostrar.
                  </td>
                </tr>
              ) : null}

              {!isTableLoading
                ? listResult.data.map((company) => (
                    <tr
                      key={company.company_id}
                      className="hover:bg-[var(--surface-soft)]/60"
                    >
                      <td className="px-4 py-3 text-center text-sm font-medium text-[var(--text-primary)]">
                        {company.company_code}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-[var(--text-primary)]">
                        {company.company_name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {company.company_photo ? (
                          <Image
                            src={company.company_photo}
                            alt={`Logo de ${company.company_name}`}
                            width={48}
                            height={48}
                            unoptimized
                            className="mx-auto h-12 w-12 rounded-lg border border-[var(--border)] bg-white object-contain p-1"
                          />
                        ) : (
                          <span className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1 text-xs text-[var(--text-muted)]">
                            Sin imagen
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-[var(--text-muted)]">
                        {company.company_address || "Sin direccion"}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-[var(--text-primary)]">
                        {formatCommission(company.company_commission_rate)}
                      </td>
                      <td className="px-4 py-3 text-left">
                        <div className="flex items-center gap-2">
                          {company.category_icon_url ? (
                            <Image
                              src={company.category_icon_url}
                              alt={`Icono de ${company.category_name}`}
                              width={48}
                              height={48}
                              unoptimized
                              className="h-12 w-12 shrink-0 rounded-md border border-[var(--border)] bg-white object-contain p-1"
                            />
                          ) : null}
                          <span className="text-sm leading-5 text-[var(--text-primary)]">
                            {company.category_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => void openDetailModal(company.company_id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-soft)]"
                          >
                            <DetailIcon />
                            Detalle
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(company)}
                            className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand-blue)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-strong)]"
                          >
                            <EditIcon />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteCompany(company)}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                          >
                            <DeleteIcon />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>

        {/** Navegación de páginas y resumen de registros mostrados. */}
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

      {/** Modal de creación/edición de empresa. */}
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
                  {formMode === "create" ? "Crear empresa" : "Editar empresa"}
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Completa los campos requeridos para guardar la informacion.
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

            <form className="space-y-4" onSubmit={handleSubmitCompanyForm}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    Codigo de empresa
                  </span>
                  <input
                    type="text"
                    value={formValues.company_code}
                    onChange={(event) =>
                      handleFormValueChange("company_code", event.target.value)
                    }
                    placeholder="ABC123"
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none"
                  />
                  {formErrors.company_code ? (
                    <p className="text-xs text-red-600">{formErrors.company_code}</p>
                  ) : null}
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    Nombre de empresa
                  </span>
                  <input
                    type="text"
                    value={formValues.company_name}
                    onChange={(event) =>
                      handleFormValueChange("company_name", event.target.value)
                    }
                    placeholder="Nombre comercial"
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none"
                  />
                  {formErrors.company_name ? (
                    <p className="text-xs text-red-600">{formErrors.company_name}</p>
                  ) : null}
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    Tasa de comision
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formValues.company_commission_rate}
                    onChange={(event) =>
                      handleFormValueChange(
                        "company_commission_rate",
                        event.target.value,
                      )
                    }
                    placeholder="0.15"
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none"
                  />
                  {formErrors.company_commission_rate ? (
                    <p className="text-xs text-red-600">
                      {formErrors.company_commission_rate}
                    </p>
                  ) : null}
                </label>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    Categoria
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      value={formValues.category_id}
                      onChange={(event) =>
                        handleFormValueChange("category_id", event.target.value)
                      }
                      className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none"
                    >
                      <option value="">Selecciona una categoria</option>
                      {initialCategories.map((category) => (
                        <option key={category.category_id} value={category.category_id}>
                          {category.category_name}
                        </option>
                      ))}
                    </select>
                    {selectedFormCategory?.category_icon_url ? (
                      <Image
                        src={selectedFormCategory.category_icon_url}
                        alt={`Icono de ${selectedFormCategory.category_name}`}
                        width={40}
                        height={40}
                        unoptimized
                        className="h-10 w-10 shrink-0 rounded-lg border border-[var(--border)] bg-white object-contain p-0.5"
                      />
                    ) : null}
                  </div>
                  {formErrors.category_id ? (
                    <p className="text-xs text-red-600">{formErrors.category_id}</p>
                  ) : null}
                </div>
              </div>

              <label className="space-y-1">
                <span className="text-xs font-medium text-[var(--text-muted)]">
                  Direccion
                </span>
                <input
                  type="text"
                  value={formValues.company_address}
                  onChange={(event) =>
                    handleFormValueChange("company_address", event.target.value)
                  }
                  placeholder="Direccion de la empresa"
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none"
                />
                {formErrors.company_address ? (
                  <p className="text-xs text-red-600">{formErrors.company_address}</p>
                ) : null}
              </label>

              <div className="space-y-2">
                <span className="text-xs font-medium text-[var(--text-muted)]">
                  Imagen de empresa
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full rounded-xl border border-[var(--border)] bg-white p-2 text-xs text-[var(--text-muted)]"
                />
                {imagePreview ? (
                  <div className="flex justify-center">
                    <Image
                      src={imagePreview}
                      alt="Vista previa de empresa"
                      width={112}
                      height={112}
                      unoptimized
                      className="h-28 w-28 rounded-xl border border-[var(--border)] bg-white object-contain p-2"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">
                    No hay imagen seleccionada.
                  </p>
                )}
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

      {/** Modal de detalle con datos clave y marcas de tiempo. */}
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
                  Detalle de empresa
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Informacion principal y fechas.
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
                <div className="flex justify-center">
                  {detailData.company_photo ? (
                    <Image
                      src={detailData.company_photo}
                      alt={`Logo de ${detailData.company_name}`}
                      width={112}
                      height={112}
                      unoptimized
                      className="h-28 w-28 rounded-xl border border-[var(--border)] bg-white object-contain p-2"
                    />
                  ) : null}
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <p className="text-sm text-[var(--text-primary)]">
                    <span className="font-medium">Codigo:</span>{" "}
                    {detailData.company_code}
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-primary)]">
                    <span className="font-medium">Empresa:</span>{" "}
                    {detailData.company_name}
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-primary)]">
                    <span className="font-medium">Categoria:</span>{" "}
                    {detailData.category_name}
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-primary)]">
                    <span className="font-medium">Direccion:</span>{" "}
                    {detailData.company_address || "Sin direccion"}
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-primary)]">
                    <span className="font-medium">Comision:</span>{" "}
                    {formatCommission(detailData.company_commission_rate)}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <p className="text-sm text-[var(--text-primary)]">
                    <span className="font-medium">Creado:</span>{" "}
                    {formatDate(detailData.created_at)}
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-primary)]">
                    <span className="font-medium">Ultima actualizacion:</span>{" "}
                    {formatDate(detailData.updated_at)}
                  </p>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}

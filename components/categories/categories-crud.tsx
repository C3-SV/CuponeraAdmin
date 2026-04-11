"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  createCategory,
  listCategories,
  softDeleteCategory,
  updateCategory,
} from "@/app/(admin)/(couponera-admin)/categories/actions";
import type {
  CategoriesListResponse,
  CategoryFormInput,
  CategoryImagePayload,
  CategoryListItem,
  CategoryQueryParams,
} from "@/lib/categories/types";
import {
  normalizeCategoryInput,
  validateCategoryInput,
} from "@/lib/categories/validation";

type CategoriesCrudProps = {
  initialList: CategoriesListResponse;
};

type FormMode = "create" | "edit";
type FormErrors = Partial<Record<keyof CategoryFormInput, string>>;

const DEFAULT_QUERY: CategoryQueryParams = {
  search: "",
  sortBy: "category_name",
  sortDir: "asc",
  page: 1,
  pageSize: 10,
};

const EMPTY_FORM: CategoryFormInput = {
  category_name: "",
  alt_text: "",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getSortIndicator(
  field: CategoryQueryParams["sortBy"],
  query: CategoryQueryParams,
): string {
  if (query.sortBy !== field) return "\u2195";
  return query.sortDir === "asc" ? "\u2191" : "\u2193";
}

function EditIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
      <path d="M13.9 3.6a2 2 0 0 1 2.8 2.8l-8.4 8.4-3.4.6.6-3.4 8.4-8.4Z" />
      <path d="m12.5 5 2.5 2.5" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
      <path d="M3.8 5.8h12.4" />
      <path d="M7.2 5.8V4.5a1 1 0 0 1 1-1h3.6a1 1 0 0 1 1 1v1.3" />
      <path d="M5.9 5.8v9.2a1 1 0 0 0 1 1h6.2a1 1 0 0 0 1-1V5.8" />
      <path d="M8.5 8.4v5.1M11.5 8.4v5.1" />
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

export function CategoriesCrud({ initialList }: CategoriesCrudProps) {
  const [list, setList] = useState<CategoriesListResponse>(initialList);
  const [query, setQuery] = useState<CategoryQueryParams>(DEFAULT_QUERY);
  const queryRef = useRef<CategoryQueryParams>(DEFAULT_QUERY);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [selectedCategory, setSelectedCategory] = useState<CategoryListItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<CategoryFormInput>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [imageFile, setImageFile] = useState<CategoryImagePayload | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { queryRef.current = query; }, [query]);

  const fetchList = useCallback(async (params: CategoryQueryParams) => {
    setLoading(true);
    const result = await listCategories(params);
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
      if (e.key === "Escape") setModalOpen(false);
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  function handleSort(field: CategoryQueryParams["sortBy"]) {
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

  function openCreate() {
    setFormMode("create");
    setSelectedCategory(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setImageFile(null);
    setImagePreview(null);
    setModalOpen(true);
  }

  function openEdit(category: CategoryListItem) {
    setFormMode("edit");
    setSelectedCategory(category);
    setForm({ category_name: category.category_name, alt_text: category.alt_text ?? "" });
    setFormErrors({});
    setImageFile(null);
    setImagePreview(category.category_img_url);
    setModalOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImagePreview(dataUrl);
      setImageFile({ name: file.name, type: file.type, dataUrl });
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    const normalized = normalizeCategoryInput(form);
    const { isValid, errors } = validateCategoryInput(normalized);
    if (!isValid) {
      setFormErrors(errors);
      await Swal.fire({ icon: "warning", title: "Formulario incompleto", text: "Revisa los campos marcados y vuelve a intentar.", confirmButtonColor: "#0f3d78" });
      return;
    }

    setSaving(true);
    const result = formMode === "create"
      ? await createCategory(normalized, imageFile)
      : await updateCategory(selectedCategory!.category_id, normalized, imageFile);
    setSaving(false);

    if (!result.ok) {
      await Swal.fire({ icon: "error", title: "Operacion fallida", text: result.message, confirmButtonColor: "#0f3d78" });
      return;
    }
    setModalOpen(false);
    void fetchList(queryRef.current);
    await Swal.fire({ icon: "success", title: formMode === "create" ? "Rubro creado" : "Rubro actualizado", text: result.message, confirmButtonColor: "#0f3d78" });
  }

  async function handleDelete(category: CategoryListItem) {
    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Eliminar rubro",
      text: `Esta accion marcara "${category.category_name}" como eliminado.`,
      showCancelButton: true,
      confirmButtonText: "Si, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#e26721",
      cancelButtonColor: "#0f3d78",
    });
    if (!confirmation.isConfirmed) return;

    const result = await softDeleteCategory(category.category_id);
    if (!result.ok) {
      await Swal.fire({ icon: "error", title: "No se pudo eliminar", text: result.message, confirmButtonColor: "#0f3d78" });
      return;
    }
    const nextPage = list.data.length === 1 && query.page > 1 ? query.page - 1 : query.page;
    const next = { ...queryRef.current, page: nextPage };
    setQuery(next);
    void fetchList(next);
    await Swal.fire({ icon: "success", title: "Rubro eliminado", text: result.message, confirmButtonColor: "#0f3d78" });
  }

  const totalPages = Math.max(1, Math.ceil(list.total / query.pageSize));

  return (
    <>
      <section className="space-y-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_6px_14px_-12px_rgba(15,23,42,0.24)] lg:p-7">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Rubros</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Gestiona los rubros que clasifican a las empresas ofertantes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
          <button
            type="button"
            onClick={openCreate}
            className="h-10 rounded-xl bg-[var(--brand-blue)] px-4 text-sm font-medium text-white hover:bg-[var(--accent-strong)]"
          >
            Crear rubro
          </button>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre..."
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none sm:w-[260px]"
          />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="min-w-full divide-y divide-[var(--border)] bg-white">
            <thead className="bg-[var(--surface-soft)]">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Icono</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  <div className="inline-flex items-center gap-1 whitespace-nowrap">
                    <span>Nombre</span>
                    <button type="button" onClick={() => handleSort("category_name")} className="inline-flex h-5 w-5 items-center justify-center rounded text-xs text-[var(--text-muted)] hover:bg-[var(--surface)]" aria-label="Ordenar por nombre">
                      {getSortIndicator("category_name", query)}
                    </button>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Alt text</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  <div className="inline-flex items-center gap-1 whitespace-nowrap">
                    <span>Creado</span>
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
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">Cargando rubros...</td>
                </tr>
              ) : null}
              {!loading && list.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">No hay rubros para mostrar.</td>
                </tr>
              ) : null}
              {!loading ? list.data.map((cat) => (
                <tr key={cat.category_id} className="hover:bg-[var(--surface-soft)]/60">
                  <td className="px-4 py-3 text-center">
                    {cat.category_img_url ? (
                      <Image
                        src={cat.category_img_url}
                        alt={cat.alt_text ?? cat.category_name}
                        width={48}
                        height={48}
                        unoptimized
                        className="mx-auto h-12 w-12 rounded-lg border border-[var(--border)] bg-white object-contain p-1"
                      />
                    ) : (
                      <span className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1 text-xs text-[var(--text-muted)]">Sin icono</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{cat.category_name}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{cat.alt_text ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{formatDate(cat.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(cat)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand-blue)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-strong)]"
                      >
                        <EditIcon />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(cat)}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                      >
                        <DeleteIcon />
                        Eliminar
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

      {modalOpen && (
        <div className="fixed inset-0 z-40 grid place-items-center p-4">
          <button type="button" onClick={() => setModalOpen(false)} aria-label="Cerrar modal" className="absolute inset-0 bg-[#0f2749]/45" />
          <section className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_18px_36px_-22px_rgba(15,23,42,0.35)] lg:p-6">
            <header className="mb-4 flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  {formMode === "create" ? "Crear rubro" : "Editar rubro"}
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Completa los campos requeridos para guardar la informacion.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
                aria-label="Cerrar"
              >
                <CloseIcon />
              </button>
            </header>

            <div className="space-y-4">
              <label className="space-y-1">
                <span className="text-xs font-medium text-[var(--text-muted)]">Nombre *</span>
                <input
                  type="text"
                  value={form.category_name}
                  onChange={(e) => setForm({ ...form, category_name: e.target.value })}
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none"
                />
                {formErrors.category_name && <p className="text-xs text-red-600">{formErrors.category_name}</p>}
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-[var(--text-muted)]">Texto alternativo (accesibilidad)</span>
                <input
                  type="text"
                  value={form.alt_text}
                  placeholder="Descripcion del icono para lectores de pantalla"
                  onChange={(e) => setForm({ ...form, alt_text: e.target.value })}
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none"
                />
              </label>

              <div className="space-y-2">
                <span className="text-xs font-medium text-[var(--text-muted)]">
                  Icono {formMode === "edit" ? "(dejar vacio para no cambiar)" : "(opcional)"}
                </span>
                {imagePreview && (
                  <div className="flex items-center gap-3">
                    <Image
                      src={imagePreview}
                      alt="Vista previa"
                      width={48}
                      height={48}
                      unoptimized
                      className="rounded-xl border border-[var(--border)] bg-white object-contain p-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(formMode === "edit" ? selectedCategory?.category_img_url ?? null : null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Quitar nueva imagen
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-[var(--text-muted)] file:mr-3 file:rounded-lg file:border file:border-[var(--border)] file:bg-[var(--surface-soft)] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[var(--text-primary)]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="h-10 rounded-xl border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-soft)]">Cancelar</button>
                <button type="button" onClick={() => void handleSave()} disabled={saving} className="h-10 rounded-xl bg-[var(--brand-blue)] px-4 text-sm font-medium text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50">
                  {saving ? "Guardando..." : formMode === "create" ? "Crear" : "Guardar"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

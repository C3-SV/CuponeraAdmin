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

export function CategoriesCrud({ initialList }: CategoriesCrudProps) {
  const [list, setList] = useState<CategoriesListResponse>(initialList);
  const [query, setQuery] = useState<CategoryQueryParams>(DEFAULT_QUERY);
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

  const fetchList = useCallback(async (params: CategoryQueryParams) => {
    setLoading(true);
    const result = await listCategories(params);
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
      if (e.key === "Escape") setModalOpen(false);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  });

  function handleSort(field: CategoryQueryParams["sortBy"]) {
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
    setForm({
      category_name: category.category_name,
      alt_text: category.alt_text ?? "",
    });
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
      return;
    }

    setSaving(true);
    const result =
      formMode === "create"
        ? await createCategory(normalized, imageFile)
        : await updateCategory(selectedCategory!.category_id, normalized, imageFile);
    setSaving(false);

    if (!result.ok) {
      Swal.fire({ icon: "error", title: "Error", text: result.message, confirmButtonColor: "var(--accent)" });
      return;
    }

    setModalOpen(false);
    fetchList(query);
    Swal.fire({
      icon: "success",
      title: "Listo",
      text: result.message,
      confirmButtonColor: "var(--accent)",
      timer: 2000,
      showConfirmButton: false,
    });
  }

  async function handleDelete(category: CategoryListItem) {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "¿Eliminar rubro?",
      text: `"${category.category_name}" será eliminado del sistema.`,
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "var(--danger)",
    });

    if (!confirm.isConfirmed) return;

    const result = await softDeleteCategory(category.category_id);

    if (!result.ok) {
      Swal.fire({ icon: "error", title: "Error", text: result.message, confirmButtonColor: "var(--accent)" });
      return;
    }

    fetchList(query);
    Swal.fire({
      icon: "success",
      title: "Listo",
      text: result.message,
      confirmButtonColor: "var(--accent)",
      timer: 2000,
      showConfirmButton: false,
    });
  }

  const totalPages = Math.max(1, Math.ceil(list.total / query.pageSize));

  return (
    <>
      <section className="space-y-4 rounded-3xl border border-(--border) bg-(--surface) p-5 shadow-[0_6px_14px_-12px_rgba(15,23,42,0.24)] lg:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Rubros</h1>
            <p className="text-sm text-(--text-muted)">
              Categorías que clasifican a las empresas ofertantes.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-(--accent) px-4 py-2 text-sm font-semibold text-white hover:bg-(--accent-strong)"
          >
            + Nuevo rubro
          </button>
        </div>

        <input
          type="search"
          placeholder="Buscar por nombre…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full max-w-xs rounded-xl border border-(--border) bg-(--surface-soft) px-3 py-2 text-sm outline-none focus:border-(--accent) focus:ring-1 focus:ring-(--accent)"
        />

        <div className="overflow-x-auto rounded-2xl border border-(--border)">
          <table className="min-w-full divide-y divide-(--border)">
            <thead className="bg-(--surface-soft)">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
                  Icono
                </th>
                <th
                  onClick={() => handleSort("category_name")}
                  className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted) hover:text-foreground"
                >
                  Nombre {getSortIndicator("category_name", query)}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
                  Alt text
                </th>
                <th
                  onClick={() => handleSort("created_at")}
                  className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted) hover:text-foreground"
                >
                  Creado {getSortIndicator("created_at", query)}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border) bg-(--surface)">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-(--text-muted)">
                    Cargando…
                  </td>
                </tr>
              ) : list.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-(--text-muted)">
                    No se encontraron rubros.
                  </td>
                </tr>
              ) : (
                list.data.map((cat) => (
                  <tr key={cat.category_id} className="hover:bg-(--surface-soft)/70">
                    <td className="px-4 py-3">
                      {cat.category_img_url ? (
                        <Image
                          src={cat.category_img_url}
                          alt={cat.alt_text ?? cat.category_name}
                          width={36}
                          height={36}
                          className="rounded-lg object-contain"
                        />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-(--surface-soft) text-xs text-(--text-muted)">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {cat.category_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-(--text-muted)">
                      {cat.alt_text ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-(--text-muted)">
                      {formatDate(cat.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(cat)}
                          className="rounded-lg border border-(--border) px-3 py-1.5 text-xs font-medium text-foreground hover:bg-(--surface-soft)"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Eliminar
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

      {/* Modal crear/editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-40 grid place-items-center p-4">
          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={() => setModalOpen(false)}
            className="absolute inset-0 bg-[#0f2749]/45"
          />
          <section className="relative z-10 w-full max-w-md rounded-2xl border border-(--border) bg-(--surface) p-5 shadow-2xl lg:p-6">
            <header className="mb-5 flex items-center justify-between border-b border-(--border) pb-4">
              <h2 className="text-lg font-semibold text-foreground">
                {formMode === "create" ? "Nuevo rubro" : "Editar rubro"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-(--border) px-2.5 py-1.5 text-sm text-(--text-muted) hover:bg-(--surface-soft)"
              >
                Cerrar
              </button>
            </header>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-(--text-muted)">Nombre *</label>
                <input
                  type="text"
                  value={form.category_name}
                  onChange={(e) => setForm({ ...form, category_name: e.target.value })}
                  className="w-full rounded-xl border border-(--border) bg-(--surface-soft) px-3 py-2 text-sm outline-none focus:border-(--accent) focus:ring-1 focus:ring-(--accent)"
                />
                {formErrors.category_name && (
                  <p className="text-xs text-red-500">{formErrors.category_name}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-(--text-muted)">Texto alternativo (accesibilidad)</label>
                <input
                  type="text"
                  value={form.alt_text}
                  placeholder="Descripción del icono para lectores de pantalla"
                  onChange={(e) => setForm({ ...form, alt_text: e.target.value })}
                  className="w-full rounded-xl border border-(--border) bg-(--surface-soft) px-3 py-2 text-sm outline-none focus:border-(--accent) focus:ring-1 focus:ring-(--accent)"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-(--text-muted)">
                  Icono {formMode === "edit" ? "(dejar vacío para no cambiar)" : "(opcional)"}
                </label>
                {imagePreview && (
                  <div className="flex items-center gap-3">
                    <Image
                      src={imagePreview}
                      alt="Vista previa"
                      width={48}
                      height={48}
                      className="rounded-xl border border-(--border) object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(formMode === "edit" ? selectedCategory?.category_img_url ?? null : null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-xs text-red-500 hover:underline"
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
                  className="block w-full text-sm text-(--text-muted) file:mr-3 file:rounded-lg file:border file:border-(--border) file:bg-(--surface-soft) file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-(--border) px-4 py-2 text-sm font-medium text-(--text-muted) hover:bg-(--surface-soft)"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-xl bg-(--accent) px-4 py-2 text-sm font-semibold text-white hover:bg-(--accent-strong) disabled:opacity-60"
                >
                  {saving ? "Guardando…" : formMode === "create" ? "Crear" : "Guardar"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

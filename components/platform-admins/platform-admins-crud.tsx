"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  createPlatformAdmin,
  deactivatePlatformAdmin,
  listPlatformAdmins,
  updatePlatformAdmin,
} from "@/app/(admin)/(couponera-admin)/platform-admins/actions";
import type {
  AdminEditInput,
  AdminFormInput,
  AdminListItem,
  AdminQueryParams,
  AdminsListResponse,
} from "@/lib/platform-admins/types";
import {
  normalizeAdminEditInput,
  normalizeAdminInput,
  validateAdminEditInput,
  validateAdminInput,
} from "@/lib/platform-admins/validation";

type PlatformAdminsCrudProps = {
  initialList: AdminsListResponse;
};

type FormMode = "create" | "edit";
type CreateErrors = Partial<Record<keyof AdminFormInput, string>>;
type EditErrors = Partial<Record<keyof AdminEditInput, string>>;

const DEFAULT_QUERY: AdminQueryParams = {
  search: "",
  sortBy: "first_names",
  sortDir: "asc",
  page: 1,
  pageSize: 10,
};

const EMPTY_CREATE_FORM: AdminFormInput = {
  first_names: "",
  last_names: "",
  email: "",
  password: "",
};

const EMPTY_EDIT_FORM: AdminEditInput = {
  first_names: "",
  last_names: "",
  user_is_active: true,
  new_password: "",
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
  field: AdminQueryParams["sortBy"],
  query: AdminQueryParams,
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

function DeactivateIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
      <circle cx="10" cy="10" r="7" />
      <path d="M7 10h6" strokeLinecap="round" />
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

export function PlatformAdminsCrud({ initialList }: PlatformAdminsCrudProps) {
  const [list, setList] = useState<AdminsListResponse>(initialList);
  const [query, setQuery] = useState<AdminQueryParams>(DEFAULT_QUERY);
  const queryRef = useRef<AdminQueryParams>(DEFAULT_QUERY);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [selectedAdmin, setSelectedAdmin] = useState<AdminListItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [createForm, setCreateForm] = useState<AdminFormInput>(EMPTY_CREATE_FORM);
  const [createErrors, setCreateErrors] = useState<CreateErrors>({});
  const [editForm, setEditForm] = useState<AdminEditInput>(EMPTY_EDIT_FORM);
  const [editErrors, setEditErrors] = useState<EditErrors>({});

  useEffect(() => { queryRef.current = query; }, [query]);

  const fetchList = useCallback(async (params: AdminQueryParams) => {
    setLoading(true);
    const result = await listPlatformAdmins(params);
    setList(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = { ...queryRef.current, search: searchInput, page: 1 };
      setQuery(next);
      fetchList(next);
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

  function handleSort(field: AdminQueryParams["sortBy"]) {
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
    setSelectedAdmin(null);
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateErrors({});
    setModalOpen(true);
  }

  function openEdit(admin: AdminListItem) {
    setFormMode("edit");
    setSelectedAdmin(admin);
    setEditForm({ first_names: admin.first_names, last_names: admin.last_names, user_is_active: admin.user_is_active, new_password: "" });
    setEditErrors({});
    setModalOpen(true);
  }

  async function handleSaveCreate() {
    const normalized = normalizeAdminInput(createForm);
    const { isValid, errors } = validateAdminInput(normalized);
    if (!isValid) { setCreateErrors(errors); return; }

    setSaving(true);
    const result = await createPlatformAdmin(normalized);
    setSaving(false);

    if (!result.ok) {
      await Swal.fire({ icon: "error", title: "Operacion fallida", text: result.message, confirmButtonColor: "#0f3d78" });
      return;
    }
    setModalOpen(false);
    void fetchList(queryRef.current);
    await Swal.fire({ icon: "success", title: "Administrador creado", text: result.message, confirmButtonColor: "#0f3d78" });
  }

  async function handleSaveEdit() {
    if (!selectedAdmin) return;
    const normalized = normalizeAdminEditInput(editForm);
    const { isValid, errors } = validateAdminEditInput(normalized);
    if (!isValid) { setEditErrors(errors); return; }

    setSaving(true);
    const result = await updatePlatformAdmin(selectedAdmin.user_id, normalized);
    setSaving(false);

    if (!result.ok) {
      await Swal.fire({ icon: "error", title: "Operacion fallida", text: result.message, confirmButtonColor: "#0f3d78" });
      return;
    }
    setModalOpen(false);
    void fetchList(queryRef.current);
    await Swal.fire({ icon: "success", title: "Administrador actualizado", text: result.message, confirmButtonColor: "#0f3d78" });
  }

  async function handleDeactivate(admin: AdminListItem) {
    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Desactivar administrador",
      text: `Esta accion desactivara la cuenta de "${admin.full_name}".`,
      showCancelButton: true,
      confirmButtonText: "Si, desactivar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#e26721",
      cancelButtonColor: "#0f3d78",
    });
    if (!confirmation.isConfirmed) return;

    const result = await deactivatePlatformAdmin(admin.user_id);
    if (!result.ok) {
      await Swal.fire({ icon: "error", title: "No se pudo desactivar", text: result.message, confirmButtonColor: "#0f3d78" });
      return;
    }
    void fetchList(queryRef.current);
    await Swal.fire({ icon: "success", title: "Administrador desactivado", text: result.message, confirmButtonColor: "#0f3d78" });
  }

  const totalPages = Math.max(1, Math.ceil(list.total / query.pageSize));

  return (
    <>
      <section className="space-y-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_6px_14px_-12px_rgba(15,23,42,0.24)] lg:p-7">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Administradores de Plataforma
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Gestiona las cuentas administrativas internas de La Cuponera.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
          <button
            type="button"
            onClick={openCreate}
            className="h-10 rounded-xl bg-[var(--brand-blue)] px-4 text-sm font-medium text-white hover:bg-[var(--accent-strong)]"
          >
            Crear administrador
          </button>
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
                    <span>Nombres</span>
                    <button type="button" onClick={() => handleSort("first_names")} className="inline-flex h-5 w-5 items-center justify-center rounded text-xs text-[var(--text-muted)] hover:bg-[var(--surface)]" aria-label="Ordenar por nombres">
                      {getSortIndicator("first_names", query)}
                    </button>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  <div className="inline-flex items-center gap-1 whitespace-nowrap">
                    <span>Apellidos</span>
                    <button type="button" onClick={() => handleSort("last_names")} className="inline-flex h-5 w-5 items-center justify-center rounded text-xs text-[var(--text-muted)] hover:bg-[var(--surface)]" aria-label="Ordenar por apellidos">
                      {getSortIndicator("last_names", query)}
                    </button>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Correo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Estado</th>
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
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">Cargando administradores...</td>
                </tr>
              ) : null}
              {!loading && list.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">No hay administradores para mostrar.</td>
                </tr>
              ) : null}
              {!loading ? list.data.map((admin) => (
                <tr key={admin.user_id} className="hover:bg-[var(--surface-soft)]/60">
                  <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{admin.first_names}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{admin.last_names}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{admin.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${admin.user_is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {admin.user_is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{formatDate(admin.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(admin)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand-blue)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-strong)]"
                      >
                        <EditIcon />
                        Editar
                      </button>
                      {admin.user_is_active && (
                        <button
                          type="button"
                          onClick={() => void handleDeactivate(admin)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                        >
                          <DeactivateIcon />
                          Desactivar
                        </button>
                      )}
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
          <section className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_18px_36px_-22px_rgba(15,23,42,0.35)] lg:p-6">
            <header className="mb-4 flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  {formMode === "create" ? "Crear administrador" : "Editar administrador"}
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

            {formMode === "create" ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-[var(--text-muted)]">Nombres *</span>
                    <input type="text" value={createForm.first_names} onChange={(e) => setCreateForm({ ...createForm, first_names: e.target.value })} className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none" />
                    {createErrors.first_names && <p className="text-xs text-red-600">{createErrors.first_names}</p>}
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-[var(--text-muted)]">Apellidos *</span>
                    <input type="text" value={createForm.last_names} onChange={(e) => setCreateForm({ ...createForm, last_names: e.target.value })} className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none" />
                    {createErrors.last_names && <p className="text-xs text-red-600">{createErrors.last_names}</p>}
                  </label>
                </div>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-[var(--text-muted)]">Correo electronico *</span>
                  <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none" />
                  {createErrors.email && <p className="text-xs text-red-600">{createErrors.email}</p>}
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-[var(--text-muted)]">Contrasena temporal *</span>
                  <input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none" />
                  {createErrors.password && <p className="text-xs text-red-600">{createErrors.password}</p>}
                </label>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="h-10 rounded-xl border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-soft)]">Cancelar</button>
                  <button type="button" onClick={() => void handleSaveCreate()} disabled={saving} className="h-10 rounded-xl bg-[var(--brand-blue)] px-4 text-sm font-medium text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50">
                    {saving ? "Guardando..." : "Crear"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-[var(--text-muted)]">Nombres *</span>
                    <input type="text" value={editForm.first_names} onChange={(e) => setEditForm({ ...editForm, first_names: e.target.value })} className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none" />
                    {editErrors.first_names && <p className="text-xs text-red-600">{editErrors.first_names}</p>}
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-[var(--text-muted)]">Apellidos *</span>
                    <input type="text" value={editForm.last_names} onChange={(e) => setEditForm({ ...editForm, last_names: e.target.value })} className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none" />
                    {editErrors.last_names && <p className="text-xs text-red-600">{editErrors.last_names}</p>}
                  </label>
                </div>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-[var(--text-muted)]">Estado</span>
                  <select value={editForm.user_is_active ? "true" : "false"} onChange={(e) => setEditForm({ ...editForm, user_is_active: e.target.value === "true" })} className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none">
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-[var(--text-muted)]">Nueva contrasena (opcional)</span>
                  <input type="password" value={editForm.new_password} placeholder="Dejar vacio para no cambiar" onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })} className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none" />
                  {editErrors.new_password && <p className="text-xs text-red-600">{editErrors.new_password}</p>}
                </label>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="h-10 rounded-xl border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-soft)]">Cancelar</button>
                  <button type="button" onClick={() => void handleSaveEdit()} disabled={saving} className="h-10 rounded-xl bg-[var(--brand-blue)] px-4 text-sm font-medium text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50">
                    {saving ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}

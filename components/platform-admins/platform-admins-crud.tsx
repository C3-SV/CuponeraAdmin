"use client";

import { useCallback, useEffect, useState } from "react";
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

export function PlatformAdminsCrud({ initialList }: PlatformAdminsCrudProps) {
  const [list, setList] = useState<AdminsListResponse>(initialList);
  const [query, setQuery] = useState<AdminQueryParams>(DEFAULT_QUERY);
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

  const fetchList = useCallback(async (params: AdminQueryParams) => {
    setLoading(true);
    const result = await listPlatformAdmins(params);
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
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  });

  function handleEscape(event: KeyboardEvent) {
    if (event.key === "Escape") setModalOpen(false);
  }

  function handleSort(field: AdminQueryParams["sortBy"]) {
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
    setSelectedAdmin(null);
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateErrors({});
    setModalOpen(true);
  }

  function openEdit(admin: AdminListItem) {
    setFormMode("edit");
    setSelectedAdmin(admin);
    setEditForm({
      first_names: admin.first_names,
      last_names: admin.last_names,
      user_is_active: admin.user_is_active,
      new_password: "",
    });
    setEditErrors({});
    setModalOpen(true);
  }

  async function handleSaveCreate() {
    const normalized = normalizeAdminInput(createForm);
    const { isValid, errors } = validateAdminInput(normalized);
    if (!isValid) {
      setCreateErrors(errors);
      return;
    }

    setSaving(true);
    const result = await createPlatformAdmin(normalized);
    setSaving(false);

    if (!result.ok) {
      Swal.fire({ icon: "error", title: "Error", text: result.message, confirmButtonColor: "var(--accent)" });
      return;
    }

    setModalOpen(false);
    fetchList(query);
    Swal.fire({ icon: "success", title: "Listo", text: result.message, confirmButtonColor: "var(--accent)", timer: 2000, showConfirmButton: false });
  }

  async function handleSaveEdit() {
    if (!selectedAdmin) return;

    const normalized = normalizeAdminEditInput(editForm);
    const { isValid, errors } = validateAdminEditInput(normalized);
    if (!isValid) {
      setEditErrors(errors);
      return;
    }

    setSaving(true);
    const result = await updatePlatformAdmin(selectedAdmin.user_id, normalized);
    setSaving(false);

    if (!result.ok) {
      Swal.fire({ icon: "error", title: "Error", text: result.message, confirmButtonColor: "var(--accent)" });
      return;
    }

    setModalOpen(false);
    fetchList(query);
    Swal.fire({ icon: "success", title: "Listo", text: result.message, confirmButtonColor: "var(--accent)", timer: 2000, showConfirmButton: false });
  }

  async function handleDeactivate(admin: AdminListItem) {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "¿Desactivar administrador?",
      text: `${admin.full_name} no podrá acceder al sistema.`,
      showCancelButton: true,
      confirmButtonText: "Desactivar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "var(--danger)",
    });

    if (!confirm.isConfirmed) return;

    const result = await deactivatePlatformAdmin(admin.user_id);

    if (!result.ok) {
      Swal.fire({ icon: "error", title: "Error", text: result.message, confirmButtonColor: "var(--accent)" });
      return;
    }

    fetchList(query);
    Swal.fire({ icon: "success", title: "Listo", text: result.message, confirmButtonColor: "var(--accent)", timer: 2000, showConfirmButton: false });
  }

  const totalPages = Math.max(1, Math.ceil(list.total / query.pageSize));

  return (
    <>
      <section className="space-y-4 rounded-3xl border border-(--border) bg-(--surface) p-5 shadow-[0_6px_14px_-12px_rgba(15,23,42,0.24)] lg:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Administradores de Plataforma
            </h1>
            <p className="text-sm text-(--text-muted)">
              Gestión de cuentas administrativas internas de La Cuponera.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-(--accent) px-4 py-2 text-sm font-semibold text-white hover:bg-(--accent-strong)"
          >
            + Nuevo administrador
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <input
            type="search"
            placeholder="Buscar por nombre o apellido…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full max-w-xs rounded-xl border border-(--border) bg-(--surface-soft) px-3 py-2 text-sm outline-none focus:border-(--accent) focus:ring-1 focus:ring-(--accent)"
          />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-(--border)">
          <table className="min-w-full divide-y divide-(--border)">
            <thead className="bg-(--surface-soft)">
              <tr>
                <th
                  onClick={() => handleSort("first_names")}
                  className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted) hover:text-foreground"
                >
                  Nombres {getSortIndicator("first_names", query)}
                </th>
                <th
                  onClick={() => handleSort("last_names")}
                  className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted) hover:text-foreground"
                >
                  Apellidos {getSortIndicator("last_names", query)}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
                  Correo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
                  Estado
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
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-(--text-muted)">
                    Cargando…
                  </td>
                </tr>
              ) : list.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-(--text-muted)">
                    No se encontraron administradores.
                  </td>
                </tr>
              ) : (
                list.data.map((admin) => (
                  <tr key={admin.user_id} className="hover:bg-(--surface-soft)/70">
                    <td className="px-4 py-3 text-sm text-foreground">{admin.first_names}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{admin.last_names}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{admin.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          admin.user_is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {admin.user_is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-(--text-muted)">
                      {formatDate(admin.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(admin)}
                          className="rounded-lg border border-(--border) px-3 py-1.5 text-xs font-medium text-foreground hover:bg-(--surface-soft)"
                        >
                          Editar
                        </button>
                        {admin.user_is_active && (
                          <button
                            type="button"
                            onClick={() => handleDeactivate(admin)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Desactivar
                          </button>
                        )}
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
          <section className="relative z-10 w-full max-w-lg rounded-2xl border border-(--border) bg-(--surface) p-5 shadow-2xl lg:p-6">
            <header className="mb-5 flex items-center justify-between border-b border-(--border) pb-4">
              <h2 className="text-lg font-semibold text-foreground">
                {formMode === "create" ? "Nuevo administrador" : "Editar administrador"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-(--border) px-2.5 py-1.5 text-sm text-(--text-muted) hover:bg-(--surface-soft)"
              >
                Cerrar
              </button>
            </header>

            {formMode === "create" ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-(--text-muted)">Nombres *</label>
                    <input
                      type="text"
                      value={createForm.first_names}
                      onChange={(e) => setCreateForm({ ...createForm, first_names: e.target.value })}
                      className="w-full rounded-xl border border-(--border) bg-(--surface-soft) px-3 py-2 text-sm outline-none focus:border-(--accent) focus:ring-1 focus:ring-(--accent)"
                    />
                    {createErrors.first_names && (
                      <p className="text-xs text-red-500">{createErrors.first_names}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-(--text-muted)">Apellidos *</label>
                    <input
                      type="text"
                      value={createForm.last_names}
                      onChange={(e) => setCreateForm({ ...createForm, last_names: e.target.value })}
                      className="w-full rounded-xl border border-(--border) bg-(--surface-soft) px-3 py-2 text-sm outline-none focus:border-(--accent) focus:ring-1 focus:ring-(--accent)"
                    />
                    {createErrors.last_names && (
                      <p className="text-xs text-red-500">{createErrors.last_names}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-(--text-muted)">Correo electrónico *</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full rounded-xl border border-(--border) bg-(--surface-soft) px-3 py-2 text-sm outline-none focus:border-(--accent) focus:ring-1 focus:ring-(--accent)"
                  />
                  {createErrors.email && (
                    <p className="text-xs text-red-500">{createErrors.email}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-(--text-muted)">Contraseña temporal *</label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full rounded-xl border border-(--border) bg-(--surface-soft) px-3 py-2 text-sm outline-none focus:border-(--accent) focus:ring-1 focus:ring-(--accent)"
                  />
                  {createErrors.password && (
                    <p className="text-xs text-red-500">{createErrors.password}</p>
                  )}
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
                    onClick={handleSaveCreate}
                    disabled={saving}
                    className="rounded-xl bg-(--accent) px-4 py-2 text-sm font-semibold text-white hover:bg-(--accent-strong) disabled:opacity-60"
                  >
                    {saving ? "Guardando…" : "Crear"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-(--text-muted)">Nombres *</label>
                    <input
                      type="text"
                      value={editForm.first_names}
                      onChange={(e) => setEditForm({ ...editForm, first_names: e.target.value })}
                      className="w-full rounded-xl border border-(--border) bg-(--surface-soft) px-3 py-2 text-sm outline-none focus:border-(--accent) focus:ring-1 focus:ring-(--accent)"
                    />
                    {editErrors.first_names && (
                      <p className="text-xs text-red-500">{editErrors.first_names}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-(--text-muted)">Apellidos *</label>
                    <input
                      type="text"
                      value={editForm.last_names}
                      onChange={(e) => setEditForm({ ...editForm, last_names: e.target.value })}
                      className="w-full rounded-xl border border-(--border) bg-(--surface-soft) px-3 py-2 text-sm outline-none focus:border-(--accent) focus:ring-1 focus:ring-(--accent)"
                    />
                    {editErrors.last_names && (
                      <p className="text-xs text-red-500">{editErrors.last_names}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-(--text-muted)">Estado</label>
                  <select
                    value={editForm.user_is_active ? "true" : "false"}
                    onChange={(e) => setEditForm({ ...editForm, user_is_active: e.target.value === "true" })}
                    className="w-full rounded-xl border border-(--border) bg-(--surface-soft) px-3 py-2 text-sm outline-none focus:border-(--accent) focus:ring-1 focus:ring-(--accent)"
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-(--text-muted)">Nueva contraseña (opcional)</label>
                  <input
                    type="password"
                    value={editForm.new_password}
                    placeholder="Dejar vacío para no cambiar"
                    onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
                    className="w-full rounded-xl border border-(--border) bg-(--surface-soft) px-3 py-2 text-sm outline-none focus:border-(--accent) focus:ring-1 focus:ring-(--accent)"
                  />
                  {editErrors.new_password && (
                    <p className="text-xs text-red-500">{editErrors.new_password}</p>
                  )}
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
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="rounded-xl bg-(--accent) px-4 py-2 text-sm font-semibold text-white hover:bg-(--accent-strong) disabled:opacity-60"
                  >
                    {saving ? "Guardando…" : "Guardar"}
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

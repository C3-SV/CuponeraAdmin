export type AdminSortBy = "first_names" | "last_names" | "created_at";
export type SortDirection = "asc" | "desc";

export type AdminQueryParams = {
  search: string;
  sortBy: AdminSortBy;
  sortDir: SortDirection;
  page: number;
  pageSize: number;
};

// Fila de admin renderizada en la tabla principal.
export type AdminListItem = {
  user_id: string;
  email: string;
  first_names: string;
  last_names: string;
  full_name: string;
  user_is_active: boolean;
  created_at: string;
  updated_at: string;
};

// Datos editables desde el modal de crear/editar.
export type AdminFormInput = {
  first_names: string;
  last_names: string;
  email: string;
  password: string;
};

// Datos para editar un admin existente (sin email, con campo activo).
export type AdminEditInput = {
  first_names: string;
  last_names: string;
  user_is_active: boolean;
  new_password: string;
};

// Respuesta paginada del listado de admins.
export type AdminsListResponse = {
  data: AdminListItem[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
};

// Contrato estándar para acciones mutables.
export type AdminActionResult<T = null> = {
  ok: boolean;
  message: string;
  data?: T;
};

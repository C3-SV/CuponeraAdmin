export type EmployeeSortBy =
  | "first_names"
  | "last_names"
  | "user_is_active"
  | "created_at";

export type SortDirection = "asc" | "desc";

export type EmployeeQueryParams = {
  search: string;
  status: "active" | "inactive" | "all";
  sortBy: EmployeeSortBy;
  sortDir: SortDirection;
  page: number;
  pageSize: number;
};

export type EmployeeFormInput = {
  email: string;
  password: string;
  first_names: string;
  last_names: string;
  user_is_active: boolean;
};

export type EmployeeListItem = {
  user_id: string;
  email: string;
  first_names: string;
  last_names: string;
  user_role: "EMPLOYEE";
  user_is_active: boolean;
  company_id: string;
  created_at: string;
  updated_at: string;
};

export type EmployeeDetail = EmployeeListItem;

export type EmployeesListResponse = {
  data: EmployeeListItem[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
};

export type EmployeeActionResult<T = null> = {
  ok: boolean;
  message: string;
  data?: T;
};

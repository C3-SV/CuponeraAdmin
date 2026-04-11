export type DbUserRole =
  | "ADMIN_PLATFORM"
  | "ADMIN_COMPANY"
  | "EMPLOYEE"
  | "CUSTOMER";

export const USER_ROLE_LABELS = {
  ADMIN_PLATFORM: "Administrador de plataforma",
  ADMIN_COMPANY: "Administrador de empresa",
  EMPLOYEE: "Empleado",
  CUSTOMER: "Cliente",
} satisfies Record<DbUserRole, string>;

export type UserRoleLabel = (typeof USER_ROLE_LABELS)[DbUserRole];

export function formatUserRole(role: DbUserRole): UserRoleLabel {
  return USER_ROLE_LABELS[role];
}

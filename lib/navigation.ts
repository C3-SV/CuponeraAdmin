export type AppRole =
  | "ADMIN_PLATFORM"
  | "ADMIN_COMPANY"
  | "EMPLOYEE"
  | "CUSTOMER";

export type NavIconName =
  | "dashboard"
  | "shield"
  | "tags"
  | "building"
  | "briefcase"
  | "clipboard"
  | "chart"
  | "users"
  | "ticket"
  | "employees"
  | "scan";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
};

export type NavSection = {
  title: string;
  roles: AppRole[];
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Admin Cuponera",
    roles: ["ADMIN_PLATFORM"],
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: "dashboard",
      },
      {
        href: "/platform-admins",
        label: "Administradores",
        icon: "shield",
      },
      {
        href: "/categories",
        label: "Rubros",
        icon: "tags",
      },
      {
        href: "/companies",
        label: "Empresas",
        icon: "building",
      },
      {
        href: "/company-admin-assignment",
        label: "Contactos empresas",
        icon: "briefcase",
      },
      {
        href: "/offers-review",
        label: "Revisión de ofertas",
        icon: "clipboard",
      },
      {
        href: "/approved-offers-stats",
        label: "Métricas",
        icon: "chart",
      },
      {
        href: "/customers",
        label: "Clientes",
        icon: "users",
      },
    ],
  },
  {
    title: "Admin Empresa",
    roles: ["ADMIN_COMPANY"],
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: "dashboard",
      },
      {
        href: "/company-offers",
        label: "Mis ofertas",
        icon: "ticket",
      },
      {
        href: "/company-employees",
        label: "Empleados",
        icon: "employees",
      },
    ],
  },
  {
    title: "Empleado Empresa",
    roles: ["EMPLOYEE"],
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: "dashboard",
      },
      {
        href: "/coupon-redemption",
        label: "Canje de cupón",
        icon: "scan",
      },
    ],
  },
];

export function getVisibleSections(activeRole?: AppRole | null): NavSection[] {
  if (!activeRole) return [];

  return NAV_SECTIONS.filter((section) => section.roles.includes(activeRole));
}
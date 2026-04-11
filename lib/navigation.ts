export type AppRole =
  | "couponera_admin"
  | "company_admin"
  | "company_employee";

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
  allowedRoles: AppRole[];
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

const allRoles: AppRole[] = [
  "couponera_admin",
  "company_admin",
  "company_employee",
];

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Principal",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: "dashboard",
        allowedRoles: allRoles,
      },
    ],
  },
  {
    title: "Admin Cuponera",
    items: [
      {
        href: "/platform-admins",
        label: "Administradores",
        icon: "shield",
        allowedRoles: ["couponera_admin"],
      },
      {
        href: "/categories",
        label: "Rubros",
        icon: "tags",
        allowedRoles: ["couponera_admin"],
      },
      {
        href: "/companies",
        label: "Empresas",
        icon: "building",
        allowedRoles: ["couponera_admin"],
      },
      {
        href: "/company-admin-assignment",
        label: "Contactos empresas",
        icon: "briefcase",
        allowedRoles: ["couponera_admin"],
      },
      {
        href: "/offers-review",
        label: "Revisión de ofertas",
        icon: "clipboard",
        allowedRoles: ["couponera_admin"],
      },
      {
        href: "/approved-offers-stats",
        label: "Métricas",
        icon: "chart",
        allowedRoles: ["couponera_admin"],
      },
      {
        href: "/customers",
        label: "Clientes",
        icon: "users",
        allowedRoles: ["couponera_admin"],
      },
    ],
  },
  {
    title: "Admin Empresa",
    items: [
      {
        href: "/company-offers",
        label: "Mis ofertas",
        icon: "ticket",
        allowedRoles: ["company_admin"],
      },
      {
        href: "/company-employees",
        label: "Empleados",
        icon: "employees",
        allowedRoles: ["company_admin"],
      },
    ],
  },
  {
    title: "Empleado Empresa",
    items: [
      {
        href: "/coupon-redemption",
        label: "Canje de cupón",
        icon: "scan",
        allowedRoles: ["company_employee"],
      },
    ],
  },
];

export function getVisibleSections(activeRole?: AppRole | null): NavSection[] {
  if (!activeRole) {
    return NAV_SECTIONS;
  }

  return NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.allowedRoles.includes(activeRole),
      ),
    }))
    .filter((section) => section.items.length > 0);
}

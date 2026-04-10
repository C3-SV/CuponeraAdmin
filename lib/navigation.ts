export type AppRole =
  | "couponera_admin"
  | "company_admin"
  | "company_employee";

export type NavItem = {
  href: string;
  label: string;
  subtitle: string;
  iconToken: string;
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
        subtitle: "Vista general base",
        iconToken: "DB",
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
        subtitle: "CRUD de admins internos",
        iconToken: "PA",
        allowedRoles: ["couponera_admin"],
      },
      {
        href: "/categories",
        label: "Rubros",
        subtitle: "CRUD de rubros",
        iconToken: "RU",
        allowedRoles: ["couponera_admin"],
      },
      {
        href: "/companies",
        label: "Empresas",
        subtitle: "CRUD de empresas ofertantes",
        iconToken: "EM",
        allowedRoles: ["couponera_admin"],
      },
      {
        href: "/company-admin-assignment",
        label: "Admin Empresa",
        subtitle: "CRUD + Vinculacion de profiles",
        iconToken: "AE",
        allowedRoles: ["couponera_admin"],
      },
      {
        href: "/offers-review",
        label: "Revision de Ofertas",
        subtitle: "Aprobar, rechazar y comentar",
        iconToken: "OF",
        allowedRoles: ["couponera_admin"],
      },
      {
        href: "/approved-offers-stats",
        label: "Estadisticas de Ofertas",
        subtitle: "Ventas, disponibles y comision",
        iconToken: "ST",
        allowedRoles: ["couponera_admin"],
      },
      {
        href: "/customers",
        label: "Clientes y Cupones",
        subtitle: "Listado, detalle y estado",
        iconToken: "CL",
        allowedRoles: ["couponera_admin"],
      },
    ],
  },
  {
    title: "Admin Empresa",
    items: [
      {
        href: "/company-offers",
        label: "Ofertas de Mi Empresa",
        subtitle: "Crear y actualizar ofertas",
        iconToken: "OM",
        allowedRoles: ["company_admin"],
      },
      {
        href: "/company-employees",
        label: "Empleados",
        subtitle: "CRUD de empleados",
        iconToken: "EP",
        allowedRoles: ["company_admin"],
      },
    ],
  },
  {
    title: "Empleado Empresa",
    items: [
      {
        href: "/coupon-redemption",
        label: "Canje de Cupon",
        subtitle: "Validacion por codigo, enlace o QR",
        iconToken: "CJ",
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

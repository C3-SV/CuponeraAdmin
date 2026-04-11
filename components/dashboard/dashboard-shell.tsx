"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { type AppRole, getVisibleSections, type NavIconName } from "@/lib/navigation";

type DashboardShellProps = {
  children: React.ReactNode;
  activeRole: AppRole;
  user: {
    firstName: string;
    lastName: string;
  };
};

type IconProps = {
  className?: string;
};

function MenuIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function CloseIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
    >
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function NavIcon({ name, className }: IconProps & { name: NavIconName }) {
  const iconProps = {
    "aria-hidden": true,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...iconProps}>
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v4A1.5 1.5 0 0 1 9.5 11h-4A1.5 1.5 0 0 1 4 9.5z" />
          <path d="M13 5.5A1.5 1.5 0 0 1 14.5 4h4A1.5 1.5 0 0 1 20 5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 13 9.5z" />
          <path d="M4 14.5A1.5 1.5 0 0 1 5.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5z" />
          <path d="M13 14.5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5z" />
        </svg>
      );
    case "shield":
      return (
        <svg {...iconProps}>
          <path d="M12 3 5.5 5.4v5.2c0 4.1 2.6 7.8 6.5 9.4 3.9-1.6 6.5-5.3 6.5-9.4V5.4z" />
          <path d="M9.5 11.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0" />
          <path d="M8.4 17a4.6 4.6 0 0 1 7.2 0" />
        </svg>
      );
    case "tags":
      return (
        <svg {...iconProps}>
          <path d="m3.8 12.2 8.4 8.4a2 2 0 0 0 2.8 0l5.6-5.6a2 2 0 0 0 0-2.8L12.2 3.8H5.5A1.5 1.5 0 0 0 4 5.3z" />
          <path d="M8 8h.01" />
          <path d="m14 6 6 6" />
        </svg>
      );
    case "building":
      return (
        <svg {...iconProps}>
          <path d="M4 21h16" />
          <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
          <path d="M9 8h1" />
          <path d="M14 8h1" />
          <path d="M9 12h1" />
          <path d="M14 12h1" />
          <path d="M10 21v-5h4v5" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...iconProps}>
          <path d="M10 6V5a2 2 0 0 1 2-2h1.5a2 2 0 0 1 2 2v1" />
          <path d="M4 9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
          <path d="M4 12.5h16" />
          <path d="M12 12.5v2" />
        </svg>
      );
    case "clipboard":
      return (
        <svg {...iconProps}>
          <path d="M9 4h6a2 2 0 0 1 2 2v1H7V6a2 2 0 0 1 2-2Z" />
          <path d="M7 6H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-1" />
          <path d="m9 14 2 2 4-5" />
        </svg>
      );
    case "chart":
      return (
        <svg {...iconProps}>
          <path d="M4 20V4" />
          <path d="M4 20h16" />
          <path d="M8 16v-5" />
          <path d="M12 16V8" />
          <path d="M16 16v-3" />
        </svg>
      );
    case "users":
      return (
        <svg {...iconProps}>
          <path d="M8.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M2.5 20a6 6 0 0 1 12 0" />
          <path d="M16 11a3 3 0 1 0-.4-5.97" />
          <path d="M15.5 14.5A5.5 5.5 0 0 1 21.5 20" />
        </svg>
      );
    case "ticket":
      return (
        <svg {...iconProps}>
          <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" />
          <path d="M9 9h.01" />
          <path d="M15 15h.01" />
          <path d="m15.5 8.5-7 7" />
        </svg>
      );
    case "employees":
      return (
        <svg {...iconProps}>
          <path d="M7.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M2.5 20a5.5 5.5 0 0 1 9.5-3.8" />
          <path d="M16.5 13v6" />
          <path d="M13.5 16h6" />
          <path d="M17 10a3 3 0 1 0-1.8-5.4" />
        </svg>
      );
    case "scan":
      return (
        <svg {...iconProps}>
          <path d="M4 8V6a2 2 0 0 1 2-2h2" />
          <path d="M16 4h2a2 2 0 0 1 2 2v2" />
          <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
          <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
          <path d="M7 12h10" />
          <path d="M9 9h6v6H9z" />
        </svg>
      );
  }
}

function isPathActive(currentPath: string, href: string): boolean {
  if (href === "/dashboard") {
    return currentPath === href;
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function DashboardShell({ children, activeRole, user }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""
    }`.toUpperCase();
  const sections = useMemo(() => {
    return getVisibleSections(activeRole);
  }, [activeRole]);

  return (
    <div className="min-h-screen p-3 sm:p-5">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1500px] rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_10px_26px_-20px_rgba(8,34,66,0.28)] lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside
          className={`fixed inset-y-3 left-3 z-30 flex w-[300px] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_24px_60px_-36px_rgba(15,61,120,0.55)] transition-transform duration-300 ease-out lg:static lg:inset-auto lg:w-auto lg:rounded-none lg:border-0 lg:border-r lg:shadow-none lg:transition-none ${mobileMenuOpen ? "translate-x-0" : "-translate-x-[110%] lg:translate-x-0"
            }`}
        >
          <div className="rounded-2xl bg-linear-to-br from-[var(--brand-blue)] via-[var(--accent-strong)] to-[var(--brand-orange)] p-[1px]">
            <div className="rounded-[15px] bg-white/95 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-3">
                  <Image
                    src="/logo-mundo-cupones.svg"
                    alt="Logo Mundo Cupones"
                    width={40}
                    height={40}
                    className="size-10 rounded-full object-cover"
                    priority
                  />
                  <div>
                    <p className="text-lg font-extrabold tracking-tight text-[var(--brand-blue)]">
                      Mundo Cupones
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex size-10 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--brand-blue)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6ea8ff] lg:hidden"
                  aria-label="Cerrar menu"
                >
                  <CloseIcon className="size-5" />
                </button>
              </div>
            </div>
          </div>

          <nav className="mt-6 flex-1 space-y-6 overflow-y-auto pb-4 pr-1">
            {sections.map((section) => (
              <div key={section.title} className="space-y-2">
                <p className="px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  {section.title}
                </p>
                <ul className="space-y-1.5">
                  {section.items.map((item) => {
                    const active = isPathActive(pathname, item.href);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6ea8ff] ${active
                              ? "bg-[var(--accent)] text-white shadow-[0_12px_26px_-18px_rgba(15,61,120,0.72)]"
                              : "text-[var(--text-primary)] hover:bg-[var(--accent-soft)] hover:text-[var(--brand-blue)]"
                            }`}
                        >
                          <span
                            className={`grid size-9 shrink-0 place-items-center rounded-lg transition ${active
                                ? "bg-white/20 text-white"
                                : "bg-[#eaf1ff] text-[var(--brand-blue)] group-hover:bg-white"
                              }`}
                          >
                            <NavIcon name={item.icon} className="size-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{item.label}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 rounded-3xl bg-[var(--surface-soft)] p-4 sm:p-6 lg:rounded-l-none lg:p-7">
          <header className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.26)]">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex size-11 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--brand-blue)] transition hover:bg-[var(--accent-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6ea8ff] lg:hidden"
                aria-label="Abrir menu"
              >
                <MenuIcon className="size-6" />
              </button>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                  Dashboard Administrativo
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Panel de gestión general para las operaciones de la plataforma
                </p>
              </div>
              <div className="ml-auto flex w-full items-center gap-3 sm:w-auto">
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 hover:bg-[var(--surface-soft)]"
                >
                  <span className="grid size-7 place-items-center rounded-full bg-[var(--brand-orange)] text-xs font-semibold text-white">
                    {initials}
                  </span>
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    Mi perfil
                  </span>
                </Link>
              </div>
            </div>
          </header>

          <main>{children}</main>
        </div>
      </div>

      {mobileMenuOpen ? (
        <button
          type="button"
          aria-label="Cerrar superposicion del menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-20 bg-[#0d2f5f]/25 lg:hidden"
        />
      ) : null}
    </div>
  );
}

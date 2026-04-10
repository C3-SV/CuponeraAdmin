"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { getVisibleSections } from "@/lib/navigation";

type DashboardShellProps = {
  children: React.ReactNode;
};

function isPathActive(currentPath: string, href: string): boolean {
  if (href === "/dashboard") {
    return currentPath === href;
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sections = useMemo(() => {
    // TODO: conectar rol real desde Supabase cuando auth/permisos este listo.
    return getVisibleSections(null);
  }, []);

  return (
    <div className="min-h-screen p-3 sm:p-5">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1500px] rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_10px_26px_-20px_rgba(8,34,66,0.28)] lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside
          className={`fixed inset-y-3 left-3 z-30 w-[300px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-transform duration-300 ease-out lg:static lg:inset-auto lg:w-auto lg:rounded-none lg:border-0 lg:border-r lg:transition-none ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-[110%] lg:translate-x-0"
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
                    <p className="text-sm font-semibold text-[var(--brand-blue)]">
                      Mundo Cupones
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Dashboard Administrativo
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] lg:hidden"
                  aria-label="Cerrar menu"
                >
                  x
                </button>
              </div>
            </div>
          </div>

          <nav className="mt-6 space-y-6 overflow-y-auto pb-4">
            {sections.map((section) => (
              <div key={section.title} className="space-y-2">
                <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  {section.title}
                </p>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const active = isPathActive(pathname, item.href);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                            active
                              ? "bg-linear-to-r from-[var(--accent)] to-[var(--brand-blue)] text-white shadow-[0_8px_18px_-14px_rgba(15,61,120,0.45)]"
                              : "text-[var(--text-primary)] hover:bg-[var(--accent-soft)]"
                          }`}
                        >
                          <span
                            className={`grid size-8 place-items-center rounded-lg text-[11px] font-semibold ${
                              active
                                ? "bg-white/20 text-white"
                                : "bg-[#eaf1ff] text-[var(--brand-blue)] group-hover:bg-white"
                            }`}
                          >
                            {item.iconToken}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {item.label}
                            </span>
                            <span
                              className={`block truncate text-xs ${
                                active
                                  ? "text-white/80"
                                  : "text-[var(--text-muted)] group-hover:text-[var(--brand-blue)]"
                              }`}
                            >
                              {item.subtitle}
                            </span>
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
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-muted)] lg:hidden"
                aria-label="Abrir menu"
              >
                Menu
              </button>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                  Espacio de Trabajo Administrativo
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Base compartida para todos los modulos del equipo
                </p>
              </div>
              <div className="ml-auto flex w-full items-center gap-3 sm:w-auto">
                <input
                  type="text"
                  value=""
                  readOnly
                  placeholder="Buscar modulo..."
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm text-[var(--text-muted)] outline-none sm:w-[280px]"
                />
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 hover:bg-[var(--surface-soft)]"
                >
                  <span className="grid size-7 place-items-center rounded-full bg-[var(--brand-orange)] text-xs font-semibold text-white">
                    AD
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

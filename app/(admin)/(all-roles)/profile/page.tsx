import Link from "next/link";
import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";

export default function ProfilePage() {
  return (
    <ModulePlaceholder
      title="Perfil"
      description="Base de la vista de perfil. Los datos reales quedaran conectados a Supabase en la siguiente fase."
      ownerHint="Responsable: Persona 1"
    >
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
        <p className="text-sm text-[var(--text-muted)]">
          Desde aqui se accede al flujo de cambio de contrasena.
        </p>
        <Link
          href="/change-password"
          className="mt-3 inline-flex rounded-xl bg-[var(--brand-blue)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-strong)]"
        >
          Ir a cambiar contrasena
        </Link>
      </div>
    </ModulePlaceholder>
  );
}

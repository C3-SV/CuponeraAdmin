// app/(admin)/(all-roles)/profile/page.tsx
import { requireAdminProfile } from "@/lib/auth";
import { logoutAction } from "@/app/auth/logout/actions";
import { formatUserRole } from "@/lib/roles";

export default async function ProfilePage() {
  const profile = await requireAdminProfile();

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Mi perfil</h1>

      <div className="rounded-xl border p-4 space-y-2">
        <p><strong>Nombres:</strong> {profile.first_names}</p>
        <p><strong>Apellidos:</strong> {profile.last_names}</p>
        <p><strong>Correo:</strong> {profile.email}</p>
        <p><strong>Rol:</strong> {formatUserRole(profile.user_role)}</p>
        <p><strong>Activo:</strong> {profile.user_is_active ? "Sí" : "No"}</p>
        <p><strong>Empresa:</strong> {profile.company_id ?? "No aplica"}</p>
      </div>

      <form action={logoutAction}>
        <button
          type="submit"
          className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Cerrar sesión
        </button>
      </form>
    </section>
  );
}

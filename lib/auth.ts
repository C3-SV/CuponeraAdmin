import { redirect } from "next/navigation";
import type { DbUserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type AppRole = DbUserRole;

export type AuthProfile = {
  user_id: string;
  email: string;
  first_names: string;
  last_names: string;
  full_name: string;
  user_role: AppRole;
  user_is_active: boolean;
  company_id: string | null;
};

export async function getCurrentAuthProfile(): Promise<AuthProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "user_id, first_names, last_names, user_role, user_is_active, company_id"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error("No se pudo cargar el perfil");
  }

  if (!profile) return null;

  return {
    user_id: profile.user_id,
    email: user.email ?? "",
    first_names: profile.first_names,
    last_names: profile.last_names,
    full_name: `${profile.first_names} ${profile.last_names}`.trim(),
    user_role: profile.user_role,
    user_is_active: profile.user_is_active,
    company_id: profile.company_id,
  };
}

export async function requireAdminProfile() {
  const profile = await getCurrentAuthProfile();

  if (!profile) {
    redirect("/auth/login");
  }

  if (!profile.user_is_active) {
    redirect("/auth/login?error=inactive");
  }

  if (
    profile.user_role !== "ADMIN_PLATFORM" &&
    profile.user_role !== "ADMIN_COMPANY"
  ) {
    redirect("/auth/login?error=unauthorized");
  }

  return profile;
}

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type LoginState = {
    error: string;
};

export async function loginAction(
    _prevState: LoginState,
    formData: FormData
): Promise<LoginState> {
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!email || !password) {
        return { error: "Correo y contraseña son requeridos" };
    }

    const supabase = await createClient();

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (loginError || !data.user) {
        console.error("LOGIN ERROR:", loginError);
        return { error: "Credenciales inválidas" };
    }

    const user = data.user;

    console.log("AUTH USER ID:", user.id);
    console.log("AUTH USER EMAIL:", user.email);

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, first_names, last_names, user_role, user_is_active, company_id")
        .eq("user_id", user.id)
        .maybeSingle();

    console.log("PROFILE ERROR:", profileError);
    console.log("PROFILE FOUND:", profile);

    if (profileError) {
        return { error: "Error al buscar el perfil" };
    }

    if (!profile) {
        await supabase.auth.signOut();
        return { error: "No hay perfil asociado a este usuario" };
    }

    if (!profile.user_is_active) {
        await supabase.auth.signOut();
        return { error: "Tu usuario está inactivo" };
    }

    if (
        profile.user_role !== "ADMIN_PLATFORM" &&
        profile.user_role !== "ADMIN_COMPANY" &&
        profile.user_role !== "EMPLOYEE"
    ) {
        await supabase.auth.signOut();
        return { error: "No tienes acceso al panel administrativo" };
    }

    if (profile.user_role === "ADMIN_PLATFORM") {
        redirect("/dashboard");
    }

    if (profile.user_role === "ADMIN_COMPANY") {
        redirect("/company-offers");
    }

    if (profile.user_role === "EMPLOYEE") {
        redirect("/coupon-redemption");
    }

    redirect("/profile");
}

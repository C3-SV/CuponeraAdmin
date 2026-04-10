import { createClient } from "@supabase/supabase-js";

// MANEJO TEMPORAL DEL CLIENTE DE SUPABASE, EN LO QUE SE IMPLEMENTA AUTENTICACION 

// Centraliza lectura/validación de variables para cliente Supabase de servidor.
function getSupabaseConfig() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!url || !key) {
    throw new Error(
      "Faltan variables de entorno."
    );
  }

  return { url, key };
}

// Crea cliente Supabase para Server Actions sin persistencia de sesión local.
export function createSupabaseServerClient() {
  const { url, key } = getSupabaseConfig();

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

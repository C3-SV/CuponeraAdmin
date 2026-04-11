// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PRIVATE_PREFIXES = [
  "/dashboard",
  "/profile",
  "/change-password",
  "/platform-admins",
  "/categories",
  "/companies",
  "/company-admin-assignment",
  "/offers-review",
  "/approved-offers-stats",
  "/customers",
  "/customer-coupons",
  "/company-offers",
  "/company-employees",
  "/coupon-redemption",
];

function isPrivateRoute(pathname: string) {
  return PRIVATE_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const { pathname } = request.nextUrl;
    const privateRoute = isPrivateRoute(pathname);

    if (privateRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("error", "missing_supabase_config");
      return NextResponse.redirect(url);
    }

    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const privateRoute = isPrivateRoute(pathname);

  // Si no hay sesión y quiere entrar a una ruta privada
  if (!user && privateRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Si ya inició sesión y trata de volver al login
  if (user && pathname === "/auth/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
      Ejecuta el middleware en todo excepto:
      - archivos estáticos de Next
      - imágenes
      - favicon
      - extensiones comunes de archivos
    */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  // If a Supabase magic-link redirect lands on the root (because the
  // /auth/callback URL wasn't in the Supabase Redirect URLs allowlist and
  // Supabase fell back to Site URL), forward the code to the real handler.
  if (req.nextUrl.pathname === "/" && req.nextUrl.searchParams.has("code")) {
    const target = new URL("/auth/callback", req.url);
    target.search = req.nextUrl.search;
    return NextResponse.redirect(target);
  }

  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string; options: CookieOptions }) =>
            req.cookies.set(name, value),
          );
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session on every request so cookie expiry stays current.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Run on everything except static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
